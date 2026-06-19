from unittest.mock import patch
from agents.publishing.plot_hole_detector import (
    PlotHoleDetector,
    _run_checks,
    _compute_consistency_score,
    CHECKS,
)


def test_execute_analyzes_seeds():
    agent = PlotHoleDetector()
    row = ("seed-1", "Test", '[]')

    with (
        patch("agents.publishing.plot_hole_detector.execute") as mock_execute,
        patch("agents.base.execute") as mock_db,
        patch.object(agent, "_already_enriched", return_value=False),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [row]
        mock_db.return_value = []
        result = agent.execute()

    assert result.success is True
    assert result.seeds_created == 0


def test_no_issues_with_full_enrichments():
    enrichments = {
        "angle_finder": {
            "protagonists": ["Sherlock"],
            "settings": ["London"],
            "conflict_type": "external",
            "theme_scores": {"conflict": 5, "mystery": 3, "arc": 2},
        },
        "genre_classifier": {"primary_genre": "mystery", "top_matches": ["mystery"]},
        "story_structurer": {"structure_type": "three_act"},
        "character_harvester": {
            "characters": [{"name": "Sherlock", "traits": ["Brave"]}],
            "total_characters": 1,
        },
        "world_builder": {
            "world_rules": ["Magic exists", "Technology is limited"],
            "magic": {"has_magic": False},
            "setting": {"type": "historical"},
        },
        "voice_tuner": {
            "narrative_voice": {"pov": {"pov": "third_person_limited"}},
            "mood": [{"mood": "mysterious"}],
        },
    }
    issues = _run_checks(enrichments)
    assert len(issues) == 0


def test_detects_missing_protagonist():
    enrichments = {
        "angle_finder": {"protagonists": [], "settings": ["London"], "conflict_type": "external", "theme_scores": {"conflict": 3}},
    }
    issues = _run_checks(enrichments)
    assert any(i["id"] == "missing_protagonist" for i in issues)


def test_detects_missing_setting():
    enrichments = {
        "angle_finder": {"protagonists": ["Sherlock"], "settings": [], "conflict_type": "external", "theme_scores": {"conflict": 3}},
    }
    issues = _run_checks(enrichments)
    assert any(i["id"] == "missing_setting" for i in issues)


def test_detects_no_genre():
    enrichments = {"genre_classifier": {"primary_genre": "unknown"}}
    issues = _run_checks(enrichments)
    assert any(i["id"] == "no_genre" for i in issues)


def test_detects_no_characters():
    enrichments = {"character_harvester": {"characters": [], "total_characters": 0}}
    issues = _run_checks(enrichments)
    assert any(i["id"] == "no_characters" for i in issues)


def test_detects_genre_setting_mismatch():
    enrichments = {
        "genre_classifier": {"primary_genre": "fantasy"},
        "world_builder": {"setting": {"type": "contemporary"}},
    }
    issues = _run_checks(enrichments)
    assert any(i["id"] == "genre_setting_mismatch" for i in issues)


def test_detects_magic_without_rules():
    enrichments = {
        "world_builder": {
            "magic": {"has_magic": True},
            "world_rules": ["Technology is limited"],
        },
    }
    issues = _run_checks(enrichments)
    assert any(i["id"] == "magic_without_rules" for i in issues)


def test_consistency_score_perfect():
    score = _compute_consistency_score([])
    assert score == 100


def test_consistency_score_penalty():
    issues = [
        {"id": "test", "severity": "critical"},
        {"id": "test2", "severity": "major"},
        {"id": "test3", "severity": "minor"},
    ]
    score = _compute_consistency_score(issues)
    assert score == 40


def test_already_enriched_skips():
    agent = PlotHoleDetector()
    with (
        patch("agents.publishing.plot_hole_detector.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
    ):
        mock_execute.return_value = [("s1", "Test", "[]")]
        result = agent.execute()
    assert result.success is True
