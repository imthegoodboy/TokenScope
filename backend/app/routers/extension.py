from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer
from datetime import datetime, date, timedelta
from typing import List, Optional

from ..database import ExtensionLog, ExtensionStats, get_db

router = APIRouter()

def get_user_id(x_user_id: str = Header(default=None)) -> str:
    return x_user_id or "anonymous"

class ExtensionLogCreate(BaseModel):
    original_prompt: str
    optimized_prompt: str
    original_tokens: int = 0
    optimized_tokens: int = 0
    tokens_saved: int = 0
    cost_original: float = 0.0
    cost_optimized: float = 0.0
    cost_saved: float = 0.0
    attention_score: float = 0.0
    chatbot: str = "chatgpt"
    accepted: bool = True
    group_id: Optional[int] = None

class ExtensionSyncRequest(BaseModel):
    logs: List[ExtensionLogCreate]

@router.post("/extension/log")
async def create_extension_log(
    log_data: ExtensionLogCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Log a single extension optimization event"""
    today = date.today().isoformat()

    # Create log entry
    log_entry = ExtensionLog(
        user_id=user_id,
        group_id=log_data.group_id,
        original_prompt=log_data.original_prompt,
        optimized_prompt=log_data.optimized_prompt,
        original_tokens=log_data.original_tokens,
        optimized_tokens=log_data.optimized_tokens,
        tokens_saved=log_data.tokens_saved,
        cost_original=log_data.cost_original,
        cost_optimized=log_data.cost_optimized,
        cost_saved=log_data.cost_saved,
        attention_score=log_data.attention_score,
        chatbot=log_data.chatbot,
        accepted=log_data.accepted
    )
    db.add(log_entry)

    # Update daily stats
    stats_result = await db.execute(
        select(ExtensionStats).where(
            ExtensionStats.user_id == user_id,
            ExtensionStats.date == today
        )
    )
    stats = stats_result.scalar_one_or_none()

    if stats:
        stats.total_optimizations += 1
        if log_data.accepted:
            stats.total_accepts += 1
            stats.total_tokens_saved += log_data.tokens_saved
            stats.total_cost_saved += log_data.cost_saved
        else:
            stats.total_rejects += 1
        stats.updated_at = datetime.utcnow()
    else:
        stats = ExtensionStats(
            user_id=user_id,
            date=today,
            total_optimizations=1,
            total_accepts=1 if log_data.accepted else 0,
            total_rejects=0 if log_data.accepted else 1,
            total_tokens_saved=log_data.tokens_saved if log_data.accepted else 0,
            total_cost_saved=log_data.cost_saved if log_data.accepted else 0,
            avg_attention_score=log_data.attention_score
        )
        db.add(stats)

    await db.commit()

    return {"success": True, "log_id": log_entry.id}

@router.post("/extension/sync")
async def sync_extension_logs(
    sync_data: ExtensionSyncRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Sync multiple extension logs from the Chrome extension"""
    today = date.today().isoformat()

    for log_data in sync_data.logs:
        log_entry = ExtensionLog(
            user_id=user_id,
            group_id=log_data.group_id,
            original_prompt=log_data.original_prompt,
            optimized_prompt=log_data.optimized_prompt,
            original_tokens=log_data.original_tokens,
            optimized_tokens=log_data.optimized_tokens,
            tokens_saved=log_data.tokens_saved,
            cost_original=log_data.cost_original,
            cost_optimized=log_data.cost_optimized,
            cost_saved=log_data.cost_saved,
            attention_score=log_data.attention_score,
            chatbot=log_data.chatbot,
            accepted=log_data.accepted
        )
        db.add(log_entry)

    await db.commit()

    return {"success": True, "synced": len(sync_data.logs)}

@router.get("/extension/stats/overview")
async def get_extension_overview(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get overall extension stats"""
    # Get all-time stats
    result = await db.execute(
        select(
            func.count(ExtensionLog.id).label("total_optimizations"),
            func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("total_tokens_saved"),
            func.sum(ExtensionLog.cost_saved).label("total_cost_saved"),
            func.avg(ExtensionLog.attention_score).label("avg_attention_score"),
            func.count().filter(ExtensionLog.accepted == True).label("total_accepts")
        ).where(ExtensionLog.user_id == user_id)
    )
    row = result.one()

    # Get acceptance rate
    total_result = await db.execute(
        select(func.count(ExtensionLog.id)).where(ExtensionLog.user_id == user_id)
    )
    total_count = total_result.scalar()

    accepted_result = await db.execute(
        select(func.count(ExtensionLog.id)).where(
            ExtensionLog.user_id == user_id,
            ExtensionLog.accepted == True
        )
    )
    accepted_count = accepted_result.scalar()

    # Get weekly stats
    week_ago = (datetime.utcnow().date() - timedelta(days=7)).isoformat()
    weekly_result = await db.execute(
        select(
            func.count(ExtensionLog.id).label("weekly_optimizations"),
            func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("weekly_tokens_saved"),
            func.sum(ExtensionLog.cost_saved).label("weekly_cost_saved")
        ).where(
            ExtensionLog.user_id == user_id,
            ExtensionLog.created_at >= week_ago
        )
    )
    weekly = weekly_result.one()

    return {
        "total_optimizations": row.total_optimizations or 0,
        "total_accepts": accepted_count or 0,
        "total_rejects": (total_count or 0) - (accepted_count or 0),
        "total_tokens_saved": row.total_tokens_saved or 0,
        "total_cost_saved": row.total_cost_saved or 0.0,
        "avg_attention_score": round(row.avg_attention_score or 0, 2),
        "acceptance_rate": round((accepted_count or 0) / (total_count or 1) * 100, 1),
        "weekly_optimizations": weekly.weekly_optimizations or 0,
        "weekly_tokens_saved": weekly.weekly_tokens_saved or 0,
        "weekly_cost_saved": weekly.weekly_cost_saved or 0.0
    }

@router.get("/extension/stats/daily")
async def get_extension_daily(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get daily extension stats"""
    result = await db.execute(
        select(
            func.date(ExtensionLog.created_at).label("date"),
            func.count(ExtensionLog.id).label("optimizations"),
            func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("tokens_saved"),
            func.sum(ExtensionLog.cost_saved).label("cost_saved"),
            func.avg(ExtensionLog.attention_score).label("attention_score")
        ).where(
            ExtensionLog.user_id == user_id
        ).group_by(
            func.date(ExtensionLog.created_at)
        ).order_by(
            func.date(ExtensionLog.created_at).desc()
        ).limit(days)
    )

    return [
        {
            "date": row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
            "optimizations": row.optimizations or 0,
            "tokens_saved": row.tokens_saved or 0,
            "cost_saved": row.cost_saved or 0.0,
            "attention_score": round(row.attention_score or 0, 2)
        }
        for row in result.all()
    ]

@router.get("/extension/stats/by-chatbot")
async def get_stats_by_chatbot(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get stats by chatbot type"""
    result = await db.execute(
        select(
            ExtensionLog.chatbot,
            func.count(ExtensionLog.id).label("total"),
            func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("tokens_saved"),
            func.sum(ExtensionLog.cost_saved).label("cost_saved"),
            func.avg(ExtensionLog.attention_score).label("avg_attention_score")
        ).where(
            ExtensionLog.user_id == user_id,
            ExtensionLog.accepted == True
        ).group_by(ExtensionLog.chatbot)
    )

    return [
        {
            "chatbot": row.chatbot,
            "total": row.total or 0,
            "tokens_saved": row.tokens_saved or 0,
            "cost_saved": row.cost_saved or 0.0,
            "avg_attention_score": round(row.avg_attention_score or 0, 2)
        }
        for row in result.all()
    ]

@router.get("/extension/history")
async def get_extension_history(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get recent extension history"""
    result = await db.execute(
        select(ExtensionLog).where(
            ExtensionLog.user_id == user_id
        ).order_by(
            ExtensionLog.created_at.desc()
        ).limit(limit)
    )

    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "original_prompt": log.original_prompt,
            "optimized_prompt": log.optimized_prompt,
            "original_tokens": log.original_tokens,
            "optimized_tokens": log.optimized_tokens,
            "tokens_saved": log.tokens_saved,
            "cost_saved": log.cost_saved,
            "attention_score": log.attention_score,
            "chatbot": log.chatbot,
            "accepted": log.accepted,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]

@router.get("/extension/attention-scores")
async def get_attention_scores(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get aggregated attention scores by token/word"""
    result = await db.execute(
        select(
            func.avg(ExtensionLog.attention_score).label("score"),
            func.count(ExtensionLog.id).label("count"),
            ExtensionLog.chatbot
        ).where(
            ExtensionLog.user_id == user_id,
            ExtensionLog.accepted == True
        ).group_by(ExtensionLog.chatbot)
    )

    return {
        "overall_avg": 0.0,  # Will be calculated from the result
        "by_chatbot": [
            {
                "chatbot": row.chatbot,
                "avg_score": round(row.score or 0, 2),
                "sample_count": row.count
            }
            for row in result.all()
        ],
        "score_distribution": {
            "high": 0,    # > 0.7
            "medium": 0,  # 0.4 - 0.7
            "low": 0      # < 0.4
        }
    }

