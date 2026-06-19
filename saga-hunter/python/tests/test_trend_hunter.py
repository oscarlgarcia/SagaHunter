from unittest.mock import patch, MagicMock
from agents.mining.trend_hunter import TrendHunter, TREND_FEEDS


def test_execute_creates_seeds():
    agent = TrendHunter()

    mock_entry = MagicMock()
    mock_entry.get.side_effect = lambda key, default=None: {
        "link": "http://reddit.com/post1",
        "title": "TIL something amazing",
        "summary": "A fascinating fact.",
    }.get(key, default)

    with (
        patch("feedparser.parse") as mock_parse,
        patch.object(agent, "_seed_exists", return_value=False),
        patch.object(agent, "_save_seed"),
    ):
        mock_feed = MagicMock()
        mock_feed.entries = [mock_entry]
        mock_parse.return_value = mock_feed
        result = agent.execute()

    assert result.success is True
    assert result.seeds_created == len(TREND_FEEDS)


def test_duplicate_urls_skipped():
    agent = TrendHunter()

    mock_entry = MagicMock()
    mock_entry.get.side_effect = lambda key, default=None: {
        "link": "http://reddit.com/dup",
        "title": "Duplicate",
    }.get(key, default)

    with (
        patch("feedparser.parse") as mock_parse,
        patch.object(agent, "_seed_exists", return_value=True),
        patch.object(agent, "_save_seed"),
    ):
        mock_feed = MagicMock()
        mock_feed.entries = [mock_entry]
        mock_parse.return_value = mock_feed
        result = agent.execute()

    assert result.seeds_created == 0


def test_feed_parse_error_continues():
    agent = TrendHunter()

    with (
        patch("feedparser.parse", side_effect=Exception("Parse error")),
        patch.object(agent, "_save_seed"),
    ):
        result = agent.execute()

    assert result.success is True
    assert result.seeds_created == 0
