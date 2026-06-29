import logging
import re
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "the", "this", "that", "what", "when", "where", "which", "there",
    "they", "them", "their", "have", "will", "would", "could", "should",
    "with", "from", "about", "after", "before", "during", "without",
    "although", "because", "through", "while", "since", "until",
    "upon", "into", "over", "between", "against", "across", "around",
    "within", "along", "among", "above", "below", "under", "behind",
    "beyond", "inside", "outside", "onto", "down", "off", "near",
    "every", "each", "both", "few", "more", "most", "other", "some",
    "such", "only", "own", "same", "another", "many", "much",
    "le", "la", "les", "du", "des", "ce", "ces", "mon", "ton", "son", "sa", "ses",
    "il", "elle", "ils", "elles", "nous", "vous", "qui", "que", "dont", "où",
    "loro", "gli", "una", "questo", "quello", "mio", "tuo", "suo",
}

ROLE_MARKERS = {
    "protagonist": {
        "keywords": ["protagonist", "hero", "main character", "lead", "chosen one",
                     "survivor", "detective", "explorer", "investigator",
                     "protagoniste", "héros", "personnage principal", "détective", "enquêteur",
                     "protagonista", "eroe", "personaggio principale", "investigatore"],
        "weight": 2,
    },
    "antagonist": {
        "keywords": ["antagonist", "villain", "enemy", "evil", "dark lord", "murderer",
                     "criminal", "assassin", "dictator", "tyrant",
                     "antagoniste", "méchant", "ennemi", "criminel", "assassin", "dictateur",
                     "antagonista", "cattivo", "nemico", "criminale", "assassino", "dittatore"],
        "weight": 2,
    },
    "mentor": {
        "keywords": ["mentor", "teacher", "guide", "master", "wise", "elder",
                     "professor", "doctor", "counselor",
                     "mentor", "enseignant", "guide", "maître", "sage", "professeur",
                     "mentore", "insegnante", "guida", "maestro", "saggio", "professore"],
        "weight": 1,
    },
    "sidekick": {
        "keywords": ["sidekick", "companion", "friend", "ally", "partner",
                     "assistant", "follower", "disciple",
                     "acolyte", "compagnon", "ami", "allié", "partenaire", "assistant",
                     "spalla", "compagno", "amico", "alleato", "partner", "assistente"],
        "weight": 1,
    },
    "love_interest": {
        "keywords": ["love", "lover", "fiancé", "fiancée", "spouse", "partner",
                     "sweetheart", "romance",
                     "amour", "amoureux", "fiancé", "époux", "bien-aimé",
                     "amore", "innamorato", "fidanzato", "coniuge", "diletto"],
        "weight": 1,
    },
    "victim": {
        "keywords": ["victim", "hostage", "survivor", "missing", "lost",
                     "kidnapped", "injured", "wounded",
                     "victime", "otage", "survivant", "disparu", "blessé",
                     "vittima", "ostaggio", "sopravvissuto", "scomparso", "ferito"],
        "weight": 1,
    },
    "witness": {
        "keywords": ["witness", "bystander", "observer", "reporter",
                     "journalist", "informant",
                     "témoin", "observateur", "reporter", "journaliste", "informateur",
                     "testimone", "osservatore", "reporter", "giornalista", "informatore"],
        "weight": 1,
    },
    "authority": {
        "keywords": ["king", "queen", "president", "general", "captain",
                     "leader", "chief", "director", "governor", "judge",
                     "roi", "reine", "président", "général", "capitaine",
                     "chef", "directeur", "gouverneur", "juge",
                     "re", "regina", "presidente", "generale", "capitano",
                     "capo", "direttore", "governatore", "giudice"],
        "weight": 1,
    },
}

