from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime
import json
import re
import uuid
import logging

from app.database import execute
from app.redis_client import publish_event
from app.cache import get_seed_enrichments, set_seed_enrichment

logger = logging.getLogger(__name__)


CONFLICT_KEYWORDS = {
    "en": ["murder", "kill", "death", "war", "battle", "attack", "betrayal", "crash", "explosion",
           "hostage", "kidnap", "violence", "assault", "revenge", "conspiracy", "fraud", "theft",
           "destruction", "collapse", "crisis"],
    "es": ["asesinato", "muerte", "guerra", "traición", "ataque", "explosión", "secuestro",
           "violencia", "venganza", "conspiración", "fraude", "robo", "destrucción", "crisis"],
    "fr": ["meurtre", "mort", "guerre", "trahison", "attaque", "explosion", "enlèvement",
           "violence", "vengeance", "complot", "fraude", "vol", "destruction", "crise"],
    "it": ["omicidio", "morte", "guerra", "tradimento", "attacco", "esplosione", "rapimento",
           "violenza", "vendetta", "cospirazione", "frode", "furto", "distruzione", "crisi"],
}

MYSTERY_KEYWORDS = {
    "en": ["disappear", "unknown", "secret", "mystery", "unexplained", "strange", "weird",
           "puzzle", "enigma", "hidden", "lost", "curious", "phenomenon", "unsolved"],
    "es": ["desaparecer", "desconocido", "secreto", "misterio", "inexplicable", "extraño",
           "enigma", "oculto", "perdido", "curioso", "fenómeno", "sin resolver"],
    "fr": ["disparaître", "inconnu", "secret", "mystère", "inexpliqué", "étrange",
           "énigme", "caché", "perdu", "curieux", "phénomène", "non résolu"],
    "it": ["scomparire", "sconosciuto", "segreto", "mistero", "inspiegabile", "strano",
           "enigma", "nascosto", "perduto", "curioso", "fenomeno", "irrisolto"],
}

ARC_KEYWORDS = {
    "en": ["transform", "redemption", "journey", "survive", "escape", "overcome",
           "discover", "change", "evolve", "rise", "fall", "rebuild", "awaken"],
    "es": ["transformación", "redención", "viaje", "sobrevivir", "escapar", "superar",
           "descubrir", "cambio", "evolucionar", "caída", "renacer"],
    "fr": ["transformation", "rédemption", "voyage", "survivre", "échapper", "surmonter",
           "découvrir", "changement", "évoluer", "chute", "renaître"],
    "it": ["trasformazione", "redenzione", "viaggio", "sopravvivere", "fuggire", "superare",
           "scoprire", "cambiamento", "evolvere", "caduta", "rinascita"],
}

EMOTION_KEYWORDS = {
    "en": ["love", "fear", "rage", "hope", "despair", "grief", "joy", "passion",
           "terror", "longing", "regret", "courage"],
    "es": ["amor", "miedo", "ira", "esperanza", "desesperación", "dolor", "alegría",
           "pasión", "terror", "anhelo", "arrepentimiento", "coraje"],
    "fr": ["amour", "peur", "rage", "espoir", "désespoir", "chagrin", "joie",
           "passion", "terreur", "nostalgie", "regret", "courage"],
    "it": ["amore", "paura", "rabbia", "speranza", "disperazione", "dolore", "gioia",
           "passione", "terrore", "desiderio", "rimpianto", "coraggio"],
}

SCORE_WEIGHTS = {
    "conflict": 0.4,
    "mystery": 0.3,
    "arc": 0.2,
    "emotion": 0.1,
}

CATEGORY_KEYWORDS = {
    "conflict": CONFLICT_KEYWORDS,
    "mystery": MYSTERY_KEYWORDS,
    "arc": ARC_KEYWORDS,
    "emotion": EMOTION_KEYWORDS,
}


def compute_narrative_score(text: str, language: str = "en") -> int:
    text_lower = text.lower()
    total_score = 0.0
    lang = language if language in CATEGORY_KEYWORDS["conflict"] else "en"

    for category, weight in SCORE_WEIGHTS.items():
        keywords = CATEGORY_KEYWORDS[category].get(lang, CATEGORY_KEYWORDS[category]["en"])
        count = sum(1 for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", text_lower))
        max_possible = len(keywords)
        ratio = min(count / max_possible, 1.0) if max_possible > 0 else 0
        total_score += ratio * weight

    return min(int(total_score * 100 + 0.5), 100)


class AgentResult:
    def __init__(self, success: bool, message: str = "", seeds_created: int = 0):
        self.success = success
        self.message = message
        self.seeds_created = seeds_created


class BaseAgent(ABC):
    name: str = ""
    description: str = ""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self._enriched_seeds = None

    def _already_enriched(self, seed_id: str) -> bool:
        if self._enriched_seeds is None:
            rows = execute(
                "SELECT seed_id FROM enrichments WHERE agent_name = %s",
                (self.name,),
                fetch=True,
            )
            self._enriched_seeds = {row[0] for row in rows}
        return seed_id in self._enriched_seeds

    def _fetch_enrichments(self, seed_id: str) -> dict[str, dict]:
        cached = get_seed_enrichments(seed_id)
        if cached is not None:
            return cached
        rows = execute(
            "SELECT agent_name, data FROM enrichments WHERE seed_id = %s",
            (seed_id,),
            fetch=True,
        )
        result = {}
        for agent_name, data in rows:
            result[agent_name] = data
            set_seed_enrichment(seed_id, agent_name, data)
        return result

    @abstractmethod
    def execute(self) -> AgentResult:
        pass

    def _load_config(self) -> Optional[dict]:
        rows = execute(
            "SELECT enabled, mode, schedule, languages, params FROM agent_configs WHERE agent_name = %s",
            (self.name,),
            fetch=True,
        )
        if rows:
            return {
                "enabled": rows[0][0],
                "mode": rows[0][1],
                "schedule": rows[0][2],
                "languages": rows[0][3],
                "params": rows[0][4],
            }
        return None

    def _save_seed(self, title: str, source_type: str, source_url: str,
                   source_name: str, raw_text: str, language: str,
                   narrative_score: int) -> Optional[int]:
        execute(
            """INSERT INTO seeds (id, title, source_type, source_url, source_name, raw_text,
                                  language, narrative_score, status, discovered_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'discovered', NOW())
               ON CONFLICT (source_url) DO NOTHING""",
            (str(uuid.uuid4()), title, source_type, source_url, source_name, raw_text, language, narrative_score),
        )
        publish_event("seeds:new", f"New seed discovered: {title}")
        return None

    def _seed_exists(self, source_url: str) -> bool:
        rows = execute(
            "SELECT 1 FROM seeds WHERE source_url = %s LIMIT 1",
            (source_url,),
            fetch=True,
        )
        return len(rows) > 0

    def _save_enrichment(self, seed_id: str, agent_name: str, data: dict) -> None:
        execute(
            """INSERT INTO enrichments (id, seed_id, agent_name, data, created_at)
               VALUES (%s, %s, %s, %s::jsonb, NOW())""",
            (str(uuid.uuid4()), seed_id, agent_name, json.dumps(data)),
        )
        set_seed_enrichment(seed_id, agent_name, data)
        publish_event("enrichment:new", f"{agent_name} enriched seed {seed_id}")
