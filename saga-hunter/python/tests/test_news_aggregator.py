from unittest.mock import patch, MagicMock
from agents.mining.news_aggregator import NewsAggregator


def test_execute_no_feeds():
    agent = NewsAggregator()
    with patch.object(agent, "_get_enabled_feeds", return_value=[]):
        result = agent.execute()
    assert result.success is True
    assert result.message == "No enabled feeds"
    assert result.seeds_created == 0


def test_process_feed_creates_seeds():
    agent = NewsAggregator()

    feed_row = (1, "Test Feed", "http://example.com/rss", "news", "en", 360, None)
    mock_entry = MagicMock()
    mock_entry.get.side_effect = lambda key, default=None: {
        "link": "http://example.com/article1",
        "title": "Test Article",
    }.get(key, default)

    with (
        patch.object(agent, "_get_enabled_feeds", return_value=[feed_row]),
        patch("feedparser.parse") as mock_parse,
        patch.object(agent, "_seed_exists", return_value=False),
        patch.object(agent, "_extract_text", return_value="Article text with murder and mystery."),
        patch.object(agent, "_save_seed"),
        patch("agents.mining.news_aggregator.execute") as mock_execute,
    ):
        mock_feed = MagicMock()
        mock_feed.entries = [mock_entry]
        mock_parse.return_value = mock_feed

        result = agent.execute()

    assert result.success is True
    assert result.seeds_created == 1


def test_extract_text_fallback_on_error():
    with patch("agents.mining.news_aggregator.Article") as mock_article:
        mock_instance = MagicMock()
        mock_instance.download.side_effect = Exception("Download failed")
        mock_article.return_value = mock_instance

        agent = NewsAggregator()
        text = agent._extract_text("http://example.com/article", "Fallback Title")
        assert text == "Fallback Title"
