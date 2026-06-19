import feedparser
import logging
from datetime import datetime, timezone
from typing import Optional

try:
    from newspaper import Article, Config as NewspaperConfig
except ImportError:
    Article = None
    NewspaperConfig = None

from langdetect import detect, DetectorFactory, lang_detect_exception
DetectorFactory.seed = 42

from agents.base import BaseAgent, AgentResult, compute_narrative_score
from app.database import execute

logger = logging.getLogger(__name__)

NEWSPAPER_CFG = None
if NewspaperConfig:
    NEWSPAPER_CFG = NewspaperConfig()
    NEWSPAPER_CFG.memoize_articles = False
    NEWSPAPER_CFG.user_agent = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )


class NewsAggregator(BaseAgent):
    name = "news_aggregator"
    description = "Fetches news articles from RSS feeds and scores narrative potential"

    def execute(self) -> AgentResult:
        feeds = self._get_enabled_feeds()
        if not feeds:
            logger.info("No enabled feeds found")
            return AgentResult(success=True, message="No enabled feeds", seeds_created=0)

        total_created = 0
        for row in feeds:
            feed_id, name, url, source_type, language, interval_min, last_fetched = row
            created = self._process_feed(feed_id, name, url, source_type, language, interval_min, last_fetched)
            total_created += created

        return AgentResult(success=True, message=f"Processed {len(feeds)} feeds", seeds_created=total_created)

    def _get_enabled_feeds(self):
        return execute(
            """SELECT id, name, url, source_type, language, interval_minutes, last_fetched_at
               FROM feeds
               WHERE enabled = TRUE
               AND (last_fetched_at IS NULL
                    OR last_fetched_at <= NOW() - (interval_minutes || ' minutes')::INTERVAL)
               ORDER BY last_fetched_at ASC NULLS FIRST""",
            fetch=True,
        )

    def _process_feed(self, feed_id: int, feed_name: str, feed_url: str,
                      source_type: str, language: str, interval_min: int,
                      last_fetched: Optional[datetime]) -> int:
        logger.info("Processing feed: %s (%s)", feed_name, feed_url)
        try:
            parsed = feedparser.parse(feed_url)
        except Exception as e:
            logger.error("Failed to parse feed %s: %s", feed_name, e)
            return 0

        created = 0
        for entry in parsed.entries[:10]:
            article_url = entry.get("link", "")
            if not article_url or self._seed_exists(article_url):
                continue

            title = entry.get("title", "Untitled")
            raw_text = self._extract_text(article_url, title)
            if not raw_text:
                continue

            try:
                detected_lang = detect(raw_text[:500])
            except lang_detect_exception.LangDetectException:
                detected_lang = language or "en"

            score = compute_narrative_score(raw_text, detected_lang)

            self._save_seed(
                title=title,
                source_type=source_type,
                source_url=article_url,
                source_name=feed_name,
                raw_text=raw_text,
                language=detected_lang,
                narrative_score=score,
            )
            created += 1

        execute("UPDATE feeds SET last_fetched_at = NOW() WHERE id = %s", (feed_id,))
        logger.info("Feed %s: %d new seeds", feed_name, created)
        return created

    def _extract_text(self, url: str, fallback_title: str) -> Optional[str]:
        if Article is None:
            return fallback_title
        try:
            article = Article(url, config=NEWSPAPER_CFG)
            article.download()
            article.parse()
            text = article.text
            return text[:10000] if text else fallback_title
        except Exception as e:
            logger.debug("Failed to extract article %s: %s", url, e)
            return fallback_title
