import logging
import random
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute
from app.cache import get_seed_enrichments

logger = logging.getLogger(__name__)

BLURB_TEMPLATES_EN = {
    "hook": {
        "label": "Hook",
        "length": "short",
        "template": "When {protagonist} {inciting_incident}, they must {goal} — or {stake}.",
    },
    "mystery": {
        "label": "Mystery",
        "length": "medium",
        "template": "Something {mystery_element} is happening in {setting}. {protagonist} thought they knew the truth — until {twist}. Now they must {goal} before it's too late.",
    },
    "epic": {
        "label": "Epic",
        "length": "long",
        "template": "In a world of {world_description}, {protagonist} embarks on a journey that will change everything. With {ally} at their side and {antagonist} in their path, they must {goal}. The fate of {setting} depends on it.",
    },
    "character": {
        "label": "Character-driven",
        "length": "medium",
        "template": "{protagonist} never asked to be a hero. But when {inciting_incident}, they discover {inner_truth}. Now they must choose between {choice_a} and {choice_b} — and the choice will define who they really are.",
    },
    "atmospheric": {
        "label": "Atmospheric",
        "length": "medium",
        "template": "The {setting} holds secrets that {protagonist} can't ignore. In a {mood} tale of {theme}, every shadow hides a truth. {protagonist} will need {quality} to survive what comes next.",
    },
}

BLURB_TEMPLATES_FR = {
    "hook": {
        "label": "Accroche",
        "length": "short",
        "template": "Quand {protagonist} {inciting_incident}, il doit {goal} — ou {stake}.",
    },
    "mystery": {
        "label": "Mystère",
        "length": "medium",
        "template": "Quelque chose de {mystery_element} se passe dans {setting}. {protagonist} croyait connaître la vérité — jusqu'à {twist}. Maintenant, il doit {goal} avant qu'il ne soit trop tard.",
    },
    "epic": {
        "label": "Épique",
        "length": "long",
        "template": "Dans un monde de {world_description}, {protagonist} entreprend un voyage qui changera tout. Avec {ally} à ses côtés et {antagonist} sur son chemin, il doit {goal}. Le destin de {setting} en dépend.",
    },
    "character": {
        "label": "Personnage",
        "length": "medium",
        "template": "{protagonist} n'a jamais demandé à être un héros. Mais quand {inciting_incident}, il découvre {inner_truth}. Maintenant, il doit choisir entre {choice_a} et {choice_b} — et ce choix le définira.",
    },
    "atmospheric": {
        "label": "Atmosphérique",
        "length": "medium",
        "template": "Le {setting} garde des secrets que {protagonist} ne peut ignorer. Dans un récit {mood} de {theme}, chaque ombre cache une vérité. {protagonist} aura besoin de {quality} pour survivre.",
    },
}

BLURB_TEMPLATES_IT = {
    "hook": {
        "label": "Hook",
        "length": "short",
        "template": "Quando {protagonist} {inciting_incident}, deve {goal} — o {stake}.",
    },
    "mystery": {
        "label": "Mistero",
        "length": "medium",
        "template": "Qualcosa di {mystery_element} sta accadendo a {setting}. {protagonist} pensava di conoscere la verità — fino a {twist}. Ora deve {goal} prima che sia troppo tardi.",
    },
    "epic": {
        "label": "Epico",
        "length": "long",
        "template": "In un mondo di {world_description}, {protagonist} intraprende un viaggio che cambierà tutto. Con {ally} al suo fianco e {antagonist} sulla sua strada, deve {goal}. Il destino di {setting} dipende da questo.",
    },
    "character": {
        "label": "Personaggio",
        "length": "medium",
        "template": "{protagonist} non ha mai chiesto di essere un eroe. Ma quando {inciting_incident}, scopre {inner_truth}. Ora deve scegliere tra {choice_a} e {choice_b} — e la scelta lo definirà.",
    },
    "atmospheric": {
        "label": "Atmosferico",
        "length": "medium",
        "template": "Il {setting} custodisce segreti che {protagonist} non può ignorare. In un racconto {mood} di {theme}, ogni ombra nasconde una verità. {protagonist} avrà bisogno di {quality} per sopravvivere.",
    },
}

