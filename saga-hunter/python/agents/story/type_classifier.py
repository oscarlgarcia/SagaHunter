import re
from typing import Optional
from app.database import execute
from agents.story.base import BaseStoryAgent


STORY_TYPES = [
    {"type": "flash_fiction", "label": "Flash Fiction", "max_words": 1000, "min_chapters": 1, "max_chapters": 1, "desc": "A very short story under 1,000 words, often with a twist."},
    {"type": "micro_tale", "label": "Micro Tale", "max_words": 300, "min_chapters": 1, "max_chapters": 1, "desc": "An extremely brief story, often 100-300 words."},
    {"type": "short_story", "label": "Short Story", "max_words": 7500, "min_chapters": 1, "max_chapters": 1, "desc": "A self-contained story under 7,500 words."},
    {"type": "tale", "label": "Tale", "max_words": 15000, "min_chapters": 1, "max_chapters": 3, "desc": "A longer short story or novelette, up to 15,000 words."},
    {"type": "novella", "label": "Novella", "max_words": 40000, "min_chapters": 5, "max_chapters": 12, "desc": "A short novel between 17,500 and 40,000 words."},
    {"type": "novel", "label": "Novel", "max_words": 100000, "min_chapters": 10, "max_chapters": 30, "desc": "A standard novel between 40,000 and 100,000 words."},
    {"type": "saga", "label": "Saga", "max_words": 200000, "min_chapters": 20, "max_chapters": 60, "desc": "An epic multi-volume story exceeding 100,000 words."},
]

STRUCTURE_TYPES = [
    "three_act", "hero_journey", "seven_point", "kishotenketsu",
    "episodic", "nonlinear", "frame_story", "in_media_res",
]


class StoryTypeClassifier(BaseStoryAgent):
    name = "story_type_classifier"
    description = "Classifies the story type, chapter count, and narrative structure"

    def develop(self, story_id: str) -> bool:
        row = execute(
            """SELECT s.title, s.premise, st.raw_text, st.language, st.narrative_score
               FROM stories s LEFT JOIN seeds st ON st.id = s.seed_id
               WHERE s.id = %s""",
            (story_id,), fetch=True,
        )
        if not row:
            self.logger.error("Story %s not found", story_id)
            return False

        title, premise, raw_text, language, score = row[0]
        text = premise or raw_text or title
        word_count = len(text.split()) * 1.5 if premise else (len((raw_text or "").split()) if raw_text else 100)
        self._publish_progress(story_id, f"Analyzing text ({int(word_count)} words estimated)...")

        type_info = self._classify_type(word_count, text, language)
        structure = self._detect_structure(text)

        llm_result = self._try_llm(self._build_prompt(title, text, language, type_info, structure), story_id)
        if llm_result:
            if llm_result.get("type") and any(t["type"] == llm_result["type"] for t in STORY_TYPES):
                type_info["type"] = llm_result["type"]
                type_info["label"] = next(t["label"] for t in STORY_TYPES if t["type"] == llm_result["type"])
            if llm_result.get("target_chapters"):
                type_info["target_chapters"] = llm_result["target_chapters"]
            if llm_result.get("target_word_count"):
                type_info["target_word_count"] = llm_result["target_word_count"]
            if llm_result.get("narrative_structure"):
                structure = llm_result["narrative_structure"]
            self._publish_progress(story_id, "LLM refined classification")

        self._update_story(
            story_id,
            type=type_info["type"],
            target_chapters=type_info["target_chapters"],
            target_word_count=type_info["target_word_count"],
            narrative_structure=structure,
        )

        self._publish_progress(story_id, f"Type: {type_info['label']} — {type_info['target_chapters']} chapters, {structure}")
        return True

    def _build_prompt(self, title: str, text: str, language: str,
                      current_type: dict, current_structure: str) -> str:
        return (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a narrative analyst. Classify the following story.\n"
            f"Title: {title}\n"
            f"Language: {language}\n"
            f"Text: {text[:3000]}\n\n"
            "Possible types: flash_fiction, micro_tale, short_story, tale, novella, novel, saga\n"
            "Possible structures: three_act, hero_journey, seven_point, kishotenketsu, episodic, nonlinear, frame_story, in_media_res\n\n"
            "Return JSON with:\n"
            '- "type": one of the types above\n'
            '- "target_chapters": integer\n'
            '- "target_word_count": integer\n'
            '- "narrative_structure": one of the structures above\n'
            f'Current heuristic estimate: type={current_type["type"]}, chapters={current_type["target_chapters"]}, words={current_type["target_word_count"]}, structure={current_structure}'
        )

    def _classify_type(self, word_count: int, text: str, language: str) -> dict:
        raw_wc = len(text.split()) if text else 0

        type_scores = []
        for t in STORY_TYPES:
            if t["max_words"] >= raw_wc * 1.5:
                score = 1.0
            elif t["max_words"] >= raw_wc:
                score = 0.7
            else:
                score = max(0, 1.0 - (raw_wc - t["max_words"]) / t["max_words"])
            type_scores.append((t, score))

        best = max(type_scores, key=lambda x: x[1])[0] if type_scores else STORY_TYPES[2]

        if word_count < 500:
            best = STORY_TYPES[0]  # flash_fiction
        elif word_count < 1000:
            best = STORY_TYPES[2]  # short_story

        target_chars = max(best["min_chapters"], min(best["max_chapters"], raw_wc // 1000 + 1))
        return {
            "type": best["type"],
            "label": best["label"],
            "target_chapters": target_chars,
            "target_word_count": min(best["max_words"], raw_wc * 2),
        }

    def _detect_structure(self, text: str) -> str:
        text_lower = text.lower() if text else ""

        three_act = sum(1 for kw in ["once upon a time", "one day", "suddenly", "finally", "in the end", "but"] if kw in text_lower)
        hero_journey = sum(1 for kw in ["ordinary", "call", "journey", "ally", "enemy", "return", "change"] if kw in text_lower)
        seven_point = sum(1 for kw in ["hook", "plot turn", "pinch", "midpoint", "crisis", "climax", "resolution"] if kw in text_lower)

        if seven_point >= 3:
            return "seven_point"
        if hero_journey >= 3:
            return "hero_journey"
        if three_act >= 3:
            return "three_act"
        return "three_act"