PERSONALITY_TRAITS = {
    "brave": ["brave", "courageous", "fearless", "daring", "bold", "valiant",
              "courageux", "intrépide", "audacieux", "vaillant",
              "coraggioso", "intrepido", "audace", "valoroso"],
    "cunning": ["cunning", "clever", "sly", "shrewd", "deceptive", "manipulative",
                "rusé", "malin", "astucieux", "manipulateur",
                "astuto", "furbo", "scaltro", "manipolatore"],
    "kind": ["kind", "compassionate", "gentle", "caring", "benevolent", "warm",
             "gentil", "compatissant", "doux", "attentionné", "bienveillant",
             "gentile", "compassionevole", "dolce", "premuroso", "benevolo"],
    "ruthless": ["ruthless", "cruel", "merciless", "brutal", "savage", "cold",
                 "impitoyable", "cruel", "sans pitié", "brutal", "sauvage",
                 "spietato", "crudele", "brutale", "selvaggio"],
    "curious": ["curious", "inquisitive", "questioning", "exploring", "observant",
                "curieux", "inquisiteur", "explorateur", "observateur",
                "curioso", "inquisitivo", "esploratore", "osservatore"],
    "wise": ["wise", "intelligent", "brilliant", "knowledgeable", "insightful",
             "sage", "intelligent", "brillant", "savant", "perspicace",
             "saggio", "intelligente", "brillante", "sapiente", "perspicace"],
    "reckless": ["reckless", "impulsive", "rash", "foolhardy", "wild",
                 "imprudent", "impulsif", "téméraire", "insouciant",
                 "imprudente", "impulsivo", "avventato", "sconsiderato"],
    "loyal": ["loyal", "faithful", "devoted", "dedicated", "trustworthy",
              "loyal", "fidèle", "dévoué", "dédié", "digne de confiance",
              "leale", "fedele", "devoto", "dedicato", "fidato"],
    "mysterious": ["mysterious", "enigmatic", "secretive", "unknown", "shadowy",
                   "mystérieux", "énigmatique", "secret", "inconnu", "ombrageux",
                   "misterioso", "enigmatico", "segreto", "sconosciuto", "ombroso"],
    "arrogant": ["arrogant", "proud", "vain", "haughty", "conceited",
                 "arrogant", "fier", "vaniteux", "hautain", "orgueilleux",
                 "arrogante", "orgoglioso", "vanitoso", "altezzoso", "superbo"],
}

ARC_TYPES = [
    {
        "name": "Redemption",
        "keywords": ["redemption", "forgive", "change", "transformation", "second chance",
                     "rédemption", "pardon", "changement", "transformation", "seconde chance",
                     "redenzione", "perdono", "cambiamento", "trasformazione", "seconda possibilità"],
        "description": "A character who must overcome their past and find forgiveness.",
    },
    {
        "name": "Fall From Grace",
        "keywords": ["fall", "corruption", "downfall", "tragedy", "pride", "betrayal",
                     "chute", "corruption", "déchéance", "tragédie", "fierté", "trahison",
                     "caduta", "corruzione", "tragedia", "orgoglio", "tradimento"],
        "description": "A character who loses their way, power, or morality.",
    },
    {
        "name": "Rags to Riches",
        "keywords": ["rise", "success", "discover", "fortune", "achievement", "ascend",
                     "ascension", "succès", "découverte", "fortune", "réussite",
                     "ascesa", "successo", "scoperta", "fortuna", "traguardo"],
        "description": "A character who rises from humble beginnings to greatness.",
    },
    {
        "name": "Coming of Age",
        "keywords": ["grow", "mature", "learn", "discover", "innocence", "experience",
                     "grandir", "mûrir", "apprendre", "découvrir", "innocence", "expérience",
                     "crescere", "maturare", "imparare", "scoprire", "innocenza", "esperienza"],
        "description": "A character who matures through trials and experience.",
    },
    {
        "name": "Quest",
        "keywords": ["quest", "journey", "mission", "search", "pursuit", "goal",
                     "quête", "voyage", "mission", "recherche", "poursuite", "objectif",
                     "missione", "viaggio", "ricerca", "inseguimento", "obiettivo"],
        "description": "A character driven by a specific goal or mission.",
    },
    {
        "name": "Survival",
        "keywords": ["survive", "escape", "persevere", "endure", "overcome", "struggle",
                     "survivre", "échapper", "persévérer", "endurer", "surmonter", "lutte",
                     "sopravvivere", "fuggire", "perseverare", "sopportare", "superare", "lotta"],
        "description": "A character fighting to survive against overwhelming odds.",
    },
]

