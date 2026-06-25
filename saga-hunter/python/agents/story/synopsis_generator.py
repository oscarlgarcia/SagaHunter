import random
import re
from typing import Optional
from app.database import execute
from agents.story.base import BaseStoryAgent


SYNOPSIS_TEMPLATES = [
    "When {protagonist} {inciting_incident}, they must {goal} before {stake}.",
    "In a world where {setting}, {protagonist} discovers {discovery} and must {goal} or {stake}.",
    "{protagonist} thought they knew {theme}, until {inciting_incident} forced them to {goal} — but {stake} stands in the way.",
    "After {inciting_incident}, {protagonist} embarks on a journey to {goal}. Along the way, {conflict} tests everything they believe.",
    "A {protagonist_archetype} named {protagonist} is thrown into {setting} when {inciting_incident}. To {goal}, they must face {conflict} and overcome {stake}.",
]


class SynopsisGenerator(BaseStoryAgent):
    name = "synopsis_generator"
    description = "Generates a synopsis for the story"

    def develop(self, story_id: str) -> bool:
        row = execute(
            """SELECT s.title, s.premise, s.type, st.raw_text, st.language,
                      e.data AS enrich_data
               FROM stories s
               LEFT JOIN seeds st ON st.id = s.seed_id
               LEFT JOIN enrichments e ON e.seed_id = st.id AND e.agent_name = 'angle_finder'
               WHERE s.id = %s""",
            (story_id,), fetch=True,
        )
        if not row:
            self.logger.error("Story %s not found", story_id)
            return False

        title, premise, story_type, raw_text, language, enrich_data = row[0]
        text = premise or raw_text or title
        self._publish_progress(story_id, "Crafting synopsis...")

        enrich = enrich_data if enrich_data and isinstance(enrich_data, dict) else {}

        synopsis = self._generate_synopsis(title, text, story_type, enrich, language)

        llm_result = self._try_llm(self._build_prompt(title, text, story_type, language, enrich, synopsis), story_id)
        if llm_result and llm_result.get("synopsis"):
            synopsis = llm_result["synopsis"]
            self._publish_progress(story_id, "LLM refined synopsis")

        self._update_story(story_id, synopsis=synopsis)
        self._publish_progress(story_id, "Synopsis ready")
        return True

    def _build_prompt(self, title: str, text: str, story_type: str, language: str,
                      enrich: dict, heuristic_synopsis: str) -> str:
        return (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a creative writer. Write a compelling story synopsis.\n"
            f"Title: {title}\n"
            f"Type: {story_type}\n"
            f"Language: {language}\n"
            f"Protagonists: {enrich.get('protagonists', [])}\n"
            f"Setting: {enrich.get('settings', [])}\n"
            f"Conflict: {enrich.get('conflict_type', 'unknown')}\n"
            f"Summary hint: {enrich.get('summary', '')}\n"
            f"Text: {text[:2000]}\n\n"
            f"Heuristic version: {heuristic_synopsis[:300]}\n\n"
            'Return JSON with key "synopsis": a 2-4 paragraph narrative synopsis that hooks the reader.'
        )

    def _generate_synopsis(self, title: str, text: str, story_type: str,
                           enrich: dict, language: str) -> str:
        protagonists = enrich.get("protagonists", [])
        settings = enrich.get("settings", [])
        summary = enrich.get("summary", "")

        protagonist = protagonists[0] if protagonists else self._extract_name(text)
        setting = settings[0] if settings else "an unfamiliar world"
        conflict = enrich.get("conflict_type", "external")

        words = text.split() if text else []
        inciting = self._pick_phrase(words, ["a mysterious discovery", "an unexpected event", "a fateful encounter",
                                              "a shocking revelation", "a dangerous proposition"])
        goal = self._pick_phrase(words, ["uncover the truth", "survive the journey", "protect what matters",
                                          "find their way home", "defeat the darkness", "solve the mystery"])
        stake = self._pick_phrase(words, ["lose everything", "face certain doom", "risk it all",
                                           "sacrifice their soul", "watch the world fall"])
        discovery = self._pick_phrase(words, ["a hidden power", "an ancient secret", "a terrible truth",
                                               "a forgotten past", "a new world"])
        archetype = self._pick_phrase(words, ["reluctant hero", "unlikely champion", "ordinary person",
                                               "broken warrior", "curious dreamer"])

        template = random.choice(SYNOPSIS_TEMPLATES)
        synopsis = template.format(
            protagonist=protagonist,
            inciting_incident=inciting,
            goal=goal,
            stake=stake,
            setting=setting,
            discovery=discovery,
            theme=conflict,
            conflict=conflict,
            protagonist_archetype=archetype,
        )

        parts = [synopsis]

        if story_type and story_type not in ("flash_fiction", "micro_tale"):
            type_labels = {
                "short_story": "short story", "tale": "tale", "novella": "novella",
                "novel": "novel", "saga": "multi-part saga",
            }
            type_label = type_labels.get(story_type, story_type)
            parts.append(f"This {type_label} explores themes of {conflict}, following {protagonist} as they navigate a world of {setting}.")

        if summary:
            parts.append(summary[:300])

        return "\n\n".join(parts)

    def _extract_name(self, text: str) -> str:
        names = re.findall(r'\b[A-Z][a-z]{2,}\b', text[:1000]) if text else []
        return names[0] if names else "the protagonist"

    def _pick_phrase(self, words: list, options: list) -> str:
        return options[hash(str(words[:5])) % len(options)] if words else random.choice(options)
