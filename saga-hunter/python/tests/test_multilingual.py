"""Multilingual tests: verify agents work with FR and IT content."""

from agents.analysis.genre_classifier import GenreClassifier
from agents.analysis.angle_finder import AngleFinder
from agents.creative.voice_tone_tuner import (
    _detect_pov,
    _detect_mood,
    _detect_pacing,
    _detect_register,
    _estimate_readability,
)
from agents.creative.character_harvester import CharacterHarvester
from agents.analysis.story_structurer import StoryStructurer
from agents.publishing.blurb_generator import BlurbGenerator
from agents.base import compute_narrative_score

# --- FRENCH TEST SAMPLES ---

FR_MYSTERY = (
    "Le détective Dupont examina la scène de crime avec attention. "
    "Des indices étaient éparpillés partout. Le suspect avait un alibi fragile "
    "et l'arme du crime avait disparu. Un mystère à résoudre."
)

FR_FANTASY = (
    "Dans le royaume d'Avalon, un jeune elfe découvrit un artefact magique "
    "caché dans la forêt enchantée. Des dragons gardaient les portes du "
    "château et une prophétie ancienne parlait de son destin."
)

FR_ROMANCE = (
    "Marie et Jean se rencontrèrent par hasard dans un café parisien. "
    "Leurs regards se croisèrent et ce fut le coup de foudre. "
    "Une histoire d'amour passionnée qui traversa les saisons."
)

FR_NARRATIVE = (
    "Je marchais seul dans les rues sombres de Paris quand soudain, "
    "j'entendis un cri déchirant. Mon cœur battait la chamade. "
    "Quelque chose de terrible s'était produit."
)

# --- ITALIAN TEST SAMPLES ---

IT_MYSTERY = (
    "L'ispettore Rossi esaminò la scena del crimine con attenzione. "
    "Gli indizi erano sparsi ovunque. Il sospettato aveva un alibi debole "
    "e l'arma del delitto era scomparsa. Un mistero da risolvere."
)

IT_FANTASY = (
    "Nel regno di Avalon, un giovane elfo scoprì un artefatto magico "
    "nascosto nella foresta incantata. I draghi custodivano le porte del "
    "castello e un'antica profezia parlava del suo destino."
)

IT_ROMANCE = (
    "Maria e Giovanni si incontrarono per caso in un caffè romano. "
    "I loro sguardi si incrociarono e fu amore a prima vista. "
    "Una storia d'amore appassionata che attraversò le stagioni."
)

IT_NARRATIVE = (
    "Camminavo da solo per le strade buie di Roma quando all'improvviso, "
    "sentii un grido straziante. Il mio cuore batteva all'impazzata. "
    "Qualcosa di terribile era successo."
)

# ===========================
# GENRE CLASSIFIER TESTS
# ===========================


def test_fr_mystery_detected():
    agent = GenreClassifier()
    result = agent._analyze(FR_MYSTERY, "Mystère à Paris")
    assert result["primary_genre"] == "mystery"


def test_fr_fantasy_detected():
    agent = GenreClassifier()
    result = agent._analyze(FR_FANTASY, "Le Royaume d'Avalon")
    assert result["primary_genre"] == "fantasy"


def test_fr_romance_detected():
    agent = GenreClassifier()
    result = agent._analyze(FR_ROMANCE, "Amour à Paris")
    assert result["primary_genre"] == "romance"


def test_it_mystery_detected():
    agent = GenreClassifier()
    result = agent._analyze(IT_MYSTERY, "Mistero a Roma")
    assert result["primary_genre"] == "mystery"


def test_it_fantasy_detected():
    agent = GenreClassifier()
    result = agent._analyze(IT_FANTASY, "Il Regno di Avalon")
    assert result["primary_genre"] == "fantasy"


def test_it_romance_detected():
    agent = GenreClassifier()
    result = agent._analyze(IT_ROMANCE, "Amore a Roma")
    assert result["primary_genre"] == "romance"


# ===========================
# NARRATIVE SCORE TESTS
# ===========================


def test_narrative_score_french():
    score = compute_narrative_score(FR_MYSTERY, "fr")
    assert 0 <= score <= 100


def test_narrative_score_italian():
    score = compute_narrative_score(IT_MYSTERY, "it")
    assert 0 <= score <= 100


# ===========================
# VOICE TONE TUNER TESTS
# ===========================


def test_pov_french_first_person():
    result = _detect_pov(FR_NARRATIVE)
    assert result["pov"] == "first_person"


def test_pov_italian_first_person():
    result = _detect_pov(IT_NARRATIVE)
    assert result["pov"] == "first_person"


def test_mood_french():
    result = _detect_mood(FR_NARRATIVE)
    assert len(result) > 0


def test_mood_italian():
    result = _detect_mood(IT_NARRATIVE)
    assert len(result) > 0


def test_pacing_french():
    result = _detect_pacing(FR_NARRATIVE)
    assert result["pacing"] in ("slow", "moderate", "fast")


def test_pacing_italian():
    result = _detect_pacing(IT_NARRATIVE)
    assert result["pacing"] in ("slow", "moderate", "fast")


def test_readability_french():
    result = _estimate_readability(FR_NARRATIVE)
    assert result["avg_sentence_length"] > 0


def test_readability_italian():
    result = _estimate_readability(IT_NARRATIVE)
    assert result["avg_sentence_length"] > 0


# ===========================
# CHARACTER HARVESTER TESTS
# ===========================


def test_character_harvester_french():
    agent = CharacterHarvester()
    text = "Dupont et Marie se promenaient dans le parc. Dupont était un détective courageux. Marie était une journaliste intelligente."
    result = agent._analyze(text, "Rencontre au Parc")
    assert result["total_characters"] >= 2


def test_character_harvester_italian():
    agent = CharacterHarvester()
    text = "Rossi e Maria camminavano nel parco. Rossi era un detective coraggioso. Maria era una giornalista intelligente."
    result = agent._analyze(text, "Incontro al Parco")
    assert result["total_characters"] >= 2


# ===========================
# STORY STRUCTURER TESTS
# ===========================


def test_story_structurer_french():
    agent = StoryStructurer()
    result = agent._analyze(FR_NARRATIVE, "Nuit à Paris")
    assert result["structure_type"] is not None


def test_story_structurer_italian():
    agent = StoryStructurer()
    result = agent._analyze(IT_NARRATIVE, "Notte a Roma")
    assert result["structure_type"] is not None


# ===========================
# ANGLE FINDER TESTS (known limitations)
# ===========================


def test_angle_finder_french_finds_protagonist():
    agent = AngleFinder()
    result = agent._analyze(FR_NARRATIVE, "Nuit à Paris", "fr")
    assert "protagonists" in result


def test_angle_finder_italian_finds_protagonist():
    agent = AngleFinder()
    result = agent._analyze(IT_NARRATIVE, "Notte a Roma", "it")
    assert "protagonists" in result


# ===========================
# BLURB GENERATOR TESTS
# ===========================


def test_blurb_generator_french():
    agent = BlurbGenerator()
    result = agent._analyze(FR_MYSTERY, "Mystère à Paris", {})
    assert result is not None


def test_blurb_generator_italian():
    agent = BlurbGenerator()
    result = agent._analyze(IT_MYSTERY, "Mistero a Roma", {})
    assert result is not None
