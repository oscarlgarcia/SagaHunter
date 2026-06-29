import logging
import uuid
import json
from typing import Optional
from app.database import execute
from app.redis_client import publish_event
from app.orchestrator import AGENT_REGISTRY, _run_single_agent
from app.llm_client import llm

from agents.story.type_classifier import StoryTypeClassifier
from agents.story.synopsis_generator import SynopsisGenerator
from agents.story.chapter_outliner import ChapterOutliner
from agents.story.character_deepener import CharacterDeepener
from agents.story.location_builder import LocationBuilder

logger = logging.getLogger("story_orchestrator")

STORY_STEPS = [
    StoryTypeClassifier,
    SynopsisGenerator,
    ChapterOutliner,
    CharacterDeepener,
    LocationBuilder,
]

PREREQUISITE_AGENTS = {"genre_classifier", "story_structurer", "voice_tuner"}


def ensure_prerequisites(seed_id: str):
    if not seed_id:
        return
    for agent_name in PREREQUISITE_AGENTS:
        row = execute(
            "SELECT 1 FROM enrichments WHERE seed_id = %s AND agent_name = %s LIMIT 1",
            (seed_id, agent_name), fetch=True,
        )
        if not row:
            agent_class = AGENT_REGISTRY.get(agent_name)
            if agent_class:
                logger.info("Running prerequisite agent: %s", agent_name)
                _run_single_agent(agent_class())


def create_story(seed_id: Optional[str] = None, title: str = "",
                 premise: Optional[str] = None) -> Optional[str]:
    story_id = str(uuid.uuid4())

    if seed_id:
        row = execute(
            "SELECT title FROM seeds WHERE id = %s", (seed_id,), fetch=True,
        )
        if not row:
            logger.error("Seed %s not found", seed_id)
            return None
        title = title or row[0][0]

        existing = execute(
            "SELECT id FROM stories WHERE seed_id = %s", (seed_id,), fetch=True,
        )
        if existing:
            story_id = existing[0][0]
            logger.info("Reusing existing story %s for seed %s", story_id, seed_id)
        else:
            execute(
                """INSERT INTO stories (id, seed_id, title, premise, status)
                   VALUES (%s, %s, %s, %s, 'outline')""",
                (story_id, seed_id, title, premise),
            )
            logger.info("Created story %s from seed %s", story_id, seed_id)
    else:
        execute(
            """INSERT INTO stories (id, title, premise, status)
               VALUES (%s, %s, %s, 'outline')""",
            (story_id, title, premise),
        )
        logger.info("Created story %s from scratch", story_id)

    publish_event("story:progress", f"{story_id}|_orchestrator|Story created, running prerequisites...")

    if seed_id:
        ensure_prerequisites(seed_id)

    publish_event("story:progress", f"{story_id}|_orchestrator|Classifying story type...")
    classifier = StoryTypeClassifier()
    try:
        success = classifier.develop(story_id)
        publish_event("story:progress", f"{story_id}|story_type_classifier|{'completed' if success else 'failed'}")
    except Exception as e:
        logger.exception("Type classifier failed: %s", e)
        publish_event("story:progress", f"{story_id}|story_type_classifier|error: {e}")

    publish_event("story:complete", f"{story_id}|1")
    logger.info("Story created: %s (%s)", story_id, title)
    return story_id


def develop_story(seed_id: Optional[str] = None, title: str = "",
                  premise: Optional[str] = None) -> Optional[str]:
    story_id = create_story(seed_id, title, premise)
    if not story_id:
        return None
    run_full_pipeline(story_id)
    return story_id


