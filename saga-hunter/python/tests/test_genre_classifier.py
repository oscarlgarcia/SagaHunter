from unittest.mock import patch
from agents.analysis.genre_classifier import GenreClassifier


def test_execute_classifies_seeds():
    agent = GenreClassifier()
    seed_row = ("seed-1", "A detective investigates a crime with clues and suspects.", "The Case")

    with (
        patch("agents.analysis.genre_classifier.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=False),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.side_effect = [
            [seed_row],
            [],
        ]
        result = agent.execute()

    assert result.success is True


def test_mystery_detected():
    agent = GenreClassifier()
    text = "The detective examined the crime scene for clues. The suspect had no alibi and the murder weapon was missing."
    result = agent._analyze(text, "The Mystery Case")

    assert result["primary_genre"] == "mystery"
    assert result["top_matches"][0] == "mystery"


def test_scifi_detected():
    agent = GenreClassifier()
    text = "In the future, a starship captain discovers an alien signal in a nearby galaxy."
    result = agent._analyze(text, "Space Signal")

    assert result["primary_genre"] == "scifi"
    assert result["is_mixed"] is False


def test_romance_detected():
    agent = GenreClassifier()
    text = "A tale of love and passion. Two soulmates meet by chance and their hearts embrace."
    result = agent._analyze(text, "Love Story")

    assert result["primary_genre"] == "romance"


def test_unknown_genre():
    agent = GenreClassifier()
    text = "The table was made of wood. The water was cold."
    result = agent._analyze(text, "Boring")

    assert result["primary_genre"] == "unknown"
    assert result["is_mixed"] is False


def test_mixed_genre():
    agent = GenreClassifier()
    text = "In the future, a detective solves love crimes in space with magic."
    result = agent._analyze(text, "Mixed")

    assert result["primary_genre"] in ("scifi", "fantasy", "romance", "mystery")
    assert result["top_matches"] is not None


def test_already_enriched_skips():
    agent = GenreClassifier()
    seed_row = ("seed-1", "text", "title")

    with (
        patch("agents.analysis.genre_classifier.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True
