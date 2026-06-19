import logging
import feedparser
from datetime import datetime

from agents.base import BaseAgent, AgentResult, compute_narrative_score
from app.database import execute

logger = logging.getLogger(__name__)

TREND_FEEDS = [
    {"name": "Reddit TIL", "url": "https://www.reddit.com/r/todayilearned/.rss", "lang": "en"},
    {"name": "Reddit Writing Prompts", "url": "https://www.reddit.com/r/WritingPrompts/.rss", "lang": "en"},
    {"name": "Reddit Interesting", "url": "https://www.reddit.com/r/interestingasfuck/.rss", "lang": "en"},
]


class TrendHunter(BaseAgent):
    name = "trend_hunter"
    description = "Discovers trending stories and writing prompts from social media"

    def execute(self) -> AgentResult:
        created = 0
        for feed in TREND_FEEDS:
            try:
                parsed = feedparser.parse(feed["url"])
            except Exception as e:
                logger.error("Failed to parse trend feed %s: %s", feed["name"], e)
                continue

            for entry in parsed.entries[:5]:
                article_url = entry.get("link", "")
                if not article_url or self._seed_exists(article_url):
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
                created += 1

        return AgentResult(success=True, message=f"Processed {len(TREND_FEEDS)} trend sources", seeds_created=created)