BLURB_TEMPLATES = {"en": BLURB_TEMPLATES_EN, "fr": BLURB_TEMPLATES_FR, "it": BLURB_TEMPLATES_IT}

FILLER_OPTIONS_EN = {
    "inciting_incident": [
        "discovers a dark secret",
        "receives a mysterious letter",
        "witnesses something they shouldn't",
        "finds an ancient artifact",
        "meets a stranger with a warning",
    ],
    "goal": [
        "uncover the truth",
        "survive against all odds",
        "protect the ones they love",
        "find their way home",
        "break the cycle",
    ],
    "stake": [
        "everything they love will be lost",
        "the world will never be the same",
        "darkness will prevail forever",
        "innocent lives will be sacrificed",
        "hope itself will die",
    ],
    "mystery_element": ["strange", "unexplained", "terrifying", "impossible", "unsettling"],
    "twist": [
        "the enemy is closer than they think",
        "nothing is what it seems",
        "the past holds the key",
        "the real danger has yet to arrive",
    ],
    "world_description": [
        "ancient magic and forgotten prophecies",
        "advanced technology and moral decay",
        "whispered secrets and hidden agendas",
        "beautiful landscapes and dark histories",
    ],
    "inner_truth": [
        "a hidden strength they never knew",
        "a painful truth about their past",
        "an unexpected power within",
        "the courage they thought they lacked",
    ],
    "choice_a": ["safety and silence", "following the rules", "running away", "staying hidden"],
    "choice_b": ["danger and truth", "breaking the rules", "standing their ground", "stepping into the light"],
    "theme": ["discovery and loss", "love and sacrifice", "power and corruption", "identity and purpose"],
    "quality": ["courage", "cunning", "compassion", "resilience"],
}

FILLER_OPTIONS_FR = {
    "inciting_incident": [
        "découvre un sombre secret",
        "reçoit une lettre mystérieuse",
        "est témoin de quelque chose d'inattendu",
        "trouve un artefact ancien",
        "rencontre un étranger porteur d'un avertissement",
    ],
    "goal": [
        "découvrir la vérité",
        "survivre contre toute attente",
        "protéger ceux qu'il aime",
        "retrouver son chemin",
        "briser le cycle",
    ],
    "stake": [
        "tout ce qu'il aime sera perdu",
        "le monde ne sera plus jamais le même",
        "les ténèbres régneront pour toujours",
        "des vies innocentes seront sacrifiées",
        "l'espoir lui-même mourra",
    ],
    "mystery_element": ["étrange", "inexpliqué", "terrifiant", "impossible", "troublant"],
    "twist": [
        "l'ennemi est plus proche qu'il ne le pense",
        "rien n'est ce qu'il semble",
        "le passé détient la clé",
        "le vrai danger n'est pas encore arrivé",
    ],
    "world_description": [
        "magie ancienne et prophéties oubliées",
        "technologie avancée et décadence morale",
        "secrets murmurés et agendas cachés",
        "paysages magnifiques et histoires sombres",
    ],
    "inner_truth": [
        "une force cachée qu'il ignorait",
        "une vérité douloureuse sur son passé",
        "un pouvoir inattendu en lui",
        "le courage qu'il pensait ne pas avoir",
    ],
    "choice_a": ["sécurité et silence", "suivre les règles", "fuir", "rester caché"],
    "choice_b": ["danger et vérité", "enfreindre les règles", "tenir bon", "avancer vers la lumière"],
    "theme": ["découverte et perte", "amour et sacrifice", "pouvoir et corruption", "identité et destin"],
    "quality": ["courage", "ruse", "compassion", "résilience"],
}