def run_full_pipeline(story_id: str) -> bool:
    row = execute(
        "SELECT seed_id FROM stories WHERE id = %s", (story_id,), fetch=True,
    )
    if not row:
        logger.error("Story %s not found", story_id)
        return False

    seed_id = row[0][0]
    if seed_id:
        ensure_prerequisites(seed_id)

    total = len(STORY_STEPS)
    for idx, step_class in enumerate(STORY_STEPS):
        step = step_class()
        step_name = step.name
        publish_event("story:progress", f"{story_id}|_orchestrator|Step {idx+1}/{total}: {step_name}")
        logger.info("Running story step %d/%d: %s", idx + 1, total, step_name)
        try:
            success = step.develop(story_id)
            publish_event("story:progress", f"{story_id}|{step_name}|{'completed' if success else 'failed'}")
        except Exception as e:
            logger.exception("Story step %s failed: %s", step_name, e)
            publish_event("story:progress", f"{story_id}|{step_name}|error: {e}")

    execute("UPDATE stories SET status = 'outline' WHERE id = %s", (story_id,))
    publish_event("story:complete", f"{story_id}|{total}")
    logger.info("Full pipeline complete: %s", story_id)
    return True


def run_story_step(story_id: str, step_name: str) -> bool:
    step_map = {s.name: s for s in STORY_STEPS}
    step_class = step_map.get(step_name)
    if not step_class:
        logger.error("Unknown story step: %s", step_name)
        return False

    step = step_class()
    try:
        success = step.develop(story_id)
        publish_event("story:progress", f"{story_id}|{step_name}|{'completed' if success else 'failed'}")
        return success
    except Exception as e:
        logger.exception("Story step %s failed: %s", step_name, e)
        publish_event("story:progress", f"{story_id}|{step_name}|error: {e}")
        return False


def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start : end + 1]
    return text


def refine_chapter(story_id: str, chapter_id: str, mode: str) -> bool:
    row = execute(
        """SELECT s.title, s.synopsis, s.type, s.narrative_structure,
                  c.chapter_number, c.title, c.synopsis, c.scenes, c.content
           FROM stories s
           JOIN story_chapters c ON c.story_id = s.id
           WHERE s.id = %s AND c.id = %s""",
        (story_id, chapter_id), fetch=True,
    )
    if not row:
        logger.error("Story %s or chapter %s not found", story_id, chapter_id)
        return False

    (story_title, story_synopsis, story_type, structure,
     ch_num, ch_title, ch_synopsis, ch_scenes, ch_content) = row[0]

    if mode == "synopsis":
        prompt = (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a creative writer. Rewrite this chapter's synopsis to be more compelling.\n"
            f"Story: {story_title}\n"
            f"Story type: {story_type}\n"
            f"Story synopsis: {story_synopsis[:500] if story_synopsis else 'N/A'}\n"
            f"Chapter {ch_num}: {ch_title}\n"
            f"Current synopsis: {ch_synopsis or 'N/A'}\n\n"
            'Return JSON with key "synopsis": a 2-3 sentence chapter synopsis.'
        )
    elif mode == "scenes":
        scenes_str = json.dumps(ch_scenes) if ch_scenes else "None"
        prompt = (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a story outliner. Create a scene-by-scene breakdown for this chapter.\n"
            f"Story: {story_title}\n"
            f"Chapter {ch_num}: {ch_title}\n"
            f"Chapter synopsis: {ch_synopsis or 'N/A'}\n"
            f"Current scenes: {scenes_str}\n\n"
            'Return JSON with key "scenes": an array of {"scene": int, "description": str, "characters": [str], "setting": str}. Generate 3-6 scenes.'
        )
    else:
        logger.error("Unknown mode: %s", mode)
        return False

    if not llm.is_available():
        logger.warning("LLM not available")
        return False

    try:
        raw = llm.generate(prompt, temperature=0.3)
        cleaned = _clean_json(raw)
        data = json.loads(cleaned)
    except Exception as e:
        logger.warning("LLM refine_chapter failed: %s", e)
        return False

    if mode == "synopsis":
        syn = data.get("synopsis")
        if syn:
            execute("UPDATE story_chapters SET synopsis = %s WHERE id = %s", (syn, chapter_id))
            logger.info("Refined synopsis for chapter %s", chapter_id)
            return True
    elif mode == "scenes":
        scenes = data.get("scenes")
        if scenes and isinstance(scenes, list):
            execute("UPDATE story_chapters SET scenes = %s::jsonb WHERE id = %s",
                     (json.dumps(scenes), chapter_id))
            logger.info("Generated %d scenes for chapter %s", len(scenes), chapter_id)
            return True

    return False
