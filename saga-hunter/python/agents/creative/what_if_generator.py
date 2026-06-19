import logging
import random
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

PROTAGONIST_VARIATIONS = [
    "the protagonist was not {protagonist} but someone else entirely",
    "the protagonist had a hidden past that changed everything",
    "instead of {protagonist}, a child was the one who discovered the truth",
    "the protagonist was secretly working for the antagonist",
    "{protagonist} had a twin nobody knew about",
    "the protagonist died in the first chapter",
    "le protagoniste n'était pas {protagonist} mais quelqu'un d'autre",
    "le protagoniste avait un passé caché qui a tout changé",
    "il protagonista non era {protagonist} ma qualcun altro",
    "il protagonista aveva un passato nascosto che ha cambiato tutto",
]

SETTING_VARIATIONS = [
    "the story took place in a {setting} instead",
    "it was set in an alternate history where the world was different",
    "the events happened in a parallel dimension",
    "the setting was a post-apocalyptic version of itself",
    "everything took place underwater instead",
    "the story was set on a distant planet with different physics",
    "l'histoire se déroulait dans {setting} à la place",
    "la storia si svolgeva in {setting} invece",
]

CONFLICT_VARIATIONS = [
    "the antagonist was actually trying to save the world",
    "there was no clear villain — only misunderstood characters",
    "the conflict was a misunderstanding that spiraled out of control",
    "the real enemy was a natural force, not a person",
    "the protagonist and antagonist were forced to work together",
    "the conflict happened centuries before the main story begins",
    "l'antagoniste essayait en fait de sauver le monde",
    "l'antagonista stava in realtà cercando di salvare il mondo",
]

GENRE_VARIATIONS = [
    "the story was a comedy rather than {genre}",
    "it was a musical version of the same events",
    "the events were a dream — or were they?",
    "the story was told from the antagonist's point of view",
    "everything was a simulation inside a video game",
    "the story was a documentary being filmed about the events",
    "l'histoire était une comédie plutôt que {genre}",
    "la storia era una commedia anziché {genre}",
]

TWIST_VARIATIONS = [
    "the narrator was unreliable and lying about everything",
    "time was looping and the events kept repeating",
    "the protagonist was the antagonist all along",
    "every character was actually the same person with multiple personalities",
    "it was all a story within a story within a story",
    "the world ended before the story began, and this is the afterlife",
    "le narrateur n'était pas fiable et mentait sur tout",
    "il narratore era inaffidabile e mentiva su tutto",
]


def _detect_genre(text: str) -> str:
    text_lower = text.lower()
    genre_map = {
        "mystery": ["mystery", "detective", "clue", "crime", "investigation",
                    "mystère", "détective", "indice", "crime", "enquête",
                    "mistero", "detective", "indizio", "crimine", "indagine"],
        "thriller": ["suspense", "chase", "conspiracy", "escape", "kidnap",
                     "suspense", "poursuite", "conspiration", "évasion", "enlèvement",
                     "suspense", "inseguimento", "cospirazione", "fuga", "rapimento"],
        "romance": ["love", "romance", "heart", "passion", "marriage", "kiss",
                    "amour", "romance", "cœur", "passion", "mariage", "baiser",
                    "amore", "romance", "cuore", "passione", "matrimonio", "bacio"],
        "scifi": ["space", "alien", "robot", "future", "technology",
                  "espace", "alien", "robot", "futur", "technologie",
                  "spazio", "alieno", "robot", "futuro", "tecnologia"],
        "fantasy": ["magic", "dragon", "spell", "wizard", "sword",
                    "magie", "dragon", "sort", "sorcier", "épée",
                    "magia", "drago", "incantesimo", "mago", "spada"],
        "horror": ["haunted", "ghost", "demon", "nightmare", "terror",
                   "hanté", "fantôme", "démon", "cauchemar", "terreur",
                   "infestato", "fantasma", "demone", "incubo", "terrore"],
        "drama": ["family", "struggle", "grief", "loss", "redemption",
                  "famille", "lutte", "chagrin", "perte", "rédemption",
                  "famiglia", "lotta", "dolore", "perdita", "redenzione"],
    }
    best_genre = "drama"
    best_count = 0
    for genre, keywords in genre_map.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > best_count:
            best_count = count
            best_genre = genre
    return best_genre


def _extract_protagonist(text: str) -> str:
    import re
    words = re.findall(r"[A-Z][a-z]+", text)
    proper = [w for w in set(words) if len(w) > 2 and w.lower() not in {
        "the", "this", "that", "what", "when", "where", "which", "there",
        "they", "them", "their", "have", "will", "would", "could", "should",
        "with", "from", "about", "after", "before", "during", "without",
        "although", "because", "through",
    }]
    return proper[0] if proper else "the main character"


_used_variations: set = set()


class WhatIfGenerator(BaseAgent):
    name = "what_if_generator"
    description = "Generates alternative narrative twists and speculative variations from seeds"

    def execute(self) -> AgentResult:
        seeds = execute(
            "SELECT id, raw_text, title FROM seeds ORDER BY discovered_at ASC LIMIT 20",
            fetch=True,
        )
        enriched = 0
        for row in seeds:
            seed_id, raw_text, title = row[:3]
            if self._already_enriched(seed_id):
                continue
            result = self._analyze(raw_text, title)
            if result:
                self._save_enrichment(seed_id, self.name, result)
                enriched += 1

        return AgentResult(success=True, message=f"Generated what-ifs for {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str) -> Optional[dict]:
        global _used_variations
        genre = _detect_genre(text)
        protagonist = _extract_protagonist(text)

        variation_pools = [
            PROTAGONIST_VARIATIONS,
            SETTING_VARIATIONS,
            CONFLICT_VARIATIONS,
            GENRE_VARIATIONS,
            TWIST_VARIATIONS,
        ]

        variations = []
        for pool in variation_pools:
            available = [v for v in pool if v not in _used_variations]
            if not available:
                available = pool
            chosen = random.choice(available)
            _used_variations.add(chosen)
            if len(_used_variations) > 100:
                _used_variations = set(list(_used_variations)[-50:])

            variation_text = chosen.format(
                protagonist=protagonist,
                setting=genre,
                genre=genre,
            )
            variations.append(variation_text)

        random.shuffle(variations)

        impact_levels = ["minor", "moderate", "major"]
        return {
            "title": title,
            "original_genre": genre,
            "original_protagonist": protagonist,
            "variations": [
                {
                    "id": i + 1,
                    "question": f"What if {v}?",
                    "description": v,
                    "impact": random.choice(impact_levels),
                }
                for i, v in enumerate(variations[:5])
            ],
            "total_variations": min(len(variations), 5),
        }
