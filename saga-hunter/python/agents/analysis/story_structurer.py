import logging
import re

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

THREE_ACT_MARKERS_EN = {
    "setup": {
        "keywords": ["once upon a time", "began", "started", "introduction", "arrived",
                     "met", "discovered", "received", "invited", "offered"],
        "label": "Setup / Act I",
    },
    "confrontation": {
        "keywords": ["but", "however", "suddenly", "challenge", "conflict", "enemy",
                     "obstacle", "threat", "danger", "crisis", "attack", "betrayal"],
        "label": "Confrontation / Act II",
    },
    "resolution": {
        "keywords": ["finally", "eventually", "in the end", "resolution", "victory",
                     "defeat", "survived", "escaped", "returned", "saved", "rescued"],
        "label": "Resolution / Act III",
    },
}

THREE_ACT_MARKERS_FR = {
    "setup": {
        "keywords": ["il était une fois", "commença", "commencé", "débuta", "introduction",
                     "arriva", "rencontra", "découvrit", "reçut", "invité", "offrit"],
        "label": "Mise en place / Acte I",
    },
    "confrontation": {
        "keywords": ["mais", "cependant", "soudain", "défi", "conflit", "ennemi",
                     "obstacle", "menace", "danger", "crise", "attaque", "trahison"],
        "label": "Confrontation / Acte II",
    },
    "resolution": {
        "keywords": ["enfin", "finalement", "à la fin", "résolution", "victoire",
                     "défaite", "survécu", "échappa", "retourna", "sauvé"],
        "label": "Résolution / Acte III",
    },
}

THREE_ACT_MARKERS_IT = {
    "setup": {
        "keywords": ["c'era una volta", "cominciò", "iniziò", "introduzione",
                     "arrivò", "incontrò", "scoprì", "ricevette", "invitato", "offrì"],
        "label": "Impostazione / Atto I",
    },
    "confrontation": {
        "keywords": ["ma", "tuttavia", "all'improvviso", "sfida", "conflitto", "nemico",
                     "ostacolo", "minaccia", "pericolo", "crisi", "attacco", "tradimento"],
        "label": "Confronto / Atto II",
    },
    "resolution": {
        "keywords": ["finalmente", "alla fine", "risoluzione", "vittoria",
                     "sconfitta", "sopravvissuto", "fuggì", "tornò", "salvato"],
        "label": "Risoluzione / Atto III",
    },
}

THREE_ACT_MARKERS = {"en": THREE_ACT_MARKERS_EN, "fr": THREE_ACT_MARKERS_FR, "it": THREE_ACT_MARKERS_IT}

HERO_JOURNEY_MARKERS_EN = {
    "call_to_adventure": ["call", "summon", "invitation", "quest", "mission", "chosen"],
    "crossing_threshold": ["entered", "crossed", "departed", "left behind", "unknown"],
    "trials": ["test", "trial", "challenge", "monster", "enemy", "obstacle", "fight"],
    "climax": ["final battle", "confront", "face", "ultimate", "climax", "showdown"],
    "return": ["returned", "came back", "home", "reward", "transformed"],
}

HERO_JOURNEY_MARKERS_FR = {
    "call_to_adventure": ["appel", "convocation", "invitation", "quête", "mission", "élu"],
    "crossing_threshold": ["entra", "traversa", "partit", "laissa derrière", "inconnu"],
    "trials": ["épreuve", "essai", "défi", "monstre", "ennemi", "obstacle", "combat"],
    "climax": ["bataille finale", "affronter", "face", "ultime", "climax", "confrontation"],
    "return": ["retourna", "revenu", "chez lui", "récompense", "transformé"],
}

HERO_JOURNEY_MARKERS_IT = {
    "call_to_adventure": ["chiamata", "convocazione", "invito", "missione", "prescelto"],
    "crossing_threshold": ["entrò", "attraversò", "partì", "lasciò alle spalle", "sconosciuto"],
    "trials": ["prova", "sfida", "mostro", "nemico", "ostacolo", "lotta"],
    "climax": ["battaglia finale", "affrontare", "ultimo", "climax", "confronto"],
    "return": ["tornò", "ritornato", "a casa", "ricompensa", "trasformato"],
}

HERO_JOURNEY_MARKERS = {"en": HERO_JOURNEY_MARKERS_EN, "fr": HERO_JOURNEY_MARKERS_FR, "it": HERO_JOURNEY_MARKERS_IT}


class StoryStructurer(BaseAgent):
    name = "story_structurer"
    description = "Identifies story structure markers (3-act, hero's journey) from text"

    def execute(self) -> AgentResult:
        seeds = execute(
            f"SELECT s.id, s.raw_text, s.title FROM seeds s LEFT JOIN enrichments e ON e.seed_id = s.id AND e.agent_name = '{self.name}' WHERE e.id IS NULL ORDER BY s.discovered_at DESC",
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

        return AgentResult(success=True, message=f"Structured {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str, language: str = "en") -> dict:
        text_lower = text.lower()

        lang = language if language in THREE_ACT_MARKERS else "en"
        three_act = THREE_ACT_MARKERS[lang]
        hero_journey = HERO_JOURNEY_MARKERS[lang]

        act_scores = {}
        for act_name, act_data in three_act.items():
            count = sum(1 for kw in act_data["keywords"] if kw in text_lower)
            act_scores[act_name] = {
                "label": act_data["label"],
                "matches": count,
                "detected": count >= 2,
            }

        journey_scores = {}
        for stage, keywords in hero_journey.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            journey_scores[stage] = {
                "matches": count,
                "detected": count >= 1,
            }

        total_acts = sum(1 for a in act_scores.values() if a["detected"])
        best_fit = max(act_scores.items(), key=lambda x: x[1]["matches"])
        total_journey = sum(1 for j in journey_scores.values() if j["detected"])

        if total_acts >= 2:
            structure_type = "three_act"
            structure_name = "Three-Act Structure"
        elif total_journey >= 3:
            structure_type = "hero_journey"
            structure_name = "Hero's Journey"
        elif total_acts >= 1:
            structure_type = "partial_three_act"
            structure_name = f"Partial ({best_fit[1]['label']})"
        else:
            structure_type = "unstructured"
            structure_name = "Unstructured / Fragment"

        return {
            "title": title,
            "structure_type": structure_type,
            "structure_name": structure_name,
            "three_act_scores": act_scores,
            "hero_journey_scores": journey_scores,
            "acts_detected": total_acts,
            "journey_stages_detected": total_journey,
        }
