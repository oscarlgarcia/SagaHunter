import logging
import time
import uuid
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import execute
from app.redis_client import publish_event

from agents.mining.news_aggregator import NewsAggregator
from agents.mining.curiosity_engine import CuriosityEngine
from agents.mining.trend_hunter import TrendHunter
from agents.analysis.angle_finder import AngleFinder
from agents.analysis.story_structurer import StoryStructurer
from agents.analysis.genre_classifier import GenreClassifier
from agents.creative.what_if_generator import WhatIfGenerator
from agents.creative.world_builder import WorldBuilder
from agents.creative.character_harvester import CharacterHarvester
from agents.creative.voice_tone_tuner import VoiceToneTuner
from agents.publishing.blurb_generator import BlurbGenerator
from agents.publishing.series_connector import SeriesConnector
from agents.publishing.plot_hole_detector import PlotHoleDetector
from agents.publishing.story_critique import StoryCritique
from agents.publishing.auto_summary import AutoSummary

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("orchestrator")

AGENT_REGISTRY = {
    "news_aggregator": NewsAggregator,
    "curiosity_engine": CuriosityEngine,
    "trend_hunter": TrendHunter,
    "angle_finder": AngleFinder,
    "story_structurer": StoryStructurer,
    "genre_classifier": GenreClassifier,
    "what_if_generator": WhatIfGenerator,
    "world_builder": WorldBuilder,
    "character_harvester": CharacterHarvester,
    "voice_tuner": VoiceToneTuner,
    "blurb_generator": BlurbGenerator,
    "series_connector": SeriesConnector,
    "plot_hole_detector": PlotHoleDetector,
    "story_critique": StoryCritique,
    "auto_summary": AutoSummary,
}


def ensure_agent_configs():
    for agent_name, agent_class in AGENT_REGISTRY.items():
        row = execute(
            "SELECT 1 FROM agent_configs WHERE agent_name = %s",
            (agent_name,),
            fetch=True,
        )
        if not row:
            execute(
                """INSERT INTO agent_configs (agent_name, enabled, mode, schedule, languages, params)
                   VALUES (%s, TRUE, 'auto', '*/15 * * * *', ARRAY['en','es','fr','it'], '{}')""",
                (agent_name,),
            )
            logger.info("Created default config for agent: %s", agent_name)


MINING_AGENTS = {"news_aggregator", "curiosity_engine", "trend_hunter"}
ANALYSIS_AGENTS = {"angle_finder", "story_structurer", "genre_classifier"}
CREATIVE_AGENTS = {"what_if_generator", "world_builder", "character_harvester", "voice_tuner"}
PUBLISHING_AGENTS = {"blurb_generator", "series_connector", "plot_hole_detector", "story_critique", "auto_summary"}


def _log_run(agent_name: str, status: str, seeds_created: int, message: str = None):
    execute(
        """INSERT INTO agent_run_logs (id, agent_name, status, seeds_created, message, started_at, finished_at)
           VALUES (%s, %s, %s, %s, %s, NOW() - INTERVAL '1 second', NOW())""",
        (str(uuid.uuid4()), agent_name, status, seeds_created, message),
    )


def _get_downstream_agents(agent_name: str) -> list[str]:
    rows = execute(
        "SELECT action_agent FROM agent_connections WHERE trigger_agent = %s AND enabled = TRUE ORDER BY action_agent",
        (agent_name,),
        fetch=True,
    )
    return [row[0] for row in rows]


def _has_any_connections() -> bool:
    rows = execute("SELECT 1 FROM agent_connections LIMIT 1", fetch=True)
    return len(rows) > 0


def _get_agent_params(agent_name: str) -> dict:
    rows = execute(
        "SELECT params FROM agent_configs WHERE agent_name = %s",
        (agent_name,),
        fetch=True,
    )
    if rows and rows[0][0] and isinstance(rows[0][0], dict):
        return rows[0][0]
    return {}


def _run_single_agent(agent) -> bool:
    try:
        publish_event("agent:start", f"{agent.name}|{agent.description}")
        result = agent.execute()
        if result.success:
            _log_run(agent.name, "success", result.seeds_created, result.message)
            logger.info("Agent '%s' OK: %s (%d seeds)", agent.name, result.message, result.seeds_created)
        else:
            _log_run(agent.name, "fail", 0, result.message)
            logger.error("Agent '%s' failed: %s", agent.name, result.message)
        publish_event("agent:run", f"{agent.name}|{'success' if result.success else 'fail'}|{result.seeds_created}")
        return result.success
    except Exception as e:
        logger.exception("Agent '%s' crashed: %s", agent.name, e)
        _log_run(agent.name, "crash", 0, str(e))
        publish_event("agent:run", f"{agent.name}|crash|0")
        return False


