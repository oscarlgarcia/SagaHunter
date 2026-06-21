import logging
import re
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

POV_PATTERNS = {
    "first_person": {
        "pronouns": ["i ", "i'm", "i've", "i'll", "i'd", "me ", "my ", "myself", "we ", "us ", "our"],
        "label": "First Person",
        "description": "Narrated by a character within the story using 'I' and 'we'.",
    },
    "second_person": {
        "pronouns": ["you ", "your", "yourself", "yours"],
        "label": "Second Person",
        "description": "The reader is addressed directly as 'you', placing them in the story.",
    },
    "third_person_limited": {
        "pronouns": ["he ", "she ", "they ", "him ", "her ", "his ", "hers", "theirs", "them"],
        "label": "Third Person Limited",
        "description": "Follows one character's perspective using 'he', 'she', or 'they'.",
    },
    "third_person_omniscient": {
        "pronouns": ["all knew", "everyone", "none knew", "meanwhile", "unbeknownst"],
        "label": "Third Person Omniscient",
        "description": "An all-knowing narrator who sees every character's thoughts and feelings.",
    },
}

REGISTER_MARKERS = {
    "formal": {
        "keywords": ["thus", "therefore", "however", "nevertheless", "consequently",
                     "furthermore", "moreover", "regarding", "commence", "endeavor",
                     "utilize", "acknowledge", "hereby", "therein"],
        "label": "Formal",
    },
    "colloquial": {
        "keywords": ["gonna", "wanna", "kinda", "sorta", "ain't", "yeah", "nah",
                     "gotta", "dunno", "c'mon", "cool", "awesome", "hey"],
        "label": "Colloquial / Informal",
    },
    "poetic": {
        "keywords": ["like", "as though", "shadow", "light", "whisper", "silence",
                     "eternal", "infinite", "fade", "gleam", "shimmer", "crimson",
                     "golden", "velvet", "crystal"],
        "label": "Poetic / Lyrical",
    },
    "academic": {
        "keywords": ["study", "research", "analysis", "hypothesis", "data", "evidence",
                     "conclude", "significant", "correlation", "methodology", "theoretical"],
        "label": "Academic / Analytical",
    },
    "pulp": {
        "keywords": ["suddenly", "without warning", "explosion", "blazing", "thunderous",
                     "colossal", "terrifying", "incredible", "amazing", "shocking"],
        "label": "Pulp / Dramatic",
    },
    "minimalist": {
        "keywords": ["he said", "she said", "went", "came", "left", "saw", "knew",
                     "thought", "walked", "ran", "sat", "stood", "looked"],
        "label": "Minimalist / Sparse",
    },
}

TENSE_PATTERNS = {
    "past": {
        "markers": ["was", "were", "had", "did", "said", "went", "came", "looked",
                    "walked", "ran", "thought", "knew", "felt", "saw", "heard"],
        "label": "Past Tense",
    },
    "present": {
        "markers": ["is", "are", "has", "does", "says", "goes", "comes", "looks",
                    "walks", "runs", "thinks", "knows", "feels", "sees", "hears"],
        "label": "Present Tense",
    },
}

PACING_KEYWORDS = {
    "fast": {
        "keywords": ["suddenly", "instantly", "immediately", "without warning", "crash",
                     "explosion", "chase", "rushed", "frantically", "desperately", "racing"],
        "weight": 2,
    },
    "slow": {
        "keywords": ["slowly", "gently", "gradually", "quietly", "peacefully", "patiently",
                     "carefully", "deliberately", "leisurely", "languid", "drifting"],
        "weight": 2,
    },
}

MOOD_KEYWORDS = {
    "melancholic": ["melancholy", "sad", "grief", "loss", "tears", "mourning", "somber",
                    "triste", "chagrin", "pleurs", "deuil", "mélancolie", "regret", "solitude",
                    "triste", "lutto", "pianto", "dolore", "malinconia", "lacrime", "rimpianto"],
    "suspenseful": ["suspense", "tension", "dread", "creeping", "ominous", "foreboding",
                    "tension", "angoisse", "inquiétant", "menaçant", "sinistre", "mystère",
                    "tensione", "angoscia", "inquietante", "minaccioso", "sinistro", "mistero"],
    "hopeful": ["hope", "optimism", "bright", "future", "possibility", "dream",
                "espoir", "optimisme", "avenir", "rêve", "lumineux", "possible", "promesse",
                "speranza", "ottimismo", "futuro", "sogno", "luminoso", "possibile", "promessa"],
    "dark": ["dark", "grim", "bleak", "despair", "hopeless", "shadow", "nightmare",
             "sombre", "ténébreux", "désespoir", "ombre", "cauchemar", "horreur",
             "oscuro", "cupo", "tetro", "disperazione", "ombra", "incubo", "orrore", "terribile", "buio"],
    "whimsical": ["whimsical", "playful", "curious", "wonder", "delight", "charming",
                  "fantaisie", "ludique", "merveilleux", "charmant", "curieux", "féerique",
                  "fantasia", "giocoso", "meraviglia", "incantevole", "curioso", "fiabesco"],
    "tense": ["tense", "anxious", "nervous", "urgent", "desperate", "frantic",
              "tendu", "anxieux", "nerveux", "urgent", "désespéré", "frénétique", "panique", "cri",
              "teso", "ansioso", "nervoso", "urgente", "disperato", "frenetico", "panico", "grido", "urlo", "paura"],
}

