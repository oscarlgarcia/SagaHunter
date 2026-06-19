from unittest.mock import patch
from agents.creative.world_builder import (
    WorldBuilder,
    _classify_setting,
    _extract_geography,
    _detect_atmosphere,
    _detect_magic,
    _extract_factions,
    _generate_world_rules,
)


def test_execute_analyzes_seeds():
    agent = WorldBuilder()
    seed_row = ("seed-1", "A wizard cast a spell in an enchanted forest.", "The Magic Forest")

    with (
        patch("agents.creative.world_builder.execute") as mock_execute,
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


def test_classify_setting_fantasy():
    text = "The wizard cast a spell in the enchanted kingdom guarded by dragons."
    result = _classify_setting(text)
    assert result["type"] == "fantasy"
    assert result["confidence"] > 0


def test_classify_setting_scifi():
    text = "The spaceship traveled through a wormhole to a distant galaxy."
    result = _classify_setting(text)
    assert result["type"] == "scifi"


def test_classify_setting_contemporary():
    text = "The car drove through the city to the office building."
    result = _classify_setting(text)
    assert result["type"] == "contemporary"


def test_classify_setting_historical():
    text = "The roman empire expanded its colonies across the ancient world."
    result = _classify_setting(text)
    assert result["type"] == "historical"


def test_extract_geography_finds_locations():
    text = "The forest was near the ocean, beyond the mountains."
    result = _extract_geography(text)
    names = [g["name"] for g in result]
    assert "Forest" in names
    assert "Ocean" in names
    assert "Mountain" in names


def test_extract_geography_empty():
    text = "It was a thought about abstract concepts."
    result = _extract_geography(text)
    assert len(result) == 0


def test_detect_atmosphere():
    text = "The dark and gloomy forest felt haunted and sinister."
    result = _detect_atmosphere(text)
    moods = [a["mood"] for a in result]
    assert "dark" in moods


def test_detect_magic_present():
    text = "The wizard studied ancient spellbooks to master sorcery."
    result = _detect_magic(text)
    assert result["has_magic"] is True
    assert result["power_level"] in ("low", "high")


def test_detect_magic_absent():
    text = "The office worker drank coffee and checked emails."
    result = _detect_magic(text)
    assert result["has_magic"] is False
    assert result["power_level"] == "none"


def test_extract_factions():
    text = "The Northern Kingdom declared war on the Dark Empire."
    result = _extract_factions(text)
    assert len(result) > 0


def test_generate_world_rules_fantasy():
    text = "A wizard cast a spell in an enchanted forest."
    setting = _classify_setting(text)
    magic = _detect_magic(text)
    geography = _extract_geography(text)
    rules = _generate_world_rules(setting["type"], magic["has_magic"], geography)
    assert len(rules) > 0
    assert any("Magic" in r for r in rules)


def test_generate_world_rules_scifi():
    rules = _generate_world_rules("scifi", False, [])
    assert len(rules) > 0
    assert any("Technology" in r for r in rules)


def test_already_enriched_skips():
    agent = WorldBuilder()
    seed_row = ("seed-1", "Some text", "Title")

    with (
        patch("agents.creative.world_builder.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True


def test_no_seeds_no_work():
    agent = WorldBuilder()
    with patch("agents.creative.world_builder.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()
    assert result.success is True
