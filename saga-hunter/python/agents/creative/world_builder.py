import logging
import re
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

SETTING_TYPES = {
    "fantasy": {
        "keywords": ["magic", "dragon", "spell", "wizard", "sword", "kingdom", "enchanted",
                     "mythical", "prophecy", "sorcery", "elf", "dwarf", "castle", "realm",
                     "ancient evil", "quest", "mage",
                     "magie", "dragon", "sort", "sorcier", "épée", "royaume", "elfe", "nain",
                     "château", "prophétie", "enchante", "légende", "quête",
                     "magia", "drago", "incantesimo", "mago", "spada", "regno", "elfo", "nano",
                     "castello", "profezia", "leggenda", "missione"],
        "tech_label": "medieval",
        "description": "A world of magic, mythical creatures, and medieval kingdoms.",
    },
    "scifi": {
        "keywords": ["space", "alien", "robot", "cyber", "quantum", "futuristic",
                     "starship", "artificial intelligence", "virtual reality", "nanotech",
                     "dimensional", "clone", "satellite", "orbital", "genetic",
                     "espace", "extra-terrestre", "robot", "cyber", "futur", "vaisseau",
                     "intelligence artificielle", "réalité virtuelle", "clone",
                     "spazio", "alieno", "robot", "cibernetico", "futuro", "astronave",
                     "intelligenza artificiale", "realtà virtuale", "clone"],
        "tech_label": "futuristic",
        "description": "A technologically advanced world among the stars or in a future society.",
    },
    "historical": {
        "keywords": ["century", "ancient", "medieval", "empire", "revolution", "war",
                     "treaty", "dynasty", "crown", "throne", "invasion", "colonial",
                     "renaissance", "archaeological", "roman", "greek", "egypt",
                     "siècle", "antique", "empire", "révolution", "guerre", "dynastie",
                     "couronne", "trône", "invasion", "renaissance",
                     "secolo", "antico", "medievale", "impero", "rivoluzione", "guerra",
                     "dinastia", "corona", "trono", "invasione", "rinascimento"],
        "tech_label": "period_appropriate",
        "description": "A world rooted in a specific historical era.",
    },
    "post_apocalyptic": {
        "keywords": ["apocalypse", "post-apocalyptic", "wasteland", "survivor", "ruins",
                     "collapsed", "fallout", "radiation", "scavenge", "quarantine",
                     "abandoned", "decay", "faction", "survival",
                     "apocalypse", "ruines", "survivant", "effondré", "radiation", "abandonné",
                     "décombres", "survie", "désolation",
                     "apocalisse", "rovine", "sopravvissuto", "crollato", "radiazione",
                     "abbandonato", "sopravvivenza", "desolazione"],
        "tech_label": "ruined_modern",
        "description": "A world recovering from a civilization-ending catastrophe.",
    },
    "mythological": {
        "keywords": ["god", "goddess", "myth", "legend", "divine", "prophecy", "immortal",
                     "underworld", "heaven", "hell", "demon", "angel", "sacred",
                     "ritual", "temple", "altar", "pantheon",
                     "dieu", "déesse", "mythe", "légende", "divin", "prophétie", "immortel",
                     "enfer", "paradis", "démon", "ange", "temple", "sacré",
                     "dio", "dea", "mito", "leggenda", "divino", "profezia", "immortale",
                     "inferno", "paradiso", "demone", "angelo", "tempio", "sacro"],
        "tech_label": "ancient",
        "description": "A world shaped by gods, myths, and divine forces.",
    },
    "contemporary": {
        "keywords": ["modern", "city", "apartment", "office", "police", "hospital",
                     "school", "university", "car", "phone", "internet", "computer",
                     "subway", "airport", "hotel", "suburb",
                     "moderne", "ville", "appartement", "bureau", "police", "hôpital",
                     "école", "université", "voiture", "téléphone", "internet", "ordinateur",
                     "moderno", "città", "appartamento", "ufficio", "polizia", "ospedale",
                     "scuola", "università", "macchina", "telefono", "internet", "computer"],
        "tech_label": "modern",
        "description": "A world much like our own present-day reality.",
    },
}

