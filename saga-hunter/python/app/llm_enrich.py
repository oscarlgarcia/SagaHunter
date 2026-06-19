"""On-demand LLM enrichment for a given enrichment_id.

Called via subprocess from the Next.js API endpoint.
Loads the seed text + existing heuristic enrichment, builds a prompt
specific to the agent type, calls Ollama, and saves the result.
"""

import json
import logging
import sys

from app.database import execute
from app.llm_client import llm

logger = logging.getLogger("llm_enrich")

PROMPTS: dict[str, str] = {
    "angle_finder": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a narrative analysis assistant. Analyze the following news text and extract narrative elements.\n"
        "Schema:\n"
        '{{\n'
        '  "protagonists": ["name1", "name2"],\n'
        '  "conflict_type": "internal" or "external",\n'
        '  "settings": ["setting1"],\n'
        '  "theme_scores": {{"conflict": 0-10, "mystery": 0-10, "arc": 0-10}},\n'
        '  "summary": "One sentence summary"\n'
        "}}\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "genre_classifier": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a literary genre classifier. Analyze the following text and classify its genres.\n"
        "Schema:\n"
        '{{\n'
        '  "genre_scores": {{"genre_name": {{"score": 0-100, "matches": number of textual signals found}}}},  // list up to 5 genres\n'
        '  "primary_genre": "most likely genre",\n'
        '  "secondary_genre": "second most likely genre or null"\n'
        "}}\n\n"
        "Possible genres: sci-fi, fantasy, drama, thriller, romance, horror, mystery, comedy, adventure, tragedy, historical, dystopian, mythology, crime, western, satire.\n"
        "Ensure 'matches' reflects an approximate count of textual signals or keywords found for each genre.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "story_structurer": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a story structure analyst. Analyze the following text and identify narrative structure.\n"
        "Schema:\n"
        '{{\n'
        '  "three_act_scores": {{\n'
        '    "act1": {{"label": "Setup", "detected": true, "matches": 5}},\n'
        '    "act2": {{"label": "Confrontation", "detected": true, "matches": 3}},\n'
        '    "act3": {{"label": "Resolution", "detected": false, "matches": 0}}\n'
        '  }},\n'
        '  "structure_name": "Three-Act Structure" or other\n'
        "}}\n\n"
        "For each act, set 'matches' to an estimate of how many textual signals support detection.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "character_harvester": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a character extraction assistant. Extract all characters mentioned in the text.\n"
        "Schema:\n"
        '{{\n'
        '  "characters": [{{\n'
        '    "name": "Character Name",\n'
        '    "role": "protagonist/antagonist/supporting/mentioned",\n'
        '    "traits": ["trait1", "trait2"],\n'
        '    "motivations": ["motivation1"],\n'
        '    "context": "quote or context from text",\n'
        '    "is_protagonist": false,\n'
        '    "mentions": 3\n'
        '  }}]\n'
        "}}\n\n"
        "Count actual name/pronoun references in the text below for the 'mentions' field.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "what_if_generator": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a creative writing assistant. Generate exactly 5 creative 'what if' variations based on the text.\n"
        "Schema:\n"
        '{{\n'
        '  "original_genre": "detected genre",\n'
        '  "original_protagonist": "the main person, entity, concept, or location from the original text",\n'
        '  "variations": [{{\n'
        '    "id": 1,\n'
        '    "question": "What if ...?",\n'
        '    "description": "elaboration of the idea",\n'
        '    "impact": "major" or "moderate" or "minor"\n'
        '  }}]\n'
        "}}\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "world_builder": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a world-building assistant. Analyze the setting and world details in the text.\n"
        "Schema:\n"
        '{{\n'
        '  "setting": {{\n'
        '    "label": "setting name",\n'
        '    "confidence": 0-100,\n'
        '    "description": "brief description",\n'
        '    "tech_level": "high_tech" or "low_tech" or "medieval" or "modern" or "none"\n'
        '  }},\n'
        '  "geography": [{{"name": "place name"}}],\n'
        '  "atmosphere": [{{"label": "mood or atmosphere"}}],\n'
        '  "magic": {{"power_level": "high"/"low"/"none", "systems": [{{"label": "system name"}}]}},\n'
        '  "factions": [{{"name": "faction name"}}],\n'
        '  "world_rules": ["rule or law of this world"]\n'
        "}}\n\n"
        "If the text doesn't specify a field (e.g. magic, factions), set it to a sensible default like 'none' or an empty array.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "voice_tuner": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a narrative voice analyst. Analyze the writing style and narrative voice of the text.\n"
        "Schema:\n"
        '{{\n'
        '  "narrative_voice": {{\n'
        '    "pov": {{"label": "first-person"/"second-person"/"third-person"/"omniscient", "confidence": 0-100, "description": "..."}},\n'
        '    "tense": {{"label": "past"/"present"/"future", "confidence": 0-100}},\n'
        '    "primary_register": "formal/informal/neutral/poetic/technical"\n'
        '  }},\n'
        '  "pacing": {{"label": "fast"/"moderate"/"slow", "description": "..."}},\n'
        '  "mood": [{{"label": "mood word"}}],\n'
        '  "readability": {{"level": "easy"/"moderate"/"complex", "avg_sentence_length": 15, "long_word_ratio": 20}},\n'
        '  "style_examples": {{\n'
        '    "original_style": {{"sample": "representative sentence from text"}},\n'
        '    "alternatives": [{{"style": "alternative style name", "example": "rewritten example", "note": "tip"}}]\n'
        '  }}\n'
        "}}\n\n"
        "Calculate avg_sentence_length and long_word_ratio from the actual text provided below.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "blurb_generator": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a blurb writer. Write 3 engaging blurb variants for a story based on the text.\n"
        "Schema:\n"
        '{{\n'
        '  "genre": "detected genre",\n'
        '  "best_for": "hook" or "mystery" or "epic" or "character" or "atmospheric",\n'
        '  "variants": [{{\n'
        '    "label": "Hook"/"Mystery"/"Epic"/"Character"/"Atmospheric",\n'
        '    "blurb": "blurb text...",\n'
        '    "word_count": 50,\n'
        '    "length": "short"/"medium"/"long"\n'
        '  }}]\n'
        "}}\n\n"
        "Ensure word_count is a realistic count close to the actual blurb length.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "plot_hole_detector": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a plot hole detector. Analyze the text for narrative inconsistencies and plot holes.\n"
        "Schema:\n"
        '{{\n'
        '  "grade": "A"/"B"/"C"/"D"/"F",\n'
        '  "consistency_score": 0-100,\n'
        '  "total_issues": 0,\n'
        '  "by_severity": {{"critical": 0, "major": 0, "minor": 0}},\n'
        '  "issues": [{{\n'
        '    "label": "short label",\n'
        '    "severity": "critical"/"major"/"minor",\n'
        '    "description": "explanation of the issue",\n'
        '    "suggestion": "how to fix it"\n'
        '  }}],\n'
        '  "agents_analyzed": 5\n'
        "}}\n\n"
        "Set 'agents_analyzed' to a reasonable number (3-8) based on how many analytical angles you considered.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
    "series_connector": (
        "Respond with ONLY valid JSON (no markdown, no code fences, no explanation). "
        "```json is NOT valid JSON — respond with raw JSON only. "
        "You are a connection finder for story seeds. Based on the given text, suggest potential hypothetical connections this seed COULD form with other stories in a shared narrative universe.\n"
        "Schema:\n"
        '{{\n'
        '  "total_connections": 2,\n'
        '  "connections": [{{\n'
        '    "seed_title": "Hypothetical: Suggested story type",\n'
        '    "connection_label": "shared_universe" or "thematic_saga" or "character_overlap",\n'
        '    "connection_type": "shared_universe" or "thematic_saga" or "character_overlap",\n'
        '    "connection_description": "explanation of how they would connect",\n'
        '    "score": 75,\n'
        '    "matches": [["shared_setting", ["place1"]], ["overlap", ["detail1"]]]\n'
        '  }}]\n'
        "}}\n\n"
        "Generate 2-4 plausible hypothetical connections. "
        "Prefix seed_title with 'Hypothetical: ' to indicate these are suggested connection types, not existing seeds.\n\n"
        "Language of text: {language}\n\n"
        "Text: {text}"
    ),
}


