from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from ..database import Usage, get_db

router = APIRouter()

def get_user_id(x_user_id: str = Header(default=None)) -> str:
    return x_user_id or "default"

@router.get("/usage/summary")
async def get_usage_summary(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(
            Usage.provider,
            func.sum(Usage.prompt_tokens).label("prompt_tokens"),
            func.sum(Usage.completion_tokens).label("completion_tokens"),
            func.sum(Usage.total_tokens).label("total_tokens"),
            func.sum(Usage.cost).label("total_cost"),
            func.sum(Usage.request_count).label("request_count")
        ).where(
            Usage.user_id == user_id
        ).group_by(
            Usage.provider
        )
    )

    providers = {}
    for row in result.all():
        providers[row.provider] = {
            "prompt_tokens": row.prompt_tokens or 0,
            "completion_tokens": row.completion_tokens or 0,
            "total_tokens": row.total_tokens or 0,
            "total_cost": row.total_cost or 0.0,
            "request_count": row.request_count or 0
        }

    return providers

@router.get("/usage/history")
async def get_usage_history(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(Usage).where(
            Usage.user_id == user_id
        ).order_by(
            Usage.date.asc()
        )
    )

    history = {}
    for row in result.all():
        if row.date not in history:
            history[row.date] = {
                "date": row.date,
                "providers": {},
                "total_tokens": 0,
                "total_cost": 0.0,
                "request_count": 0
            }

        history[row.date]["providers"][row.provider] = {
            "tokens": row.total_tokens,
            "cost": row.cost,
            "requests": row.request_count
        }
        history[row.date]["total_tokens"] += row.total_tokens
        history[row.date]["total_cost"] += row.cost
        history[row.date]["request_count"] += row.request_count

    return list(history.values())
