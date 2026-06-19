import json
import logging
from typing import Optional

from app.redis_client import get_sync_client

logger = logging.getLogger(__name__)

ENRICHMENTS_TTL = 3600


def get_seed_enrichments(seed_id: str) -> Optional[dict[str, dict]]:
    try:
        client = get_sync_client()
        key = f"enrichments:{seed_id}"
        data = client.hgetall(key)
        if data:
            return {agent: json.loads(val) for agent, val in data.items()}
    except Exception as e:
        logger.warning(f"Redis cache read failed for seed {seed_id}: {e}")
    return None


def set_seed_enrichment(seed_id: str, agent_name: str, data: dict, ttl: int = ENRICHMENTS_TTL):
    try:
        client = get_sync_client()
        key = f"enrichments:{seed_id}"
        client.hset(key, agent_name, json.dumps(data))
        client.expire(key, ttl)
    except Exception as e:
        logger.warning(f"Redis cache write failed for seed {seed_id}/{agent_name}: {e}")


def clear_seed_enrichments(seed_id: str):
    try:
        client = get_sync_client()
        key = f"enrichments:{seed_id}"
        client.delete(key)
    except Exception as e:
        logger.warning(f"Redis cache delete failed for seed {seed_id}: {e}")
