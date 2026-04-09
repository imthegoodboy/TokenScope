import redis.asyncio as redis
import json
from typing import Optional
import os

redis_client: Optional[redis.Redis] = None


async def init_redis():
    global redis_client
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
    except Exception:
        redis_client = None


async def get_redis() -> Optional[redis.Redis]:
    return redis_client


async def cache_set(key: str, value: dict, expire: int = 300):
    if redis_client:
        await redis_client.set(key, json.dumps(value), ex=expire)


async def cache_get(key: str) -> Optional[dict]:
    if redis_client:
        val = await redis_client.get(key)
        if val:
            return json.loads(val)
    return None


async def cache_delete(key: str):
    if redis_client:
        await redis_client.delete(key)


async def increment_counter(user_id: str, date: str) -> int:
    if redis_client:
        key = f"tokenscope:{user_id}:{date}"
        return await redis_client.incr(key)
    return 0


async def get_daily_count(user_id: str, date: str) -> int:
    if redis_client:
        key = f"tokenscope:{user_id}:{date}"
        val = await redis_client.get(key)
        return int(val) if val else 0
    return 0
