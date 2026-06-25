import json
import logging
import uuid
from typing import Optional
from app.database import execute
from app.redis_client import publish_event
from app.llm_client import llm


class BaseStoryAgent:
    name: str = ""
    description: str = ""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    def _update_story(self, story_id: str, **kwargs):
        sets = ", ".join(f"{k} = %s" for k in kwargs)
        cols = list(kwargs.values())
        cols.append(story_id)
        execute(f"UPDATE stories SET {sets} WHERE id = %s", tuple(cols))

    def _insert_chapter(self, story_id: str, chapter_number: int, title: str,
                        synopsis: Optional[str] = None, word_count_target: Optional[int] = None,
                        scenes: Optional[list] = None, status: str = "outline"):
        execute(
            """INSERT INTO story_chapters (id, story_id, chapter_number, title, synopsis,
               word_count_target, scenes, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)""",
            (str(uuid.uuid4()), story_id, chapter_number, title, synopsis, word_count_target,
             json.dumps(scenes) if scenes else None, status),
        )

    def _insert_character(self, story_id: str, name: str, archetype: Optional[str] = None,
                          role: Optional[str] = None, traits: Optional[list] = None,
                          backstory: Optional[str] = None, arc: Optional[str] = None,
                          relationships: Optional[list] = None):
        execute(
            """INSERT INTO story_characters (id, story_id, name, archetype, role, traits, backstory, arc, relationships)
               VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s::jsonb)""",
            (str(uuid.uuid4()), story_id, name, archetype, role,
             json.dumps(traits) if traits else None,
             backstory, arc,
             json.dumps(relationships) if relationships else None),
        )

    def _insert_location(self, story_id: str, name: str, type_: Optional[str] = None,
                         description: Optional[str] = None, significance: Optional[str] = None,
                         chapters_featured: Optional[list] = None):
        execute(
            """INSERT INTO story_locations (id, story_id, name, type, description, significance, chapters_featured)
               VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)""",
            (str(uuid.uuid4()), story_id, name, type_, description, significance,
             json.dumps(chapters_featured) if chapters_featured else None),
        )

    def _insert_arc(self, story_id: str, name: str, description: Optional[str] = None,
                    chapters_involved: Optional[list] = None,
                    characters_involved: Optional[list] = None):
        execute(
            """INSERT INTO story_arcs (id, story_id, name, description, chapters_involved, characters_involved)
               VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb)""",
            (str(uuid.uuid4()), story_id, name, description,
             json.dumps(chapters_involved) if chapters_involved else None,
             json.dumps(characters_involved) if characters_involved else None),
        )

    def _publish_progress(self, story_id: str, message: str):
        publish_event("story:progress", f"{story_id}|{self.name}|{message}")
        self.logger.info("[story %s] %s: %s", story_id, self.name, message)

    def _try_llm(self, prompt: str, story_id: str) -> Optional[dict]:
        if not llm.is_available():
            return None
        try:
            response = llm.generate(prompt, temperature=0.3)
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()
            return json.loads(cleaned)
        except Exception as e:
            self.logger.warning("LLM call failed: %s", e)
            return None

    def develop(self, story_id: str) -> bool:
        raise NotImplementedError
