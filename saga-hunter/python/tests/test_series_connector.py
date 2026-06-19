from unittest.mock import patch
from agents.publishing.series_connector import (
    SeriesConnector,
    _extract_elements,
    _compute_similarity,
    _determine_connection_type,
)


def test_execute_no_seeds():
    agent = SeriesConnector()
    with patch("agents.publishing.series_connector.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()
    assert result.success is True


def test_extract_elements_with_enrichments():
    seed = {
        "id": "s1",
        "title": "Test",
        "language": "en",
        "enrichments": {
            "angle_finder": {
                "protagonists": ["Sherlock", "Watson"],
                "settings": ["London"],
            },
            "genre_classifier": {
                "primary_genre": "mystery",
                "top_matches": ["mystery", "thriller"],
            },
            "character_harvester": {
                "characters": [
                    {"name": "Sherlock"},
                    {"name": "Watson"},
                ],
            },
        },
    }
    elements = _extract_elements(seed)
    assert "sherlock" in elements["protagonists"]
    assert "watson" in elements["characters"]
    assert "mystery" in elements["genres"]
    assert "london" in elements["settings"]


def test_extract_elements_empty():
    seed = {"id": "s1", "title": "Test", "language": "en", "enrichments": {}}
    elements = _extract_elements(seed)
    assert len(elements["protagonists"]) == 0
    assert len(elements["characters"]) == 0


def test_compute_similarity_matches():
    a = {
        "protagonists": {"sherlock"},
        "settings": {"london"},
        "genres": {"mystery"},
        "characters": {"watson"},
        "themes": set(),
    }
    b = {
        "protagonists": {"sherlock"},
        "settings": {"london"},
        "genres": {"mystery", "thriller"},
        "characters": {"watson", "moriarty"},
        "themes": set(),
    }
    score, matches = _compute_similarity(a, b)
    assert score >= 8
    assert len(matches) >= 3


def test_compute_similarity_no_matches():
    a = {"protagonists": set(), "settings": set(), "genres": {"fantasy"}, "characters": set(), "themes": set()}
    b = {"protagonists": set(), "settings": set(), "genres": {"scifi"}, "characters": set(), "themes": set()}
    score, matches = _compute_similarity(a, b)
    assert score == 0
    assert len(matches) == 0


def test_determine_connection_type_character():
    conn = _determine_connection_type(5, [("protagonist", ["sherlock"]), ("setting", ["london"])])
    assert conn["type"] == "character_overlap"


def test_determine_connection_type_setting():
    conn = _determine_connection_type(2, [("setting", ["london"])])
    assert conn["type"] == "shared_universe"


def test_determine_connection_type_genre():
    conn = _determine_connection_type(2, [("genre", ["mystery"])])
    assert conn["type"] == "thematic_saga"


def test_already_enriched_skips():
    agent = SeriesConnector()
    with (
        patch("agents.publishing.series_connector._fetch_seed_data") as mock_fetch,
        patch.object(agent, "_already_enriched", return_value=True),
    ):
        mock_fetch.return_value = [
            {"id": "s1", "title": "A", "language": "en", "enrichments": {}},
            {"id": "s2", "title": "B", "language": "en", "enrichments": {}},
        ]
        result = agent.execute()
    assert result.success is True
