from agents.base import compute_narrative_score


def test_empty_text_returns_zero():
    assert compute_narrative_score("", "en") == 0


def test_no_keywords_returns_zero():
    assert compute_narrative_score("The cat sat on the mat.", "en") == 0


def test_conflict_keywords_detected():
    score = compute_narrative_score("A murder and a war with betrayal.", "en")
    assert score > 0


def test_keywords_increase_score():
    low = compute_narrative_score("The weather is nice today.", "en")
    high = compute_narrative_score("murder war betrayal mystery secret unknown", "en")
    assert high > low


def test_all_keywords_returns_100():
    all_kw = (
        "murder kill death war battle attack betrayal crash explosion "
        "hostage kidnap violence assault revenge conspiracy fraud theft "
        "destruction collapse crisis "
        "disappear unknown secret mystery unexplained strange weird puzzle "
        "enigma hidden lost curious phenomenon unsolved "
        "transform redemption journey survive escape overcome discover "
        "change evolve rise fall rebuild awaken "
        "love fear rage hope despair grief joy passion terror longing regret courage"
    )
    score = compute_narrative_score(all_kw, "en")
    assert score == 100


def test_unsupported_language_falls_back_to_english():
    score = compute_narrative_score("murder war betrayal", "xx")
    assert score > 0


def test_spanish_keywords():
    score = compute_narrative_score("asesinato guerra traición", "es")
    assert score > 0


def test_french_keywords():
    score = compute_narrative_score("meurtre guerre trahison", "fr")
    assert score > 0


def test_italian_keywords():
    score = compute_narrative_score("omicidio guerra tradimento", "it")
    assert score > 0


def test_score_capped_at_100():
    text = " ".join([
        "murder kill death war battle attack betrayal crash explosion",
        "hostage kidnap violence assault revenge conspiracy fraud theft",
        "destruction collapse crisis",
    ])
    score = compute_narrative_score(text, "en")
    assert score <= 100


def test_partial_match_returns_proportional():
    score = compute_narrative_score("murder", "en")
    assert 0 < score < 100
