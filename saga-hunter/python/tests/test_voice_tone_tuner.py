from unittest.mock import patch
from agents.creative.voice_tone_tuner import (
    VoiceToneTuner,
    _detect_pov,
    _detect_register,
    _detect_tense,
    _detect_pacing,
    _detect_mood,
    _estimate_readability,
    _generate_style_examples,
)


def test_execute_analyzes_seeds():
    agent = VoiceToneTuner()
    seed_row = ("seed-1", "I walked into the dark room and saw something terrible.", "The Dark Room")

    with (
        patch("agents.creative.voice_tone_tuner.execute") as mock_execute,
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


def test_detect_pov_first_person():
    text = "I walked into the room and saw my reflection. I knew this was my destiny."
    result = _detect_pov(text)
    assert result["pov"] == "first_person"
    assert result["confidence"] > 0


def test_detect_pov_third_person():
    text = "He walked into the room and saw his reflection. She watched from the doorway."
    result = _detect_pov(text)
    assert result["pov"] == "third_person_limited"


def test_detect_pov_unknown():
    text = "Running through trees quickly finding shelter."
    result = _detect_pov(text)
    assert result["pov"] == "unknown"


def test_detect_register_formal():
    text = "Thus, we must therefore conclude that the evidence is significant."
    result = _detect_register(text)
    labels = [r["label"] for r in result]
    assert "Formal" in labels


def test_detect_register_colloquial():
    text = "Yeah, I'm gonna go now. See ya later!"
    result = _detect_register(text)
    labels = [r["label"] for r in result]
    assert "Colloquial / Informal" in labels


def test_detect_register_empty():
    text = "The quick brown fox jumps over the indifferent dog."
    result = _detect_register(text)
    assert len(result) == 0


def test_detect_tense_past():
    text = "He was walking when he saw the door. He had never been there before."
    result = _detect_tense(text)
    assert result["tense"] == "past"


def test_detect_tense_present():
    text = "He is walking when he sees the door. He has never been there before."
    result = _detect_tense(text)
    assert result["tense"] == "present"


def test_detect_pacing_fast():
    text = "Suddenly, an explosion! Instantly, he rushed forward desperately."
    result = _detect_pacing(text)
    assert result["pacing"] == "fast"


def test_detect_pacing_slow():
    text = "She slowly walked through the garden, gently touching each flower."
    result = _detect_pacing(text)
    assert result["pacing"] == "slow"


def test_detect_mood():
    text = "The dark and grim forest filled him with dread and despair."
    result = _detect_mood(text)
    moods = [m["mood"] for m in result]
    assert "dark" in moods


def test_estimate_readability():
    text = "The cat sat on the mat. It was comfortable. The end."
    result = _estimate_readability(text)
    assert result["level"] in ("easy", "moderate", "complex")
    assert result["avg_sentence_length"] > 0
    assert result["long_word_ratio"] >= 0


def test_generate_style_examples():
    text = "He walked into the room and found a letter on the table."
    result = _generate_style_examples("third_person_limited", "minimalist", "past", text)
    assert "original_style" in result
    assert "alternatives" in result
    assert len(result["alternatives"]) > 0


def test_already_enriched_skips():
    agent = VoiceToneTuner()
    seed_row = ("seed-1", "Some text", "Title")

    with (
        patch("agents.creative.voice_tone_tuner.execute") as mock_execute,
        patch.object(agent, "_already_enriched", return_value=True),
        patch.object(agent, "_save_enrichment"),
    ):
        mock_execute.return_value = [seed_row]
        result = agent.execute()

    assert result.success is True


def test_no_seeds_no_work():
    agent = VoiceToneTuner()
    with patch("agents.creative.voice_tone_tuner.execute") as mock_execute:
        mock_execute.return_value = []
        result = agent.execute()
    assert result.success is True
