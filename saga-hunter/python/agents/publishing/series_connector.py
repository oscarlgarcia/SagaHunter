import logging
from typing import Optional

from agents.base import BaseAgent, AgentResult
from app.database import execute
from app.cache import set_seed_enrichment

logger = logging.getLogger(__name__)

CONNECTION_TYPES = [
    {
        "type": "shared_universe",
        "label": "Shared Universe",
        "description": "Seeds set in the same world or setting",
        "min_score": 2,
    },
    {
        "type": "character_overlap",
        "label": "Character Overlap",
        "description": "Seeds sharing one or more characters",
        "min_score": 3,
    },
    {
        "type": "thematic_saga",
        "label": "Thematic Saga",
        "description": "Seeds exploring similar themes or genres",
        "min_score": 2,
    },
    {
        "type": "chronological",
        "label": "Chronological Sequence",
        "description": "Seeds that could form a timeline",
        "min_score": 1,
    },
]


def _fetch_seed_data() -> list[dict]:
    rows = execute(
        """SELECT s.id, s.title, s.language,
                  COALESCE(json_agg(e.data) FILTER (WHERE e.id IS NOT NULL), '[]') as enrichments
           FROM seeds s
           LEFT JOIN enrichments e ON e.seed_id = s.id
           GROUP BY s.id
           ORDER BY s.discovered_at""",
        fetch=True,
    )
    seeds = []
    for row in rows:
        seed_id, title, language, enrichments_raw = row[:4]
        enrichments = {}
        if enrichments_raw and isinstance(enrichments_raw, list):
            for e in enrichments_raw:
                if isinstance(e, dict) and "agent_name" in e:
                    enrichments[e["agent_name"]] = e.get("data", {})
                    set_seed_enrichment(seed_id, e["agent_name"], e.get("data", {}))
        seeds.append({
            "id": seed_id,
            "title": title,
            "language": language,
            "enrichments": enrichments,
        })
    return seeds


def _extract_elements(seed: dict) -> dict:
    elements = {
        "protagonists": set(),
        "settings": set(),
        "genres": set(),
        "characters": set(),
        "themes": set(),
    }
    e = seed.get("enrichments", {})

    if "angle_finder" in e:
        af = e["angle_finder"]
        if af.get("protagonists"):
            for p in af["protagonists"]:
                elements["protagonists"].add(p.lower())
        if af.get("settings"):
            for s in af["settings"]:
                elements["settings"].add(s.lower())

    if "genre_classifier" in e:
        gc = e["genre_classifier"]
        if gc.get("primary_genre"):
            elements["genres"].add(gc["primary_genre"].lower())
        if gc.get("top_matches"):
            for g in gc["top_matches"]:
                elements["genres"].add(g.lower())

    if "character_harvester" in e:
        ch = e["character_harvester"]
        if ch.get("characters"):
            for c in ch["characters"]:
                if c.get("name"):
                    elements["characters"].add(c["name"].lower())

    if "what_if_generator" in e:
        wi = e["what_if_generator"]
        if wi.get("original_genre"):
            elements["genres"].add(wi["original_genre"].lower())

    if "world_builder" in e:
        wb = e["world_builder"]
        if wb.get("setting") and wb["setting"].get("type"):
            elements["themes"].add(wb["setting"]["type"])

    return elements


def _compute_similarity(a: dict, b: dict) -> int:
    score = 0
    matches = []

    shared_protagonists = a["protagonists"] & b["protagonists"]
    if shared_protagonists:
        score += 3
        matches.append(("protagonist", list(shared_protagonists)))

    shared_characters = a["characters"] & b["characters"]
    if shared_characters:
        score += 3
        matches.append(("character", list(shared_characters)))

    shared_genres = a["genres"] & b["genres"]
    if shared_genres:
        score += 2
        matches.append(("genre", list(shared_genres)))

    shared_settings = a["settings"] & b["settings"]
    if shared_settings:
        score += 2
        matches.append(("setting", list(shared_settings)))

    shared_themes = a["themes"] & b["themes"]
    if shared_themes:
        score += 1
        matches.append(("theme", list(shared_themes)))

    return score, matches


def _determine_connection_type(score: int, matches: list) -> dict:
    match_types = {m[0] for m in matches}
    if "protagonist" in match_types or "character" in match_types:
        return CONNECTION_TYPES[1]
    if "setting" in match_types:
        return CONNECTION_TYPES[0]
    if "genre" in match_types or "theme" in match_types:
        return CONNECTION_TYPES[2]
    return CONNECTION_TYPES[3]


class SeriesConnector(BaseAgent):
    name = "series_connector"
    description = "Detects connections between seeds to form series and sagas"

    def execute(self) -> AgentResult:
        seeds = _fetch_seed_data()
        if len(seeds) < 2:
            return AgentResult(success=True, message="Need at least 2 seeds to find connections", seeds_created=0)

        enriched = 0
        seed_elements = {s["id"]: _extract_elements(s) for s in seeds}
        connections_found = {s["id"]: [] for s in seeds}

        for i in range(len(seeds)):
            for j in range(i + 1, len(seeds)):
                a, b = seeds[i], seeds[j]
                if a["language"] != b["language"]:
                    continue
                score, matches = _compute_similarity(seed_elements[a["id"]], seed_elements[b["id"]])
                if score >= 2:
                    conn_type = _determine_connection_type(score, matches)
                    conn = {
                        "seed_id": b["id"],
                        "seed_title": b["title"],
                        "score": score,
                        "connection_type": conn_type["type"],
                        "connection_label": conn_type["label"],
                        "connection_description": conn_type["description"],
                        "matches": matches,
                    }
                    connections_found[a["id"]].append(conn)
                    conn_reverse = {
                        "seed_id": a["id"],
                        "seed_title": a["title"],
                        "score": score,
                        "connection_type": conn_type["type"],
                        "connection_label": conn_type["label"],
                        "connection_description": conn_type["description"],
                        "matches": matches,
                    }
                    connections_found[b["id"]].append(conn_reverse)

        for seed in seeds:
            seed_connections = connections_found[seed["id"]]
            if not seed_connections:
                continue
            if self._already_enriched(seed["id"]):
                continue
            seed_connections.sort(key=lambda c: c["score"], reverse=True)
            result = {
                "title": seed["title"],
                "connections": seed_connections,
                "total_connections": len(seed_connections),
                "strongest_connection": seed_connections[0]["seed_title"] if seed_connections else None,
            }
            self._save_enrichment(seed["id"], self.name, result)
            enriched += 1

        return AgentResult(success=True, message=f"Found connections for {enriched} seeds", seeds_created=0)