FILLER_OPTIONS_IT = {
    "inciting_incident": [
        "scopre un oscuro segreto",
        "riceve una lettera misteriosa",
        "assiste a qualcosa che non dovrebbe",
        "trova un antico artefatto",
        "incontra uno sconosciuto con un avvertimento",
    ],
    "goal": [
        "scoprire la verità",
        "sopravvivere contro ogni probabilità",
        "proteggere le persone che ama",
        "trovare la strada di casa",
        "spezzare il ciclo",
    ],
    "stake": [
        "tutto ciò che ama sarà perduto",
        "il mondo non sarà più lo stesso",
        "l'oscurità prevarrà per sempre",
        "vite innocenti saranno sacrificate",
        "la speranza stessa morirà",
    ],
    "mystery_element": ["strano", "inspiegabile", "terrificante", "impossibile", "inquietante"],
    "twist": [
        "il nemico è più vicino di quanto pensi",
        "niente è come sembra",
        "il passato custodisce la chiave",
        "il vero pericolo deve ancora arrivare",
    ],
    "world_description": [
        "magia antica e profezie dimenticate",
        "tecnologia avanzata e decadenza morale",
        "segreti sussurrati e agenda nascoste",
        "paesaggi meravigliosi e storie oscure",
    ],
    "inner_truth": [
        "una forza nascosta che non conosceva",
        "una verità dolorosa sul suo passato",
        "un potere inaspettato dentro di sé",
        "il coraggio che pensava di non avere",
    ],
    "choice_a": ["sicurezza e silenzio", "seguire le regole", "fuggire", "restare nascosto"],
    "choice_b": ["pericolo e verità", "infrangere le regole", "resistere", "avanzare verso la luce"],
    "theme": ["scoperta e perdita", "amore e sacrificio", "potere e corruzione", "identità e destino"],
    "quality": ["coraggio", "astuzia", "compassione", "resilienza"],
}

FILLER_OPTIONS = {"en": FILLER_OPTIONS_EN, "fr": FILLER_OPTIONS_FR, "it": FILLER_OPTIONS_IT}


def _extract_protagonist_from_text(text: str) -> str:
    import re
    words = re.findall(r"[A-Z][a-z]+", text)
    proper = [w for w in set(words) if len(w) > 2 and w.lower() not in {
        "the", "this", "that", "what", "when", "where", "which", "there",
        "they", "them", "their", "have", "will", "would", "could", "should",
        "with", "from", "about", "after", "before", "during", "without",
        "although", "because", "through",
    }]
    return proper[0] if proper else "our protagonist"


def _extract_setting_from_text(text: str, language: str = "en") -> str:
    text_lower = text.lower()
    settings = {
        "en": ["forest", "city", "mountain", "ocean", "desert", "island", "castle",
               "village", "planet", "space", "kingdom", "world", "town"],
        "fr": ["forêt", "ville", "montagne", "océan", "désert", "île", "château",
               "village", "planète", "espace", "royaume", "monde"],
        "it": ["foresta", "città", "montagna", "oceano", "deserto", "isola", "castello",
               "villaggio", "pianeta", "spazio", "regno", "mondo"],
    }
    lang = language if language in settings else "en"
    found = [s for s in settings[lang] if s in text_lower]
    fallbacks = {"en": "an unfamiliar world", "fr": "un monde inconnu", "it": "un mondo sconosciuto"}
    return found[0].title() if found else fallbacks[lang]


def _generate_blurb(template_name: str, template: str, fillers: dict, language: str = "en") -> dict:
    lang = language if language in BLURB_TEMPLATES else "en"
    blurb = template.format(**fillers)
    return {
        "style": template_name,
        "label": BLURB_TEMPLATES[lang][template_name]["label"],
        "length": BLURB_TEMPLATES[lang][template_name]["length"],
        "blurb": blurb,
        "word_count": len(blurb.split()),
    }


