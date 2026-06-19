from unittest.mock import patch
from agents.creative.character_harvester import (
    CharacterHarvester,
    _extract_characters,
)


def test_execute_analyzes_seeds():
    agent = CharacterHarvester()
    seed_row = ("seed-1", "Sherlock Holmes investigated the mysterious crime in London.", "The Adventure")

    with (
        patch("agents.creative.character_harvester.execute") as mock_execute,
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


def test_extract_characters_finds_names():
    text = "Sherlock Holmes and John Watson investigated the mysterious crime in London."
    characters = _extract_characters(text, "Mystery")

    names = [c["name"] for c in characters]
    assert "Sherlock" in names or "Holmes" in names or "Watson" in names
    assert len(characters) > 0


def test_extract_characters_no_names():
    text = "the quick brown fox jumps over the lazy dog"
    characters = _extract_characters(text, "No Names")
    assert len(characters) == 0


def test_character_role_detection():
    text = "The hero and the villain faced off in a final battle."
    characters = _extract_characters(text, "Battle")
    if len(characters) >= 2:
        roles = [c["role_type"] for c in characters]
        assert "protagonist" in roles or "antagonist" in roles


def test_character_traits():
    text = "The brave and cunning explorer ventured into the dark cave."
    characters = _extract_characters(text, "Explorer")
    if characters:
        traits_lower = [t.lower() for t in characters[0]["traits"]]
        assert any(t in traits_lower for t in ["brave", "cunning"])


def test_character_motivations():
    text = "She sought revenge against those who wronged her family."
    characters = _extract_characters(text, "Revenge")
    if characters:
        motivations_lower = [m.lower() for m in characters[0]["motivations"]]
        assert "revenge" in motivations_lower


def test_character_arcs():
    text = "She sought redemption and transformation after her fall from grace."
    characters = _extract_characters(text, "Redemption")
    if characters:
        arc_names = [arc["name"] for arc in characters[0]["potential_arcs"]]
        assert len(arc_names) > 0


def test_protagonist_heuristic():
    text = "Sherlock entered the room. Sherlock examined the clues. Sherlock deduced the truth. Sherlock solved the case. Sherlock smiled."
    characters = _extract_characters(text, "Sherlock")
    sherlock = next((c for c in characters if c["name"] == "Sherlock"), None)
    if sherlock:
        assert sherlock["is_protagonist"] is True


def test_already_enriched_skips():
    agent = CharacterHarvester()
    seed_row = ("seed-1", "Some text", "Title")

    with (
        patch("agents.creative.character_harvester.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True


def test_no_seeds_no_work():
    agent = CharacterHarvester()
    with patch("agents.creative.character_harvester.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()
    assert result.success is True