MOTIVATION_KEYWORDS = {
    "revenge": ["revenge", "vengeance", "avenge", "payback", "retribution",
                "vengeance", "venger", "revanche", "rétribution",
                "vendetta", "vendicare", "rivalsa", "retribuzione"],
    "justice": ["justice", "truth", "fairness", "righteous", "moral",
                "justice", "vérité", "équité", "juste", "moral",
                "giustizia", "verità", "equità", "giusto", "morale"],
    "power": ["power", "control", "dominate", "rule", "authority", "ambition",
              "pouvoir", "contrôle", "dominer", "régner", "autorité", "ambition",
              "potere", "controllo", "dominare", "governare", "autorità", "ambizione"],
    "love": ["love", "protect", "save", "rescue", "sacrifice", "devotion",
             "amour", "protéger", "sauver", "secourir", "sacrifice", "dévotion",
             "amore", "proteggere", "salvare", "soccorrere", "sacrificio", "devozione"],
    "knowledge": ["knowledge", "discover", "learn", "truth", "understand", "secret",
                  "connaissance", "découvrir", "apprendre", "vérité", "comprendre", "secret",
                  "conoscenza", "scoprire", "imparare", "verità", "capire", "segreto"],
    "survival": ["survive", "escape", "live", "safety", "security", "freedom",
                 "survivre", "échapper", "vivre", "sécurité", "liberté",
                 "sopravvivere", "fuggire", "vivere", "sicurezza", "libertà"],
    "duty": ["duty", "honor", "obligation", "responsibility", "loyalty", "serve",
             "devoir", "honneur", "obligation", "responsabilité", "loyauté", "servir",
             "dovere", "onore", "obbligo", "responsabilità", "lealtà", "servire"],
    "greed": ["greed", "wealth", "treasure", "fortune", "riches", "gold",
              "avidité", "richesse", "trésor", "fortune", "or",
              "avidità", "ricchezza", "tesoro", "fortuna", "oro"],
}


def _extract_characters(text: str, title: str) -> list[dict]:
    text_lower = text.lower()
    words = re.findall(r"[A-Z][a-z]+", text)
    candidates = [w for w in set(words) if len(w) > 2 and w.lower() not in STOP_WORDS]

    if not candidates:
        return []

    characters = []
    for name in candidates[:8]:
        role_scores = {}
        for role, config in ROLE_MARKERS.items():
            count = sum(1 for kw in config["keywords"] if kw in text_lower)
            if count > 0:
                role_scores[role] = count * config["weight"]

        role = max(role_scores, key=role_scores.get) if role_scores else "unknown"
        role_label = role.replace("_", " ").title()

        traits_detected = []
        for trait, keywords in PERSONALITY_TRAITS.items():
            if any(kw in text_lower for kw in keywords):
                if len(traits_detected) < 3:
                    traits_detected.append(trait.title())

        motivations = []
        for motive, keywords in MOTIVATION_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                motivations.append(motive.title())

        arcs = []
        for arc in ARC_TYPES:
            count = sum(1 for kw in arc["keywords"] if kw in text_lower)
            if count >= 2:
                arcs.append({
                    "name": arc["name"],
                    "description": arc["description"],
                    "confidence": min(int(count / len(arc["keywords"]) * 100), 100),
                })

        name_lower = name.lower()
        name_count = text_lower.count(name_lower)
        name_sentences = [s.strip() for s in re.split(r'[.!?]+', text) if name_lower in s.lower()]
        context = name_sentences[0][:120] if name_sentences else ""

        character = {
            "name": name,
            "role": role_label,
            "role_type": role,
            "mentions": name_count,
            "context": context + ("." if context and not context.endswith(".") else ""),
            "traits": traits_detected,
            "motivations": motivations[:3],
            "potential_arcs": arcs[:2],
            "is_protagonist": role == "protagonist" or name_count >= 5,
        }
        characters.append(character)

    characters.sort(key=lambda c: c["mentions"], reverse=True)
    return characters


class CharacterHarvester(BaseAgent):
    name = "character_harvester"
    description = "Extracts character profiles, roles, traits, and motivations from seeds"

    def execute(self) -> AgentResult:
        seeds = execute(
            "SELECT s.id, s.raw_text, s.title FROM seeds s LEFT JOIN enrichments e ON e.seed_id = s.id AND e.agent_name = %s WHERE e.id IS NULL ORDER BY s.discovered_at DESC",
            (self.name,),
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

        return AgentResult(success=True, message=f"Extracted characters from {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str) -> Optional[dict]:
        characters = _extract_characters(text, title)

        return {
            "title": title,
            "characters": characters,
            "total_characters": len(characters),
            "primary_characters": [c for c in characters if c["mentions"] >= 2][:3],
        }