GEOGRAPHY_KEYWORDS = {
    "forest": ["forest", "woods", "jungle", "timber", "forêt", "bois", "jungle", "foresta", "bosco"],
    "mountain": ["mountain", "peak", "cliff", "ridge", "highlands", "montagne", "pic", "falaise", "montagna", "vetta", "scogliera"],
    "ocean": ["ocean", "sea", "underwater", "coast", "beach", "harbor", "océan", "mer", "côte", "plage", "oceano", "mare", "costa", "spiaggia"],
    "desert": ["desert", "dune", "oasis", "arid", "désert", "dune", "oasis", "deserto"],
    "river": ["river", "lake", "stream", "creek", "waterfall", "rivière", "lac", "ruisseau", "cascade", "fiume", "lago", "ruscello", "cascata"],
    "city": ["city", "town", "village", "metropolis", "urban", "ville", "village", "métropole", "città", "paese", "villaggio", "metropoli"],
    "plains": ["plain", "prairie", "savanna", "field", "grassland", "plaine", "champ", "prairie", "pianura", "campo", "prateria"],
    "island": ["island", "isle", "archipelago", "île", "archipel", "isola", "arcipelago"],
    "cave": ["cave", "cavern", "underground", "subterranean", "grotte", "caverne", "souterrain", "grotta", "caverna", "sotterraneo"],
    "ruins": ["ruins", "ruined", "abandoned city", "ancient structure", "ruines", "ruiné", "cité abandonnée", "rovine", "rovinato", "città abbandonata"],
    "arctic": ["ice", "snow", "tundra", "frozen", "glacier", "arctic", "glace", "neige", "toundra", "gelé", "glacier", "ghiaccio", "neve", "tundra", "gelato", "artico"],
    "swamp": ["swamp", "marsh", "bog", "fen", "marais", "tourbière", "palude", "pantano"],
}

ATMOSPHERE_KEYWORDS = {
    "dark": ["dark", "grim", "shadow", "haunted", "sinister", "gloomy", "bleak",
             "sombre", "sinistre", "hanté", "ténébreux", "lugubre",
             "oscuro", "sinitro", "infestato", "tetro", "lugubre"],
    "hopeful": ["hope", "bright", "light", "peace", "beautiful", "harmony", "utopia",
                "espoir", "lumière", "paix", "beau", "harmonie",
                "speranza", "luce", "pace", "bello", "armonia"],
    "mysterious": ["mystery", "strange", "unexplained", "enigmatic", "unknown", "weird",
                   "mystère", "étrange", "inexpliqué", "énigmatique", "inconnu",
                   "mistero", "strano", "inspiegato", "enigmatico", "sconosciuto"],
    "oppressive": ["oppression", "tyranny", "dictator", "fear", "control", "surveillance",
                   "oppression", "tyrannie", "dictateur", "peur", "contrôle",
                   "oppressione", "tirannia", "dittatore", "paura", "controllo"],
    "tranquil": ["tranquil", "calm", "peaceful", "serene", "quiet", "gentle",
                 "tranquille", "calme", "paisible", "serein", "doux",
                 "tranquillo", "calmo", "pacifico", "sereno", "dolce"],
    "chaotic": ["chaos", "turbulent", "unstable", "wild", "unpredictable", "frenzy",
                "chaos", "turbulent", "instable", "sauvage", "imprévisible",
                "caos", "turbulento", "instabile", "selvaggio", "imprevedibile"],
}

MAGIC_KEYWORDS = {
    "inherent": ["innate magic", "born with", "natural ability", "bloodline", "inherited",
                 "magie innée", "né avec", "don naturel", "lignée", "hérité",
                 "magia innata", "nato con", "dono naturale", "lignaggio", "ereditato"],
    "learned": ["study", "spellbook", "apprentice", "academy", "wizardry", "taught",
                "étude", "grimoire", "apprenti", "académie", "sorcellerie", "enseigné",
                "studio", "libro di incantesimi", "apprendista", "accademia", "stregoneria", "insegnato"],
    "artifact": ["artifact", "relic", "enchanted item", "cursed object", "magical weapon",
                 "artefact", "relique", "objet enchanté", "objet maudit", "arme magique",
                 "artefatto", "reliquia", "oggetto incantato", "oggetto maledetto", "arma magica"],
    "ritual": ["ritual", "sacrifice", "ceremony", "incantation", "summoning",
              "rituel", "sacrifice", "cérémonie", "incantation", "invocation",
              "rituale", "sacrificio", "cerimonia", "incantazione", "evocazione"],
    "elemental": ["elemental", "fire magic", "water magic", "nature magic", "storm",
                  "élémentaire", "magie de feu", "magie d'eau", "magie de la nature", "tempête",
                  "elementale", "magia del fuoco", "magia dell'acqua", "magia della natura", "tempesta"],
}


def _classify_setting(text: str) -> dict:
    text_lower = text.lower()
    best_type = "contemporary"
    best_score = 0

    for s_type, config in SETTING_TYPES.items():
        count = sum(1 for kw in config["keywords"] if kw in text_lower)
        if count > best_score:
            best_score = count
            best_type = s_type

    cfg = SETTING_TYPES[best_type]
    return {
        "type": best_type,
        "label": best_type.replace("_", " ").title(),
        "tech_level": cfg["tech_label"],
        "description": cfg["description"],
        "confidence": min(best_score / 3 * 100, 100),
    }


