from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import ProxyKey, APILog, Usage, get_db
from datetime import datetime, timedelta

router = APIRouter()

def get_user_id(x_user_id: str = Header(default=None)) -> str:
    return x_user_id or "default"

@router.get("/stats/overview")
async def get_overview_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)

    result = await db.execute(
        select(
            func.sum(APILog.total_tokens).label("total_tokens"),
            func.sum(APILog.cost).label("total_cost"),
            func.count(APILog.id).label("total_requests"),
            func.avg(APILog.latency_ms).label("avg_latency")
        ).where(
            APILog.user_id == user_id
        )
    )
    overall = result.one()

    result = await db.execute(
        select(
            func.sum(APILog.total_tokens).label("weekly_tokens"),
            func.sum(APILog.cost).label("weekly_cost"),
            func.count(APILog.id).label("weekly_requests")
        ).where(
            APILog.user_id == user_id,
            func.date(APILog.created_at) >= week_ago
        )
    )
    weekly = result.one()

    return {
        "total_tokens": overall.total_tokens or 0,
        "total_cost": overall.total_cost or 0.0,
        "total_requests": overall.total_requests or 0,
        "avg_latency_ms": int(overall.avg_latency or 0),
        "weekly_tokens": weekly.weekly_tokens or 0,
        "weekly_cost": weekly.weekly_cost or 0.0,
        "weekly_requests": weekly.weekly_requests or 0
    }

@router.get("/stats/daily")
async def get_daily_stats(
    days: int = Query(default=7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(
            Usage.date,
            Usage.provider,
            func.sum(Usage.total_tokens).label("tokens"),
            func.sum(Usage.cost).label("cost"),
            func.sum(Usage.request_count).label("requests")
        ).where(
            Usage.user_id == user_id
        ).group_by(
            Usage.date, Usage.provider
        ).order_by(
            Usage.date.desc()
        ).limit(days * 3)
    )

    daily_data = {}
    for row in result.all():
        date_str = row.date
        if date_str not in daily_data:
            daily_data[date_str] = {"date": date_str, "providers": {}}
        daily_data[date_str]["providers"][row.provider] = {
            "tokens": row.tokens,
            "cost": row.cost,
            "requests": row.requests
        }

    return list(daily_data.values())[:days]

@router.get("/stats/by-model")
async def get_stats_by_model(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(
            APILog.model,
            APILog.provider,
            func.sum(APILog.total_tokens).label("total_tokens"),
            func.sum(APILog.cost).label("total_cost"),
            func.count(APILog.id).label("request_count"),
            func.avg(APILog.latency_ms).label("avg_latency")
        ).where(
            APILog.user_id == user_id
        ).group_by(
            APILog.model, APILog.provider
        ).order_by(
            func.sum(APILog.cost).desc()
        )
    )

    return [
        {
            "model": row.model,
            "provider": row.provider,
            "total_tokens": row.total_tokens,
            "total_cost": row.total_cost,
            "request_count": row.request_count,
            "avg_latency_ms": int(row.avg_latency or 0)
        }
        for row in result.all()
    ]

@router.get("/stats/recent")
async def get_recent_requests(
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(APILog).where(
            APILog.user_id == user_id
        ).order_by(
            APILog.created_at.desc()
        ).limit(limit)
    )

    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "proxy_id": log.proxy_id,
            "provider": log.provider,
            "model": log.model,
            "prompt_tokens": log.prompt_tokens,
            "completion_tokens": log.completion_tokens,
            "total_tokens": log.total_tokens,
            "cost": log.cost,
            "latency_ms": log.latency_ms,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]
