import logging
import re

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

GENRE_KEYWORDS = {
    "mystery": {
        "weight": 1.0,
        "keywords": ["crime", "detective", "clue", "mystery", "suspect", "alibi",
                     "investigation", "murder", "whodunit", "evidence", "witness",
                     "interrogation", "deduction", "motive", "case"],
    },
    "thriller": {
        "weight": 1.0,
        "keywords": ["suspense", "tension", "chase", "hostage", "conspiracy",
                     "twist", "escape", "pursuit", "surveillance", "cover-up",
                     "blackmail", "intrigue", "kidnap", "manhunt", "plot"],
    },
    "romance": {
        "weight": 1.0,
        "keywords": ["love", "romance", "passion", "heart", "kiss", "marriage",
                     "relationship", "date", "soulmate", "affair", "wedding",
                     "courtship", "devotion", "longing", "embrace"],
    },
    "scifi": {
        "weight": 1.0,
        "keywords": ["future", "technology", "space", "alien", "robot", "cyber",
                     "quantum", "dimensional", "clone", "futuristic", "starship",
                     "artificial intelligence", "virtual reality", "genetic",
                     "satellite", "orbital", "nanotech"],
    },
    "fantasy": {
        "weight": 1.0,
        "keywords": ["magic", "dragon", "spell", "wizard", "sword", "mythical",
                     "enchanted", "prophecy", "kingdom", "monster", "fairy",
                     "elf", "dwarf", "sorcery", "ancient evil", "quest", "realm"],
    },
    "drama": {
        "weight": 1.0,
        "keywords": ["family", "struggle", "emotional", "relationship", "mother",
                     "father", "child", "grief", "loss", "divorce", "addiction",
                     "redemption", "trauma", "healing", "sacrifice"],
    },
    "horror": {
        "weight": 1.0,
        "keywords": ["haunted", "ghost", "demon", "possession", "curse", "vampire",
                     "werewolf", "nightmare", "scream", "terrify", "supernatural",
                     "occult", "ritual", "undead", "creature"],
    },
    "historical": {
        "weight": 1.0,
        "keywords": ["century", "ancient", "medieval", "empire", "kingdom", "revolution",
                     "war", "treaty", "dynasty", "crown", "throne", "invasion",
                     "colonial", "renaissance", "archaeological"],
    },
}


class GenreClassifier(BaseAgent):
    name = "genre_classifier"
    description = "Classifies seed text into narrative genres using keyword matching"

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

        return AgentResult(success=True, message=f"Classified {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str) -> dict:
        text_lower = text.lower()

        genre_scores = {}
        for genre, config in GENRE_KEYWORDS.items():
            count = sum(1 for kw in config["keywords"] if kw in text_lower)
            max_possible = len(config["keywords"])
            ratio = count / max_possible if max_possible > 0 else 0
            score = int(ratio * config["weight"] * 100)
            genre_scores[genre] = {
                "score": score,
                "matches": count,
                "total_keywords": max_possible,
                "match_percent": round(ratio * 100, 1),
            }

        sorted_genres = sorted(genre_scores.items(), key=lambda x: x[1]["score"], reverse=True)
        top_hits = [g for g, s in sorted_genres if s["score"] > 0]

        primary = sorted_genres[0][0] if sorted_genres and sorted_genres[0][1]["score"] > 0 else "unknown"
        secondary = sorted_genres[1][0] if len(sorted_genres) > 1 and sorted_genres[1][1]["score"] > 0 else None

        return {
            "title": title,
            "primary_genre": primary,
            "secondary_genre": secondary,
            "is_mixed": len(top_hits) > 1,
            "genre_scores": genre_scores,
            "top_matches": top_hits[:3],
        }