class BlurbGenerator(BaseAgent):
    name = "blurb_generator"
    description = "Generates multiple blurb variants from seeds and their enrichments"

    def execute(self) -> AgentResult:
        seeds = execute(
            "SELECT id, raw_text, title, language FROM seeds ORDER BY discovered_at ASC LIMIT 10",
            fetch=True,
        )
        enriched = 0
        for row in seeds:
            seed_id, raw_text, title, language = row[:4]
            if self._already_enriched(seed_id):
                continue
            enrichments = self._fetch_enrichments(seed_id)
            result = self._analyze(raw_text, title, enrichments, language)
            if result:
                self._save_enrichment(seed_id, self.name, result)
                enriched += 1

        return AgentResult(success=True, message=f"Generated blurbs for {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str, enrichments: dict, language: str = "en") -> Optional[dict]:
        lang = language if language in BLURB_TEMPLATES else "en"
        protagonist = _extract_protagonist_from_text(text)
        setting = _extract_setting_from_text(text, language)
        templates = BLURB_TEMPLATES[lang]
        fillers_opts = FILLER_OPTIONS[lang]

        antagonist = ""
        characters = [protagonist]
        mood = "mysterious"

        if "angle_finder" in enrichments:
            af = enrichments["angle_finder"]
            if af.get("protagonists"):
                characters = af["protagonists"]
                protagonist = characters[0]
            if af.get("settings"):
                setting = af["settings"][0]

        if "genre_classifier" in enrichments:
            gc = enrichments["genre_classifier"]
            genre = gc.get("primary_genre", "drama")
        else:
            genre = "drama"

        if "world_builder" in enrichments:
            wb = enrichments["world_builder"]
            if wb.get("atmosphere") and len(wb["atmosphere"]) > 0:
                mood = wb["atmosphere"][0].get("mood", mood)
            if wb.get("factions") and len(wb["factions"]) > 0:
                antagonist = wb["factions"][-1].get("name", "")

        if "character_harvester" in enrichments:
            ch = enrichments["character_harvester"]
            if ch.get("characters"):
                chars = ch["characters"]
                for c in chars:
                    if c.get("name") and c["name"] not in characters:
                        characters.append(c["name"])
                if chars and chars[0].get("name"):
                    protagonist = chars[0]["name"]

        if "voice_tuner" in enrichments:
            vt = enrichments["voice_tuner"]
            if vt.get("mood") and len(vt["mood"]) > 0:
                mood = vt["mood"][0].get("mood", mood)

        fallback_enemy = {"en": "an unknown enemy", "fr": "un ennemi inconnu", "it": "un nemico sconosciuto"}
        fallback_world = {"en": "an unfamiliar world", "fr": "un monde inconnu", "it": "un mondo sconosciuto"}
        fallback_ally = {"en": "an unlikely companion", "fr": "un compagnon improbable", "it": "un compagno improbabile"}

        fillers = {
            "protagonist": protagonist,
            "antagonist": antagonist or fallback_enemy[lang],
            "setting": setting or fallback_world[lang],
            "mood": mood or "mysterious",
            "ally": characters[1] if len(characters) > 1 else fallback_ally[lang],
        }
        for key, options in fillers_opts.items():
            fillers[key] = random.choice(options)

        variants = []
        for t_name, t_config in templates.items():
            variant = _generate_blurb(t_name, t_config["template"], fillers, language)
            variants.append(variant)

        best_for = (
            random.choice(["hook", "mystery", "character"])
            if genre == "mystery"
            else random.choice(["epic", "character", "atmospheric"])
            if genre in ("fantasy", "scifi")
            else random.choice(["hook", "mystery", "atmospheric"])
        )

        return {
            "title": title,
            "genre": genre,
            "language": lang,
            "protagonist": protagonist,
            "variants": variants,
            "total_variants": len(variants),
            "best_for": best_for,
        }
