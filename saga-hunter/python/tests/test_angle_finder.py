from unittest.mock import patch
from agents.analysis.angle_finder import AngleFinder


def test_execute_analyzes_seeds():
    agent = AngleFinder()
    seed_row = ("seed-1", "A man was found dead in the forest. A detective investigates.", "The Forest Mystery", "en")

    with (
        patch("agents.analysis.angle_finder.execute") as mock_execute,
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


def test_analyze_extracts_angles():
    agent = AngleFinder()
    text = "A man was found dead in the dark forest. The detective searches for clues near the river."
    result = agent._analyze(text, "The Forest Mystery", "en")

    assert result["title"] == "The Forest Mystery"
    assert result["conflict_type"] == "external"
    assert "Forest" in result["settings"]
    assert result["theme_scores"]["mystery"] > 0


def test_analyze_internal_conflict():
    agent = AngleFinder()
    text = "She struggled with her inner demons and the fear of failure."
    result = agent._analyze(text, "Inner Struggle", "en")

    assert result["conflict_type"] == "internal"
    assert len(result["settings"]) == 0


def test_already_enriched_skips():
    agent = AngleFinder()
    seed_row = ("seed-1", "Some text", "Title", "en")

    with (
        patch("agents.analysis.angle_finder.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True


def test_no_seeds_no_work():
    agent = AngleFinder()

    with patch("agents.analysis.angle_finder.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()

    assert result.success is True
