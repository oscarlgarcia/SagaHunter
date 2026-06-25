import logging
import uuid
from typing import Optional
from app.database import execute
from app.redis_client import publish_event
from app.orchestrator import AGENT_REGISTRY, _run_single_agent

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


def develop_story(seed_id: Optional[str] = None, title: str = "",
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

    total = len(STORY_STEPS)
    for idx, step_class in enumerate(STORY_STEPS):
        step = step_class()
        step_name = step.name
        publish_event("story:progress", f"{story_id}|_orchestrator|Step {idx+1}/{total}: {step_name}")
        logger.info("Running story step %d/%d: %s", idx + 1, total, step_name)
        try:
            success = step.develop(story_id)
            if success:
                publish_event("story:progress", f"{story_id}|{step_name}|completed")
            else:
                publish_event("story:progress", f"{story_id}|{step_name}|failed")
        except Exception as e:
            logger.exception("Story step %s failed: %s", step_name, e)
            publish_event("story:progress", f"{story_id}|{step_name}|error: {e}")

    execute("UPDATE stories SET status = 'outline' WHERE id = %s", (story_id,))
    publish_event("story:complete", f"{story_id}|{total}")
    logger.info("Story development complete: %s (%s)", story_id, title)
    return story_id


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
