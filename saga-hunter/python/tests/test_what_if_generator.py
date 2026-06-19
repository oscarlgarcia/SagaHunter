from unittest.mock import patch
from agents.creative.what_if_generator import (
    WhatIfGenerator,
    _detect_genre,
    _extract_protagonist,
)


def test_execute_analyzes_seeds():
    agent = WhatIfGenerator()
    seed_row = ("seed-1", "A detective searches for clues in a dark forest.", "The Forest Mystery")

    with (
        patch("agents.creative.what_if_generator.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=False),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.side_effect = [
            [seed_row],
            [],
        ]
        result = agent.execute()

    assert result.success is True
    assert result.seeds_created == 0


def test_analyze_generates_variations():
    agent = WhatIfGenerator()
    text = "A detective named Holmes searched the haunted mansion for clues about the murder."
    result = agent._analyze(text, "The Haunted Mansion")

    assert result["title"] == "The Haunted Mansion"
    assert len(result["variations"]) == 5
    assert result["total_variations"] == 5
    for v in result["variations"]:
        assert "id" in v
        assert "question" in v
        assert "description" in v
        assert "impact" in v
        assert v["impact"] in ("minor", "moderate", "major")


def test_analyze_short_text():
    agent = WhatIfGenerator()
    text = "A man walked into a bar."
    result = agent._analyze(text, "Short Story")

    assert result["title"] == "Short Story"
    assert len(result["variations"]) == 5
    assert result["original_protagonist"] == "the main character"


def test_detect_genre_mystery():
    text = "The detective found a clue that solved the crime mystery."
    assert _detect_genre(text) == "mystery"


def test_detect_genre_scifi():
    text = "The spaceship traveled through a wormhole to a distant galaxy."
    assert _detect_genre(text) == "scifi"


def test_detect_genre_romance():
    text = "Their love story was a passionate affair filled with longing."
    assert _detect_genre(text) == "romance"


def test_detect_genre_default():
    text = "The family gathered for dinner on a sunny afternoon."
    assert _detect_genre(text) == "drama"


def test_extract_protagonist():
    text = "Sherlock examined the crime scene carefully."
    assert _extract_protagonist(text) == "Sherlock"


def test_extract_protagonist_fallback():
    text = "the quick brown fox jumps over the lazy dog"
    assert _extract_protagonist(text) == "the main character"


def test_already_enriched_skips():
    agent = WhatIfGenerator()
    seed_row = ("seed-1", "Some text", "Title")

    with (
        patch("agents.creative.what_if_generator.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True


def test_no_seeds_no_work():
    agent = WhatIfGenerator()
    with patch("agents.creative.what_if_generator.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()
    assert result.success is True