def _extract_geography(text: str) -> list[dict]:
    text_lower = text.lower()
    found = []
    for geo, keywords in GEOGRAPHY_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            found.append({"name": geo.title(), "type": geo, "mentions": count})
    found.sort(key=lambda x: x["mentions"], reverse=True)
    return found[:5]


def _detect_atmosphere(text: str) -> list[dict]:
    text_lower = text.lower()
    found = []
    for mood, keywords in ATMOSPHERE_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            found.append({"mood": mood, "label": mood.title(), "matches": count})
    found.sort(key=lambda x: x["matches"], reverse=True)
    return found[:3]


def _detect_magic(text: str) -> dict:
    text_lower = text.lower()
    magic_systems = []
    for system, keywords in MAGIC_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            magic_systems.append({"system": system, "label": system.title(), "matches": count})

    has_magic = bool(magic_systems) or any(kw in text_lower for kw in
        ["magic", "spell", "sorcery", "wizard", "witch", "supernatural", "occult"])
    magic_systems.sort(key=lambda x: x["matches"], reverse=True)

    return {
        "has_magic": has_magic or len(magic_systems) > 0,
        "systems": magic_systems[:3],
        "power_level": "high" if has_magic and len(magic_systems) > 1 else "low" if has_magic else "none",
    }


def _extract_factions(text: str) -> list[dict]:
    text_lower = text.lower()
    faction_markers = [
        "kingdom", "empire", "republic", "clan", "tribe", "guild", "order",
        "faction", "alliance", "council", "brotherhood", "sisterhood", "cult",
        "army", "nation", "federation", "colony", "settlement",
        "royaume", "empire", "république", "clan", "tribu", "guilde", "ordre",
        "faction", "alliance", "conseil", "confrérie", "culte", "armée", "nation",
        "regno", "impero", "repubblica", "clan", "tribù", "gilda", "ordine",
        "fazione", "alleanza", "consiglio", "confraternita", "culto", "esercito", "nazione",
    ]
    found = []
    for marker in faction_markers:
        if marker in text_lower:
            idx = text_lower.find(marker)
            start = max(0, idx - 30)
            end = min(len(text), idx + len(marker) + 30)
            snippet = text[start:end]
            words = re.findall(r"[A-Z][a-z]+", snippet)
            name_candidates = [w for w in words if len(w) > 2][:2]
            faction_name = " ".join(name_candidates) + " " + marker.title() if name_candidates else marker.title()
            found.append({
                "name": faction_name,
                "type": marker,
                "alignment": "neutral",
            })
    return found[:4]


def _generate_world_rules(setting_type: str, has_magic: bool, geography: list) -> list[str]:
    rules = []
    type_rules = {
        "fantasy": [
            "Magic exists but requires training or innate talent",
            "Medieval technology with no gunpowder",
            "Mythical creatures coexist with humans",
        ],
        "scifi": [
            "Technology has surpassed biological limitations",
            "Interstellar travel is possible through controlled means",
            "Artificial intelligence exists and may have rights",
        ],
        "historical": [
            "Technology matches the historical period",
            "Social structures reflect the era",
            "No anachronistic knowledge or capabilities",
        ],
        "post_apocalyptic": [
            "Technology is scarce and often non-functional",
            "Resources are limited and contested",
            "Survival depends on community or isolation",
        ],
        "mythological": [
            "Gods or divine beings directly influence the world",
            "Prophecies and omens shape events",
            "Sacred places hold real power",
        ],
        "contemporary": [
            "The world operates under known physical laws",
            "Society follows modern rules and norms",
            "Technology is available but not supernatural",
        ],
    }

    rules = type_rules.get(setting_type, type_rules["contemporary"])[:]

    if has_magic:
        rules.append("Magic has a cost — physical, emotional, or material")

    if geography:
        geo_names = [g["name"] for g in geography[:2]]
        rules.append(f"The world is shaped by {', '.join(geo_names).lower()}")

    return rules


class WorldBuilder(BaseAgent):
    name = "world_builder"
    description = "Builds world settings, geography, atmosphere, and lore from seeds"

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

        return AgentResult(success=True, message=f"Built worlds for {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str) -> Optional[dict]:
        setting = _classify_setting(text)
        geography = _extract_geography(text)
        atmosphere = _detect_atmosphere(text)
        magic = _detect_magic(text)
        factions = _extract_factions(text)
        rules = _generate_world_rules(setting["type"], magic["has_magic"], geography)

        return {
            "title": title,
            "setting": setting,
            "geography": geography,
            "atmosphere": atmosphere,
            "magic": magic,
            "factions": factions,
            "world_rules": rules,
        }