def _run_pipeline_downstream(trigger_name: str, visited: set[str]):
    downstream = _get_downstream_agents(trigger_name)
    if downstream:
        for down_name in downstream:
            if down_name in visited:
                continue
            visited.add(down_name)
            down_class = AGENT_REGISTRY.get(down_name)
            if not down_class:
                continue
            logger.info("[pipeline] %s -> %s", trigger_name, down_name)
            _run_single_agent(down_class())
            _run_pipeline_downstream(down_name, visited)


def _run_hardcoded_chain():
    for agent_name in list(ANALYSIS_AGENTS) + list(CREATIVE_AGENTS) + list(PUBLISHING_AGENTS):
        agent_class = AGENT_REGISTRY.get(agent_name)
        if agent_class:
            agent = agent_class()
            _run_single_agent(agent)


class Orchestrator:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.running = False

    def start(self):
        logger.info("Starting SagaHunter Orchestrator...")
        ensure_agent_configs()
        self._schedule_agents()
        self.scheduler.start()
        self.running = True
        logger.info("Orchestrator started. %d agents scheduled.", len(self.scheduler.get_jobs()))

        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        if self.running:
            self.scheduler.shutdown(wait=False)
            self.running = False
            logger.info("Orchestrator stopped.")

    def _schedule_agents(self):
        configs = execute(
            "SELECT agent_name, enabled, mode, schedule, params FROM agent_configs",
            fetch=True,
        )
        for row in configs:
            agent_name, enabled, mode, schedule, params = row
            if not enabled or mode != "auto":
                continue
            agent_class = AGENT_REGISTRY.get(agent_name)
            if not agent_class:
                logger.warning("Unknown agent: %s", agent_name)
                continue

            params_dict = params if isinstance(params, dict) else {}
            interval_min = params_dict.get("interval_minutes", settings.AGENT_SCHEDULE_INTERVAL_MINUTES)
            timeout_sec = params_dict.get("timeout_seconds", 300)

            agent = agent_class()
            agent.timeout = timeout_sec
            self.scheduler.add_job(
                self._run_agent,
                IntervalTrigger(minutes=interval_min),
                args=[agent],
                id=agent_name,
                name=agent_name,
                replace_existing=True,
            )
            logger.info("Scheduled agent '%s' every %d min (timeout %ds)", agent_name, interval_min, timeout_sec)

    def _run_agent(self, agent):
        logger.info("Running agent: %s", agent.name)
        success = _run_single_agent(agent)
        if success and agent.name in MINING_AGENTS:
            downstream = _get_downstream_agents(agent.name)
            if downstream:
                visited = {agent.name}
                for down_name in downstream:
                    if down_name not in visited:
                        visited.add(down_name)
                        down_class = AGENT_REGISTRY.get(down_name)
                        if down_class:
                            logger.info("[pipeline] %s -> %s", agent.name, down_name)
                            _run_single_agent(down_class())
                            _run_pipeline_downstream(down_name, visited)
            elif not _has_any_connections():
                _run_hardcoded_chain()


def run_agent_once(agent_name: str):
    agent_class = AGENT_REGISTRY.get(agent_name)
    if not agent_class:
        logger.error("Unknown agent: %s", agent_name)
        return
    agent = agent_class()
    params = _get_agent_params(agent_name)
    agent.timeout = params.get("timeout_seconds", 300)
    success = _run_single_agent(agent)
    if success and agent.name in MINING_AGENTS:
        downstream = _get_downstream_agents(agent.name)
        if downstream:
            visited = {agent.name}
            for down_name in downstream:
                if down_name not in visited:
                    visited.add(down_name)
                    down_class = AGENT_REGISTRY.get(down_name)
                    if down_class:
                        logger.info("[pipeline] %s -> %s", agent.name, down_name)
                        _run_single_agent(down_class())
                        _run_pipeline_downstream(down_name, visited)
        elif not _has_any_connections():
            _run_hardcoded_chain()


def run_pipeline(trigger_agent_name: str):
    agent_class = AGENT_REGISTRY.get(trigger_agent_name)
    if not agent_class:
        logger.error("Unknown agent: %s", trigger_agent_name)
        return
    agent = agent_class()
    params = _get_agent_params(trigger_agent_name)
    agent.timeout = params.get("timeout_seconds", 300)
    logger.info("Running pipeline triggered by: %s", trigger_agent_name)
    success = _run_single_agent(agent)
    if success and agent.name in MINING_AGENTS:
        downstream = _get_downstream_agents(agent.name)
        if downstream:
            visited = {agent.name}
            for down_name in downstream:
                if down_name not in visited:
                    visited.add(down_name)
                    down_class = AGENT_REGISTRY.get(down_name)
                    if down_class:
                        logger.info("[pipeline] %s -> %s", agent.name, down_name)
                        _run_single_agent(down_class())
                        _run_pipeline_downstream(down_name, visited)
        elif not _has_any_connections():
            _run_hardcoded_chain()


if __name__ == "__main__":
    orch = Orchestrator()
    orch.start()
