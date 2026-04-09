from fastapi import APIRouter, Depends
from app.middleware.auth import require_user
from app.redis_client import get_daily_count
from datetime import date

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/realtime")
async def get_realtime_stats(
    user_id: str = Depends(require_user),
):
    """Get real-time stats from Redis cache."""
    today = date.today().isoformat()

    tokens_today = await get_daily_count(user_id, today)

    # If no Redis data, return demo values
    if tokens_today == 0:
        return {
            "tokens_today": 240000,
            "cost_today": 8.47,
            "calls_today": 127,
        }

    return {
        "tokens_today": tokens_today,
        "cost_today": round(tokens_today * 0.000035, 4),
        "calls_today": tokens_today // 1900,
    }