def _detect_pov(text: str) -> dict:
    text_lower = text.lower()
    scores = {}
    for pov, config in POV_PATTERNS.items():
        count = sum(1 for p in config["pronouns"] if p in text_lower)
        scores[pov] = count

    best = max(scores, key=scores.get)
    best_score = scores[best]
    if best_score == 0:
        return {"pov": "unknown", "label": "Unknown", "description": "Narrative voice could not be determined.", "confidence": 0}

    total = sum(scores.values())
    return {
        "pov": best,
        "label": POV_PATTERNS[best]["label"],
        "description": POV_PATTERNS[best]["description"],
        "confidence": min(int(best_score / total * 100) if total > 0 else 0, 100),
    }


def _detect_register(text: str) -> list[dict]:
    text_lower = text.lower()
    results = []
    for reg, config in REGISTER_MARKERS.items():
        count = sum(1 for kw in config["keywords"] if kw in text_lower)
        if count > 0:
            results.append({"register": reg, "label": config["label"], "matches": count})
    results.sort(key=lambda x: x["matches"], reverse=True)
    return results[:3]


def _detect_tense(text: str) -> dict:
    text_lower = text.lower()
    scores = {}
    for tense, config in TENSE_PATTERNS.items():
        count = sum(1 for m in config["markers"] if m in text_lower)
        scores[tense] = count
    best = max(scores, key=scores.get)
    return {"tense": best, "label": TENSE_PATTERNS[best]["label"]}


def _detect_pacing(text: str) -> dict:
    text_lower = text.lower()
    fast = sum(1 for kw in PACING_KEYWORDS["fast"]["keywords"] if kw in text_lower) * PACING_KEYWORDS["fast"]["weight"]
    slow = sum(1 for kw in PACING_KEYWORDS["slow"]["keywords"] if kw in text_lower) * PACING_KEYWORDS["slow"]["weight"]

    diff = fast - slow
    if diff >= 3:
        return {"pacing": "fast", "label": "Fast-paced", "description": "Action-driven with quick scene changes and urgent language."}
    elif diff <= -2:
        return {"pacing": "slow", "label": "Slow-paced", "description": "Reflective and deliberate with detailed descriptions."}
    else:
        return {"pacing": "moderate", "label": "Moderate", "description": "Balanced pacing with varied rhythm."}


def _detect_mood(text: str) -> list[dict]:
    text_lower = text.lower()
    results = []
    for mood, keywords in MOOD_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            results.append({"mood": mood, "label": mood.title(), "matches": count})
    results.sort(key=lambda x: x["matches"], reverse=True)
    return results[:3]


def _estimate_readability(text: str) -> dict:
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]

    avg_words_per_sentence = len(words) / len(sentences) if sentences else 0
    long_words = sum(1 for w in words if len(w) > 6)

    if avg_words_per_sentence < 12:
        level = "easy"
    elif avg_words_per_sentence < 20:
        level = "moderate"
    else:
        level = "complex"

    return {
        "level": level,
        "avg_sentence_length": round(avg_words_per_sentence, 1),
        "long_word_ratio": round(long_words / len(words) * 100, 1) if words else 0,
    }


def _generate_style_examples(pov: str, register: str, tense: str, text: str) -> list[dict]:
    text_lower = text.lower()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip().split()) > 5]

    original_sample = sentences[0][:100] + "..." if sentences else text[:100] + "..."

    alternatives = []

    if pov != "first_person":
        alternatives.append({
            "style": "First Person",
            "example": f"I {original_sample[0].lower() + original_sample[1:] if original_sample else ''}",
            "note": "Creates intimacy and immediacy.",
        })
    if pov != "third_person_omniscient":
        alternatives.append({
            "style": "Third Person Omniscient",
            "example": f"Little did anyone know, {original_sample[0].lower() + original_sample[1:] if original_sample else ''}",
            "note": "Offers god-like perspective on all characters.",
        })

    if register != "poetic":
        alternatives.append({
            "style": "Poetic",
            "example": f"The air itself seemed to hold its breath as {original_sample[0].lower() + original_sample[1:] if original_sample else ''}",
            "note": "Adds lyrical and sensory depth.",
        })

    if register != "pulp":
        alternatives.append({
            "style": "Pulp",
            "example": f"Suddenly, without warning, {original_sample[0].lower() + original_sample[1:] if original_sample else ''}",
            "note": "Amplifies drama and urgency.",
        })

    return {
        "original_style": {
            "pov": pov,
            "register": register,
            "tense": tense,
            "sample": original_sample,
        },
        "alternatives": alternatives[:3],
    }


class VoiceToneTuner(BaseAgent):
    name = "voice_tuner"
    description = "Analyzes narrative voice, POV, register, pacing, and mood from seeds"

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

        return AgentResult(success=True, message=f"Tuned voice for {enriched} seeds", seeds_created=0)

    def _analyze(self, text: str, title: str) -> Optional[dict]:
        pov = _detect_pov(text)
        registers = _detect_register(text)
        tense = _detect_tense(text)
        pacing = _detect_pacing(text)
        mood = _detect_mood(text)
        readability = _estimate_readability(text)

        primary_register = registers[0]["label"] if registers else "Neutral"
        style_examples = _generate_style_examples(pov["pov"], primary_register.lower(), tense["tense"], text)

        return {
            "title": title,
            "narrative_voice": {
                "pov": pov,
                "primary_register": primary_register,
                "registers_detected": registers,
                "tense": tense,
            },
            "pacing": pacing,
            "mood": mood,
            "readability": readability,
            "style_examples": style_examples,
        }
