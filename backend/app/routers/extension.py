from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from datetime import datetime, timedelta
from ..database import get_db, PromptOptimization, ProxyKey, Usage

router = APIRouter()

class SaveOptimizationRequest(BaseModel):
    user_id: str
    original_prompt: str
    optimized_prompt: str
    original_tokens: int = 0
    optimized_tokens: int = 0
    tokens_saved: int = 0
    cost_saved: float = 0.0
    target_model: str = "chatgpt"
    source: str = "extension"

class SaveOptimizationResponse(BaseModel):
    success: bool
    optimization_id: int | None = None

@router.post("/extension/save-optimization", response_model=SaveOptimizationResponse)
async def save_optimization(
    request: SaveOptimizationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Save a prompt optimization from the extension to the database."""
    try:
        optimization = PromptOptimization(
            user_id=request.user_id,
            original_prompt=request.original_prompt,
            optimized_prompt=request.optimized_prompt,
            original_tokens=request.original_tokens,
            optimized_tokens=request.optimized_tokens,
            tokens_saved=request.tokens_saved,
            cost_saved=request.cost_saved,
            target_model=request.target_model,
            source=request.source,
            accepted=True
        )
        db.add(optimization)
        await db.commit()
        await db.refresh(optimization)
        return SaveOptimizationResponse(success=True, optimization_id=optimization.id)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class OptimizationHistoryResponse(BaseModel):
    id: int
    original_prompt: str
    optimized_prompt: str
    original_tokens: int
    optimized_tokens: int
    tokens_saved: int
    cost_saved: float
    target_model: str
    source: str
    accepted: bool
    created_at: datetime

class ExtensionStatsResponse(BaseModel):
    total_prompts: int
    total_tokens_saved: int
    total_cost_saved: float
    weekly_prompts: int
    weekly_tokens_saved: int

@router.get("/extension/stats/{user_id}", response_model=ExtensionStatsResponse)
async def get_extension_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get extension-specific statistics for a user."""
    # Total stats
    total_query = select(
        func.count(PromptOptimization.id).label('total_prompts'),
        func.sum(PromptOptimization.tokens_saved).label('total_tokens_saved'),
        func.sum(PromptOptimization.cost_saved).label('total_cost_saved')
    ).where(PromptOptimization.user_id == user_id)

    total_result = await db.execute(total_query)
    total_row = total_result.one()

    # Weekly stats (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_query = select(
        func.count(PromptOptimization.id).label('weekly_prompts'),
        func.sum(PromptOptimization.tokens_saved).label('weekly_tokens_saved')
    ).where(
        PromptOptimization.user_id == user_id,
        PromptOptimization.created_at >= week_ago
    )

    weekly_result = await db.execute(weekly_query)
    weekly_row = weekly_result.one()

    return ExtensionStatsResponse(
        total_prompts=total_row.total_prompts or 0,
        total_tokens_saved=total_row.total_tokens_saved or 0,
        total_cost_saved=total_row.total_cost_saved or 0.0,
        weekly_prompts=weekly_row.weekly_prompts or 0,
        weekly_tokens_saved=weekly_row.weekly_tokens_saved or 0
    )

@router.get("/extension/history/{user_id}", response_model=list[OptimizationHistoryResponse])
async def get_optimization_history(
    user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get optimization history for a user."""
    query = select(PromptOptimization).where(
        PromptOptimization.user_id == user_id
    ).order_by(desc(PromptOptimization.created_at)).limit(limit)

    result = await db.execute(query)
    optimizations = result.scalars().all()

    return [
        OptimizationHistoryResponse(
            id=opt.id,
            original_prompt=opt.original_prompt,
            optimized_prompt=opt.optimized_prompt,
            original_tokens=opt.original_tokens,
            optimized_tokens=opt.optimized_tokens,
            tokens_saved=opt.tokens_saved,
            cost_saved=opt.cost_saved,
            target_model=opt.target_model or "chatgpt",
            source=opt.source or "extension",
            accepted=opt.accepted,
            created_at=opt.created_at
        )
        for opt in optimizations
    ]

@router.get("/extension/dashboard-stats/{user_id}")
async def get_dashboard_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get combined stats for extension dashboard."""
    # Get optimization stats
    opt_stats_query = select(
        func.count(PromptOptimization.id).label('total_prompts'),
        func.sum(PromptOptimization.tokens_saved).label('total_tokens_saved'),
        func.sum(PromptOptimization.cost_saved).label('total_cost_saved')
    ).where(PromptOptimization.user_id == user_id)

    opt_result = await db.execute(opt_stats_query)
    opt_stats = opt_result.one()

    # Get proxy key stats
    proxy_count_query = select(func.count(ProxyKey.id)).where(ProxyKey.user_id == user_id)
    proxy_result = await db.execute(proxy_count_query)
    proxy_count = proxy_result.scalar()

    # Get usage stats from last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    usage_query = select(
        func.sum(Usage.total_tokens).label('total_tokens'),
        func.sum(Usage.cost).label('total_cost'),
        func.sum(Usage.request_count).label('request_count')
    ).where(
        Usage.user_id == user_id,
        Usage.date >= thirty_days_ago.strftime('%Y-%m-%d')
    )

    usage_result = await db.execute(usage_query)
    usage_stats = usage_result.one()

    return {
        "optimization": {
            "total_prompts": opt_stats.total_prompts or 0,
            "total_tokens_saved": opt_stats.total_tokens_saved or 0,
            "total_cost_saved": opt_stats.total_cost_saved or 0.0,
        },
        "proxies": {
            "count": proxy_count or 0
        },
        "usage": {
            "total_tokens": usage_stats.total_tokens or 0,
            "total_cost": usage_stats.total_cost or 0.0,
            "request_count": usage_stats.request_count or 0
        }
    }

class SyncRequest(BaseModel):
    user_id: str
    stats: dict
    history: list

@router.post("/extension/sync")
async def sync_extension_data(
    request: SyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """Sync local extension data to backend."""
    try:
        saved_count = 0

        for item in request.history:
            # Check if already exists
            existing = await db.execute(
                select(PromptOptimization).where(
                    PromptOptimization.user_id == request.user_id,
                    PromptOptimization.original_prompt == item.get('original', ''),
                    PromptOptimization.created_at >= datetime.utcnow() - timedelta(minutes=5)
                )
            )

            if existing.scalar() is None:
                optimization = PromptOptimization(
                    user_id=request.user_id,
                    original_prompt=item.get('original', ''),
                    optimized_prompt=item.get('optimized', ''),
                    original_tokens=item.get('original', '').split().__len__() if item.get('original') else 0,
                    optimized_tokens=item.get('optimized', '').split().__len__() if item.get('optimized') else 0,
                    tokens_saved=item.get('saved_tokens', 0),
                    cost_saved=item.get('saved_cost', 0.0),
                    target_model='chatgpt',
                    source='extension',
                    accepted=True
                )
                db.add(optimization)
                saved_count += 1

        await db.commit()
        return {"success": True, "saved_count": saved_count}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Update the main.py to include this router