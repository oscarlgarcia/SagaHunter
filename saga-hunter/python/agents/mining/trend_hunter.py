import logging
import feedparser
from datetime import datetime

from agents.base import BaseAgent, AgentResult, compute_narrative_score
from app.database import execute
from app.redis_client import publish_event

logger = logging.getLogger(__name__)

DEFAULT_TREND_FEEDS = [
    {"name": "Reddit TIL", "url": "https://www.reddit.com/r/todayilearned/.rss", "lang": "en"},
    {"name": "Reddit Writing Prompts", "url": "https://www.reddit.com/r/WritingPrompts/.rss", "lang": "en"},
    {"name": "Reddit Interesting", "url": "https://www.reddit.com/r/interestingasfuck/.rss", "lang": "en"},
]


class TrendHunter(BaseAgent):
    name = "trend_hunter"
    description = "Discovers trending stories and writing prompts from social media"

    def execute(self) -> AgentResult:
        existing = execute("SELECT source_url FROM seeds", fetch=True)
        self._existing_urls = {row[0] for row in existing}

        db_feeds = execute(
            "SELECT name, url FROM feeds WHERE source_type = 'trend' AND enabled = TRUE",
            fetch=True,
        )

        feeds = DEFAULT_TREND_FEEDS if not db_feeds else [
            {"name": row[0], "url": row[1], "lang": "en"} for row in db_feeds
        ]

        created = 0
        for idx, feed in enumerate(feeds):
            publish_event("agent:progress", f"{self.name}|📡 Trend {idx+1}/{len(feeds)}: {feed['name']}")
            try:
                parsed = feedparser.parse(feed["url"])
            except Exception as e:
                logger.error("Failed to parse trend feed %s: %s", feed["name"], e)
                continue

            for entry in parsed.entries[:5]:
                article_url = entry.get("link", "")
                if not article_url or article_url in self._existing_urls:
                    continue

                title = entry.get("title", "Untitled")
                summary = entry.get("summary", "") or entry.get("description", "")
                text = f"{title}. {summary}"[:2000]
                score = compute_narrative_score(text, feed["lang"])

                self._save_seed(
                    title=title,
                    source_type="trend",
                    source_url=article_url,
                    source_name=feed["name"],
                    raw_text=text,
                    language=feed["lang"],
                    narrative_score=score,
                )
                self._existing_urls.add(article_url)
                created += 1

        return AgentResult(success=True, message=f"Processed {len(feeds)} trend sources", seeds_created=created)
