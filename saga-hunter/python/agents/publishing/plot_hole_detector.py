import logging
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute

logger = logging.getLogger(__name__)

CHECKS = [
    {
        "id": "missing_protagonist",
        "label": "Missing Protagonist",
        "severity": "major",
        "check": lambda e: _has_agent(e, "angle_finder") and not _get(e, "angle_finder", "protagonists"),
        "description": "Angle Finder found no protagonist candidates in the text.",
        "suggestion": "Consider adding a named character as the central figure.",
    },
    {
        "id": "missing_setting",
        "label": "Missing Setting",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "angle_finder") and not _get(e, "angle_finder", "settings"),
        "description": "No setting or location was detected.",
        "suggestion": "Establish a clear sense of place early in the narrative.",
    },
    {
        "id": "missing_conflict",
        "label": "Missing Conflict",
        "severity": "major",
        "check": lambda e: _has_agent(e, "angle_finder") and _get(e, "angle_finder", "conflict_type") == "internal" and all(
            _get(e, "angle_finder", "theme_scores", default={}).get(k, 0) == 0 for k in ("conflict", "mystery", "arc")
        ),
        "description": "No significant narrative conflict detected.",
        "suggestion": "Introduce a central conflict — internal or external — to drive the story.",
    },
    {
        "id": "no_genre",
        "label": "No Genre Identified",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "genre_classifier") and _get(e, "genre_classifier", "primary_genre") == "unknown",
        "description": "Genre classifier could not determine a primary genre.",
        "suggestion": "The text may be too generic; consider adding genre-specific elements.",
    },
    {
        "id": "no_structure",
        "label": "No Story Structure",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "story_structurer") and _get(e, "story_structurer", "structure_type") == "unstructured",
        "description": "No clear narrative structure (3-act, hero's journey) was detected.",
        "suggestion": "Consider structuring the story with a beginning, middle, and end.",
    },
    {
        "id": "no_characters",
        "label": "No Characters Found",
        "severity": "major",
        "check": lambda e: _has_agent(e, "character_harvester") and _get(e, "character_harvester", "total_characters", default=0) == 0,
        "description": "Character Harvester found no named characters.",
        "suggestion": "Add named characters with distinct roles and motivations.",
    },
    {
        "id": "no_character_traits",
        "label": "Characters Lack Traits",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "character_harvester") and all(
            len(c.get("traits", [])) == 0
            for c in _get(e, "character_harvester", "characters", default=[])
        ),
        "description": "Extracted characters have no personality traits.",
        "suggestion": "Add descriptive keywords that reveal character personalities.",
    },
    {
        "id": "no_world_rules",
        "label": "No World Rules Defined",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "world_builder") and len(_get(e, "world_builder", "world_rules", default=[])) <= 1,
        "description": "World Builder found few or no world rules.",
        "suggestion": "Define the rules of your world to maintain internal consistency.",
    },
    {
        "id": "genre_setting_mismatch",
        "label": "Genre-Setting Mismatch",
        "severity": "major",
        "check": lambda e: (
            _has_agent(e, "genre_classifier")
            and _has_agent(e, "world_builder")
            and _get(e, "genre_classifier", "primary_genre") in ("fantasy", "scifi")
            and _get(e, "world_builder", "setting", default={}).get("type") == "contemporary"
        ),
        "description": "Genre suggests fantasy/sci-fi but setting is classified as contemporary.",
        "suggestion": "Either adjust the setting or ensure genre elements are clearly present.",
    },
    {
        "id": "magic_without_rules",
        "label": "Magic Without Rules",
        "severity": "major",
        "check": lambda e: (
            _has_agent(e, "world_builder")
            and _get(e, "world_builder", "magic", default={}).get("has_magic")
            and not any("Magic" in r for r in _get(e, "world_builder", "world_rules", default=[]))
        ),
        "description": "Magic exists but no rules or limitations are defined.",
        "suggestion": "Define the rules, costs, and limitations of your magic system.",
    },
    {
        "id": "no_pov",
        "label": "No Clear Point of View",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "voice_tuner") and _get(e, "voice_tuner", "narrative_voice", default={}).get("pov", {}).get("pov") == "unknown",
        "description": "Voice Tuner could not determine a clear narrative POV.",
        "suggestion": "Establish a consistent point of view (first, second, or third person).",
    },
    {
        "id": "no_mood",
        "label": "No Dominant Mood",
        "severity": "minor",
        "check": lambda e: _has_agent(e, "voice_tuner") and len(_get(e, "voice_tuner", "mood", default=[])) == 0,
        "description": "No dominant mood or atmosphere was detected.",
        "suggestion": "Use descriptive language to establish a consistent mood.",
    },
]


