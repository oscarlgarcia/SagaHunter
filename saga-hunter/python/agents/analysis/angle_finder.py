import logging
import re
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)


class AngleFinder(BaseAgent):
    name = "angle_finder"
    description = "Extracts narrative angles from seed text (protagonist, conflict, setting, theme)"

    def execute(self) -> AgentResult:
        seeds = execute(
            "SELECT id, raw_text, title, language FROM seeds ORDER BY discovered_at ASC LIMIT 20",
            fetch=True,
        )
        enriched = 0
        for row in seeds:
            seed_id, raw_text, title, language = row[:4]
            if self._already_enriched(seed_id):
                continue
            result = self._analyze(raw_text, title, language)
            if result:
                self._save_enrichment(seed_id, self.name, result)
                enriched += 1

        return AgentResult(success=True, message=f"Analyzed {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str, language: str) -> Optional[dict]:
        text_lower = text.lower()
        words = re.findall(r"[A-Z][a-z]+", text)

        stop_words = {
            "the", "this", "that", "what", "when", "where", "which", "there",
            "they", "them", "their", "have", "will", "would", "could", "should",
            "with", "from", "about", "after", "before", "during", "without",
        }

        proper_nouns = [w for w in set(words) if len(w) > 2 and w.lower() not in stop_words][:5]

        external_markers = {
            "en": ["war", "battle", "attack", "chase", "fight", "explosion", "crash",
                   "kidnap", "murder", "assault", "invade", "collide", "dead", "death"],
            "fr": ["guerre", "bataille", "attaque", "poursuite", "combat", "explosion",
                   "enlèvement", "meurtre", "assaut", "envahir", "mort"],
            "it": ["guerra", "battaglia", "attacco", "inseguimento", "lotta", "esplosione",
                   "rapimento", "omicidio", "assalto", "invadere", "morto"],
        }

        setting_markers = {
            "en": ["forest", "city", "mountain", "ocean", "desert", "island", "castle",
                   "village", "planet", "space", "underwater", "jungle", "river", "valley",
                   "temple", "ruins", "lab", "hospital", "school", "prison", "factory",
                   "mansion", "cave", "tower", "bridge", "garden", "library", "museum"],
            "fr": ["forêt", "ville", "montagne", "océan", "désert", "île", "château",
                   "village", "planète", "espace", "souterrain", "jungle", "rivière", "vallée",
                   "temple", "ruines", "laboratoire", "hôpital", "école", "prison", "usine",
                   "manoir", "grotte", "tour", "pont", "jardin", "bibliothèque", "musée"],
            "it": ["foresta", "città", "montagna", "oceano", "deserto", "isola", "castello",
                   "villaggio", "pianeta", "spazio", "sott'acqua", "giungla", "fiume", "valle",
                   "tempio", "rovine", "laboratorio", "ospedale", "scuola", "prigione", "fabbrica",
                   "maniero", "grotta", "torre", "ponte", "giardino", "biblioteca", "museo"],
        }

        conflict_kw = {
            "en": ["murder", "war", "death", "dead", "battle", "betrayal", "revenge",
                   "crisis", "struggle", "conflict"],
            "fr": ["meurtre", "guerre", "mort", "bataille", "trahison", "vengeance",
                   "crise", "lutte", "conflit"],
            "it": ["omicidio", "guerra", "morte", "battaglia", "tradimento", "vendetta",
                   "crisi", "lotta", "conflitto"],
        }

        mystery_kw = {
            "en": ["mystery", "secret", "hidden", "unknown", "disappear", "puzzle", "clue"],
            "fr": ["mystère", "secret", "caché", "inconnu", "disparaître", "énigme", "indice"],
            "it": ["mistero", "segreto", "nascosto", "sconosciuto", "scomparire", "enigma", "indizio"],
        }

        arc_kw = {
            "en": ["transform", "journey", "survive", "escape", "discover", "change"],
            "fr": ["transformer", "voyage", "survivre", "échapper", "découvrir", "changer"],
            "it": ["trasformare", "viaggio", "sopravvivere", "fuggire", "scoprire", "cambiare"],
        }

        lang = language if language in external_markers else "en"
        ext = external_markers[lang]
        set_m = setting_markers[lang]
        c_kw = conflict_kw[lang]
        m_kw = mystery_kw[lang]
        a_kw = arc_kw[lang]

        conflict_type = "internal"
        if any(kw in text_lower for kw in ext):
            conflict_type = "external"

        settings = []
        for marker in set_m:
            if marker in text_lower:
                settings.append(marker.title())

        conflict_score = sum(1 for kw in c_kw if kw in text_lower)
        mystery_score = sum(1 for kw in m_kw if kw in text_lower)
        arc_score = sum(1 for kw in a_kw if kw in text_lower)

        return {
            "title": title,
            "protagonists": proper_nouns[:3],
            "conflict_type": conflict_type,
            "settings": settings[:3],
            "theme_scores": {
                "conflict": conflict_score,
                "mystery": mystery_score,
                "arc": arc_score,
            },
            "summary": f"A {conflict_type} story about {title.lower()}."
        }
