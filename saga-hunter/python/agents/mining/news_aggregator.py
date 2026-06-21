import feedparser
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode, ParseResult

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


def _add_page_param(url: str, page: int) -> str:
    """Append ?page=N or &page=N to a URL."""
    parsed = urlparse(url)
    qs = parse_qs(parsed.query, keep_blank_values=True)
    qs["page"] = [str(page)]
    new_query = urlencode(qs, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


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
            feed_id, name, url, source_type, language, interval_min, last_fetched, max_pages, max_entries = row
            created = self._process_feed(feed_id, name, url, source_type, language, interval_min, last_fetched, max_pages, max_entries)
            total_created += created

        return AgentResult(success=True, message=f"Processed {len(feeds)} feeds", seeds_created=total_created)

    def _get_enabled_feeds(self):
        return execute(
            """SELECT id, name, url, source_type, language, interval_minutes, last_fetched_at,
                      max_pages, max_entries
               FROM feeds
               WHERE enabled = TRUE
               AND (last_fetched_at IS NULL
                    OR last_fetched_at <= NOW() - (interval_minutes || ' minutes')::INTERVAL)
               ORDER BY last_fetched_at ASC NULLS FIRST""",
            fetch=True,
        )

    def _process_feed(self, feed_id: int, feed_name: str, feed_url: str,
                      source_type: str, language: str, interval_min: int,
                      last_fetched: Optional[datetime],
                      max_pages: Optional[int], max_entries: Optional[int]) -> int:
        logger.info("Processing feed: %s (%s)", feed_name, feed_url)

        page = 1
        total_created = 0
        total_seen = 0

        while True:
            if max_pages is not None and page > max_pages:
                logger.info("Feed %s: reached max pages (%d)", feed_name, max_pages)
                break

            url = feed_url if page == 1 else _add_page_param(feed_url, page)
            try:
                parsed = feedparser.parse(url)
            except Exception as e:
                logger.error("Failed to parse feed %s page %d: %s", feed_name, page, e)
                break

            entries = parsed.entries
            if not entries:
                logger.info("Feed %s: page %d has no entries, stopping", feed_name, page)
                break

            for entry in entries:
                if max_entries is not None and total_seen >= max_entries:
                    break

                article_url = entry.get("link", "")
                if not article_url or self._seed_exists(article_url):
                    total_seen += 1
                    continue

                title = entry.get("title", "Untitled")
                raw_text = self._extract_text(article_url, title)
                if not raw_text:
                    total_seen += 1
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
                total_created += 1
                total_seen += 1

            if max_entries is not None and total_seen >= max_entries:
                logger.info("Feed %s: reached max entries (%d)", feed_name, max_entries)
                break

            page += 1

        execute("UPDATE feeds SET last_fetched_at = NOW() WHERE id = %s", (feed_id,))
        logger.info("Feed %s: %d new seeds from %d pages (%d entries seen)", feed_name, total_created, page, total_seen)
        return total_created

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