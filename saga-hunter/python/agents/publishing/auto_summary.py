import logging
from typing import Optional
import uuid
import json

from agents.base import BaseAgent, AgentResult
from app.database import execute
from app.redis_client import publish_event
from app.cache import set_seed_enrichment
from app.llm_enrich import run_llm_enrichment

logger = logging.getLogger(__name__)


PREREQUISITE_AGENTS = [
    "blurb_generator",
    "series_connector",
    "plot_hole_detector",
    "story_critique",
]


class AutoSummary(BaseAgent):
    name = "auto_summary"
    description = "Generates a concise LLM summary when all enrichments complete"

    def execute(self) -> AgentResult:
        seeds = execute(
            """SELECT s.id, s.title FROM seeds s
               LEFT JOIN enrichments e ON e.seed_id = s.id AND e.agent_name = %s
               WHERE e.id IS NULL
               ORDER BY s.discovered_at DESC""",
            (self.name,),
            fetch=True,
        )
        enriched = 0
        for row in seeds:
            seed_id, title = row[:2]
            if self._already_enriched(seed_id):
                continue
            enrichments = self._fetch_enrichments(seed_id)
            missing = [a for a in PREREQUISITE_AGENTS if a not in enrichments]
            if missing:
                continue
            enrichment_id = str(uuid.uuid4())
            heuristic = {
                "title": title,
                "status": "pending_llm",
                "agents_available": list(enrichments.keys()),
                "prerequisites_met": True,
            }
            execute(
                """INSERT INTO enrichments (id, seed_id, agent_name, data, created_at)
                   VALUES (%s, %s, %s, %s::jsonb, NOW())""",
                (enrichment_id, seed_id, self.name, json.dumps(heuristic)),
            )
            set_seed_enrichment(seed_id, self.name, heuristic)
            publish_event("enrichment:new", f"{self.name} enriched seed {seed_id}")
            try:
                run_llm_enrichment(enrichment_id)
            except Exception as e:
                logger.error("LLM enrichment failed for seed %s: %s", seed_id, e)
            enriched += 1
        return AgentResult(success=True, message=f"Summarized {enriched} seeds via LLM", seeds_created=0)