def _has_agent(enrichments: dict, agent_name: str) -> bool:
    return agent_name in enrichments


def _get(enrichments: dict, agent_name: str, *path, **kw):
    default = kw.get("default", None)
    obj = enrichments.get(agent_name)
    if obj is None:
        return default
    for key in path:
        if isinstance(obj, dict):
            obj = obj.get(key)
        else:
            return default
    return obj if obj is not None else default


def _run_checks(enrichments: dict) -> list[dict]:
    issues = []
    for check in CHECKS:
        try:
            if check["check"](enrichments):
                issues.append({
                    "id": check["id"],
                    "label": check["label"],
                    "severity": check["severity"],
                    "description": check["description"],
                    "suggestion": check["suggestion"],
                })
        except Exception:
            continue
    return issues


_score_map = {"critical": 3, "major": 2, "minor": 1}


def _compute_consistency_score(issues: list[dict]) -> int:
    if not issues:
        return 100
    total_penalty = sum(_score_map.get(i["severity"], 1) for i in issues)
    return max(0, 100 - total_penalty * 10)


class PlotHoleDetector(BaseAgent):
    name = "plot_hole_detector"
    description = "Detects narrative inconsistencies and plot holes across enrichments"

    def execute(self) -> AgentResult:
        seeds = execute(
            "SELECT s.id, s.title FROM seeds s LEFT JOIN enrichments e ON e.seed_id = s.id AND e.agent_name = %s WHERE e.id IS NULL ORDER BY s.discovered_at DESC",
            (self.name,),
            fetch=True,
        )
        enriched = 0
        for row in seeds:
            seed_id, title = row[:2]
            if self._already_enriched(seed_id):
                continue
            enrichments = self._fetch_enrichments(seed_id)
            result = self._analyze(title, enrichments)
            if result:
                self._save_enrichment(seed_id, self.name, result)
                enriched += 1

        return AgentResult(success=True, message=f"Analyzed {enriched} seeds for plot holes", seeds_created=0)

    def _analyze(self, title: str, enrichments: dict) -> Optional[dict]:
        total_agents = len([a for a in ["angle_finder", "story_structurer", "genre_classifier",
                                         "what_if_generator", "world_builder", "character_harvester",
                                         "voice_tuner", "blurb_generator", "series_connector"]
                           if a in enrichments])
        issues = _run_checks(enrichments)
        score = _compute_consistency_score(issues)
        by_severity = {
            "critical": len([i for i in issues if i["severity"] == "critical"]),
            "major": len([i for i in issues if i["severity"] == "major"]),
            "minor": len([i for i in issues if i["severity"] == "minor"]),
        }

        return {
            "title": title,
            "consistency_score": score,
            "total_issues": len(issues),
            "by_severity": by_severity,
            "agents_analyzed": total_agents,
            "issues": issues,
            "has_critical": by_severity["critical"] > 0,
            "has_major": by_severity["major"] > 0,
            "grade": "A" if score >= 90 else "B" if score >= 70 else "C" if score >= 50 else "D" if score >= 30 else "F",
        }
