from unittest.mock import patch, MagicMock
from agents.mining.curiosity_engine import CuriosityEngine


def test_extract_pages_search_results():
    agent = CuriosityEngine()
    data = {
        "query": {
            "search": [
                {"title": "Unsolved Mystery", "pageid": 123, "snippet": "An unsolved mystery..."},
                {"title": "Strange Event", "pageid": 456, "snippet": "A strange phenomenon..."},
            ]
        }
    }
    pages = agent._extract_pages(data)
    assert len(pages) == 2
    assert pages[0][0] == "Unsolved Mystery"
    assert "wikipedia.org" in pages[0][1]


def test_extract_pages_events():
    agent = CuriosityEngine()
    data = {
        "query": {
            "events": [
                {"text": "First moon landing", "year": "1969"},
                {"text": "Fall of Berlin Wall", "year": "1989"},
            ]
        }
    }
    pages = agent._extract_pages(data)
    assert len(pages) == 2
    assert "1969" in pages[0][0]


def test_extract_pages_empty():
    agent = CuriosityEngine()
    pages = agent._extract_pages({})
    assert pages == []


def test_execute_with_no_feeds():
    agent = CuriosityEngine()
    with (
        patch.object(agent, "_get_curiosity_feeds", return_value=[]),
        patch.object(agent, "_scrape_wikipedia", return_value=0),
    ):
        result = agent.execute()
    assert result.success is True


def test_scrape_wikipedia_http_error():
    agent = CuriosityEngine()
    with patch("httpx.Client") as mock_client:
        mock_instance = MagicMock()
        mock_client.return_value.__enter__.return_value = mock_instance
        mock_instance.get.side_effect = Exception("Network error")
        created = agent._scrape_wikipedia()
    assert created == 0
