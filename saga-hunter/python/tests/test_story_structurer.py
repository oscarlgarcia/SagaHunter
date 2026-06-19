from unittest.mock import patch
from agents.analysis.story_structurer import StoryStructurer


def test_execute_structures_seeds():
    agent = StoryStructurer()
    seed_row = ("seed-1", "He began his journey. But suddenly a challenge appeared. Finally he returned victorious.", "The Hero's Path")

    with (
        patch("agents.analysis.story_structurer.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=False),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.side_effect = [
            [seed_row],
            [],
        ]
        result = agent.execute()

    assert result.success is True


def test_three_act_detection():
    agent = StoryStructurer()
    text = "Once upon a time the hero began his quest. However a terrible challenge blocked his path. Finally he escaped and returned home."
    result = agent._analyze(text, "Test Tale")

    assert result["structure_type"] == "three_act"
    assert result["acts_detected"] >= 2
    assert result["three_act_scores"]["setup"]["detected"] is True
    assert result["three_act_scores"]["confrontation"]["detected"] is True
    assert result["three_act_scores"]["resolution"]["detected"] is True


def test_hero_journey_with_no_three_act():
    agent = StoryStructurer()
    text = "He was summoned to a quest. He crossed into the unknown. He faced many trials. He confronted the final enemy. He returned transformed."
    result = agent._analyze(text, "Journey Tale")

    assert result["journey_stages_detected"] >= 3
    assert result["structure_type"] in ("hero_journey", "three_act")


def test_unstructured_text():
    agent = StoryStructurer()
    text = "The cat sat on the mat. It was raining outside. The end."
    result = agent._analyze(text, "Simple Tale")

    assert result["structure_type"] == "unstructured"
    assert result["acts_detected"] == 0


def test_already_enriched_skips():
    agent = StoryStructurer()
    seed_row = ("seed-1", "text", "title")

    with (
        patch("agents.analysis.story_structurer.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True
