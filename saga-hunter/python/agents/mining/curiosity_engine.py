import logging
import httpx
import json
from datetime import datetime

from agents.base import BaseAgent, AgentResult, compute_narrative_score
from app.database import execute
from app.redis_client import publish_event

logger = logging.getLogger(__name__)

WIKI_API_URL = "https://en.wikipedia.org/w/api.php"

QUERIES = [
    {"title": "On this day historical events", "api_params": {
        "action": "query", "list": "events", "eedition": "onthisday",
        "format": "json", "limit": "10"
    }},
    {"title": "Unsolved mysteries", "api_params": {
        "action": "query", "list": "search",
        "srsearch": "unsolved mystery unexplained phenomenon",
        "srlimit": "10", "format": "json"
    }},
    {"title": "Scientific curiosities", "api_params": {
        "action": "query", "list": "search",
        "srsearch": "strange scientific discovery curiosity",
        "srlimit": "10", "format": "json"
    }},
]


class CuriosityEngine(BaseAgent):
    name = "curiosity_engine"
    description = "Discovers curious historical events, unsolved mysteries, and scientific oddities"

    def execute(self) -> AgentResult:
        existing = execute("SELECT source_url FROM seeds", fetch=True)
        self._existing_urls = {row[0] for row in existing}

        feeds = self._get_curiosity_feeds()
        created = 0
        for idx, feed in enumerate(feeds):
            feed_id, name, url, source_type, language = feed[:5]
            publish_event("agent:progress", f"{self.name}|📡 Curiosity feed {idx+1}/{len(feeds)}: {name}")
            created += self._process_curiosity_feed(url, name, source_type, language, feed_id)

        publish_event("agent:progress", f"{self.name}|🌐 Querying Wikipedia...")
        created += self._scrape_wikipedia()
        return AgentResult(success=True, message="Curiosity Engine completed", seeds_created=created)

    def _get_curiosity_feeds(self):
        return execute(
            """SELECT id, name, url, source_type, language, interval_minutes, last_fetched_at
               FROM feeds WHERE source_type = 'curiosity' AND enabled = TRUE
               AND (last_fetched_at IS NULL
                    OR last_fetched_at <= NOW() - (interval_minutes || ' minutes')::INTERVAL)
               ORDER BY last_fetched_at ASC NULLS FIRST""",
            fetch=True,
        )

    def _process_curiosity_feed(self, url: str, name: str, source_type: str,
                                 language: str, feed_id: int) -> int:
        try:
            import feedparser
            parsed = feedparser.parse(url)
        except Exception as e:
            logger.error("Failed to parse curiosity feed %s: %s", name, e)
            return 0

        created = 0
        for entry in parsed.entries[:10]:
            article_url = entry.get("link", "")
            if not article_url or article_url in self._existing_urls:
                continue
            title = entry.get("title", "Untitled")
            summary = entry.get("summary", "") or entry.get("description", "")
            text = f"{title}. {summary}"
            score = compute_narrative_score(text, language)
            self._save_seed(title, source_type, article_url, name, text, language, score)
            self._existing_urls.add(article_url)
            created += 1

        execute("UPDATE feeds SET last_fetched_at = NOW() WHERE id = %s", (feed_id,))
        return created

    def _scrape_wikipedia(self) -> int:
        created = 0
        client = httpx.Client(timeout=30)
        for query in QUERIES:
            publish_event("agent:progress", f"{self.name}|🌐 Wikipedia: {query['title']}")
            try:
                r = client.get(WIKI_API_URL, params=query["api_params"])
                data = r.json()
                pages = self._extract_pages(data)
                for page_title, page_url, extract_text in pages:
                    if page_url in self._existing_urls:
                        continue
                    score = compute_narrative_score(extract_text, "en")
                    self._save_seed(
                        title=page_title,
                        source_type="curiosity",
                        source_url=page_url,
                        source_name="Wikipedia",
                        raw_text=extract_text[:5000],
                        language="en",
                        narrative_score=score,
                    )
                    self._existing_urls.add(page_url)
                    created += 1
            except Exception as e:
                logger.error("Wikipedia query failed: %s", e)
        client.close()
        return created

    def _extract_pages(self, data: dict) -> list[tuple[str, str, str]]:
        results = []
        if "query" in data and "search" in data["query"]:
            for item in data["query"]["search"]:
                title = item.get("title", "")
                page_id = item.get("pageid", "")
                snippet = item.get("snippet", "")
                url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
                results.append((title, url, snippet))
        if "query" in data and "events" in data["query"]:
            for event in data["query"]["events"]:
                text = event.get("text", "")
                year = event.get("year", "")
                url = f"https://en.wikipedia.org/wiki/{year}"
                results.append((f"{year}: {text[:100]}", url, f"{year} - {text}"))
        return results
