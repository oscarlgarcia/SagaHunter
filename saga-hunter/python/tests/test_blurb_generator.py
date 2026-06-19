from unittest.mock import patch
from agents.publishing.blurb_generator import (
    BlurbGenerator,
    _extract_protagonist_from_text,
    _extract_setting_from_text,
)


def test_execute_analyzes_seeds():
    agent = BlurbGenerator()
    seed_row = ("seed-1", "Sherlock Holmes investigated a crime in London.", "The Mystery", "en")

    with (
        patch("agents.publishing.blurb_generator.execute") as mock_execute,
        patch("agents.base.execute") as mock_db,
        patch.object(agent, "_already_enriched", return_value=False),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.side_effect = [[seed_row]]
        mock_db.return_value = []
        result = agent.execute()

    assert result.success is True
    assert result.seeds_created == 0


def test_extract_protagonist():
    text = "Sherlock examined the crime scene carefully."
    assert _extract_protagonist_from_text(text) == "Sherlock"


def test_extract_protagonist_fallback():
    text = "the quick brown fox jumps over the lazy dog"
    assert _extract_protagonist_from_text(text) == "our protagonist"


def test_extract_setting():
    text = "The castle was hidden deep in the forest."
    assert _extract_setting_from_text(text, "en") == "Forest"


def test_extract_setting_fallback():
    text = "It was a story about abstract concepts."
    assert _extract_setting_from_text(text, "en") == "an unfamiliar world"


def test_analyze_generates_variants():
    agent = BlurbGenerator()
    text = "Sherlock Holmes investigated the mysterious crime in London."
    enrichments = {
        "angle_finder": {
            "protagonists": ["Sherlock"],
            "settings": ["London"],
        },
        "genre_classifier": {
            "primary_genre": "mystery",
        },
    }
    result = agent._analyze(text, "The Mystery", enrichments)
    assert result["title"] == "The Mystery"
    assert result["genre"] == "mystery"
    assert result["protagonist"] == "Sherlock"
    assert len(result["variants"]) == 5
    assert result["total_variants"] == 5


def test_analyze_without_enrichments():
    agent = BlurbGenerator()
    text = "A man was found dead in the dark forest."
    result = agent._analyze(text, "Dark Forest", {})
    assert result["title"] == "Dark Forest"
    assert len(result["variants"]) == 5


def test_already_enriched_skips():
    agent = BlurbGenerator()
    seed_row = ("seed-1", "Some text", "Title", "en")

    with (
        patch("agents.publishing.blurb_generator.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()
    assert result.success is True


def test_no_seeds_no_work():
    agent = BlurbGenerator()
    with patch("agents.publishing.blurb_generator.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()
    assert result.success is True