def run_llm_enrichment(enrichment_id: str):
    row = execute(
        """SELECT e.seed_id, e.agent_name, e.data, s.raw_text, s.title, s.language
           FROM enrichments e
           JOIN seeds s ON s.id = e.seed_id
           WHERE e.id = %s""",
        (enrichment_id,),
        fetch=True,
    )
    if not row:
        logger.error("Enrichment not found: %s", enrichment_id)
        return

    seed_id, agent_name, heuristic_data, raw_text, title, language = row[0]

    prompt_template = PROMPTS.get(agent_name)
    if not prompt_template:
        logger.error("No prompt defined for agent: %s", agent_name)
        return

    custom_row = execute(
        "SELECT llm_prompt FROM agent_configs WHERE agent_name = %s AND llm_prompt IS NOT NULL",
        (agent_name,),
        fetch=True,
    )
    if custom_row and custom_row[0][0]:
        prompt_template = custom_row[0][0]
        logger.info("Using custom prompt for %s", agent_name)

    text = f"Title: {title}\n\n{raw_text}"
    if len(text) > 12000:
        text = text[:12000] + "\n\n[truncated...]"

    prompt = prompt_template.format(text=text, language=language or "unknown")

    logger.info("Generating LLM enrichment for %s on seed %s", agent_name, seed_id)

    if not llm.is_available():
        logger.error("Ollama is not available at %s", llm.base_url)
        return

    try:
        response = llm.generate(prompt, temperature=0.3)
    except Exception as e:
        logger.error("LLM generate failed: %s", e)
        raise

    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()
        llm_data = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("Failed to parse LLM response as JSON: %s\nRaw: %s", e, response[:500])
        return

    if not isinstance(llm_data, dict):
        logger.error("LLM response is not a dict: %s", type(llm_data))
        return

    execute(
        "UPDATE enrichments SET llm_data = %s::jsonb, llm_generated_at = NOW() WHERE id = %s",
        (json.dumps(llm_data), enrichment_id),
    )

    logger.info("LLM enrichment saved for %s on seed %s (%d keys)", agent_name, seed_id, len(llm_data))


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    if len(sys.argv) < 2:
        print("Usage: python -m app.llm_enrich <enrichment_id>")
        sys.exit(1)
    run_llm_enrichment(sys.argv[1])
