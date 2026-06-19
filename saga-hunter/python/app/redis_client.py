import redis.asyncio as aioredis
import redis as sync_redis
from app.config import settings

_sync_client = None


def get_sync_client() -> sync_redis.Redis:
    global _sync_client
    if _sync_client is None:
        _sync_client = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _sync_client


def publish_event(channel: str, message: str):
    client = get_sync_client()
    client.publish(f"sagahunter:{channel}", message)
