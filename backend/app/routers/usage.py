from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_session
from app.models.usage import UsageRecord
from app.models.api_key import APIKey
from app.schemas.usage import (
    UsageTrackRequest,
    UsageRecordResponse,
    UsageSummaryResponse,
    UsageHistoryResponse,
    ChartDataPoint,
    ProviderStats,
    ModelStats,
)
from app.middleware.auth import require_user
from app.services.cost_service import get_cost
from datetime import datetime, timedelta

router = APIRouter(prefix="/usage", tags=["Usage"])


@router.post("/track", response_model=UsageRecordResponse)
async def track_usage(
    data: UsageTrackRequest,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Track a single API call's token usage."""
    total_tokens = data.prompt_tokens + data.completion_tokens

    # Calculate cost if not provided
    cost = data.cost_usd or get_cost(
        data.prompt_tokens,
        data.completion_tokens,
        data.provider,
        data.model,
    )

    record = UsageRecord(
        user_id=user_id,
        api_key_id=data.api_key_id,
        provider=data.provider,
        model=data.model,
        prompt_tokens=data.prompt_tokens,
        completion_tokens=data.completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost,
        prompt_text=data.prompt_text,
        response_text=data.response_text,
        response_id=data.response_id,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return record


@router.get("/summary", response_model=UsageSummaryResponse)
async def get_summary(
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get usage summary for the current user."""
    # Total stats
    result = await session.execute(
        select(
            func.sum(UsageRecord.total_tokens).label("total_tokens"),
            func.sum(UsageRecord.cost_usd).label("total_cost"),
            func.count(UsageRecord.id).label("total_calls"),
        ).where(UsageRecord.user_id == user_id)
    )
    row = result.one_or_none()
    total_tokens = row.total_tokens or 0
    total_cost = row.total_cost or 0.0
    total_calls = row.total_calls or 0

    # Active keys
    keys_result = await session.execute(
        select(func.count(APIKey.id)).where(
            APIKey.user_id == user_id,
            APIKey.active == True,  # noqa
        )
    )
    active_keys = keys_result.scalar() or 0

    # Provider breakdown
    provider_result = await session.execute(
        select(
            UsageRecord.provider,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.sum(UsageRecord.cost_usd).label("cost"),
            func.count(UsageRecord.id).label("calls"),
        )
        .where(UsageRecord.user_id == user_id)
        .group_by(UsageRecord.provider)
    )
    provider_breakdown = {
        r.provider: ProviderStats(
            tokens=r.tokens or 0,
            cost=float(r.cost or 0),
            calls=r.calls or 0,
        )
        for r in provider_result.all()
    }

    # Model breakdown
    model_result = await session.execute(
        select(
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.sum(UsageRecord.cost_usd).label("cost"),
            func.count(UsageRecord.id).label("calls"),
        )
        .where(UsageRecord.user_id == user_id)
        .group_by(UsageRecord.model)
        .order_by(desc("cost"))
        .limit(10)
    )
    model_breakdown = [
        ModelStats(
            model=r.model,
            tokens=r.tokens or 0,
            cost=float(r.cost or 0),
            calls=r.calls or 0,
        )
        for r in model_result.all()
    ]

    # Chart data (last 14 days)
    chart_data = []
    for i in range(14):
        date = datetime.utcnow() - timedelta(days=13 - i)
        day_result = await session.execute(
            select(
                func.sum(UsageRecord.total_tokens).label("tokens"),
                func.sum(UsageRecord.cost_usd).label("cost"),
            )
            .where(UsageRecord.user_id == user_id)
            .where(
                func.date(UsageRecord.created_at)
                == date.date()
            )
        )
        day_row = day_result.one_or_none()
        tokens = int(day_row.tokens or 0)
        cost = float(day_row.cost or 0)
        providers = ["openai", "anthropic", "gemini"]
        chart_data.append(
            ChartDataPoint(
                date=date.strftime("%Y-%m-%d"),
                tokens=tokens,
                cost=cost,
                provider=providers[i % 3],
            )
        )

    # Recent calls
    recent_result = await session.execute(
        select(UsageRecord)
        .where(UsageRecord.user_id == user_id)
        .order_by(desc(UsageRecord.created_at))
        .limit(10)
    )
    recent_calls = list(recent_result.all())

    avg_cost = total_cost / total_calls if total_calls > 0 else 0.0

    return UsageSummaryResponse(
        total_spend=total_cost,
        total_tokens=total_tokens,
        total_calls=total_calls,
        avg_cost_per_call=avg_cost,
        active_keys=active_keys,
        provider_breakdown=provider_breakdown,
        model_breakdown=model_breakdown,
        chart_data=chart_data,
        recent_calls=[UsageRecordResponse.model_validate(r) for r in recent_calls],
    )


@router.get("/history", response_model=UsageHistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    provider: str = None,
    model: str = None,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get paginated usage history."""
    query = select(UsageRecord).where(UsageRecord.user_id == user_id)

    if provider:
        query = query.where(UsageRecord.provider == provider)
    if model:
        query = query.where(UsageRecord.model == model)

    # Count total
    count_query = select(func.count(UsageRecord.id)).where(UsageRecord.user_id == user_id)
    if provider:
        count_query = count_query.where(UsageRecord.provider == provider)
    if model:
        count_query = count_query.where(UsageRecord.model == model)
    total = (await session.execute(count_query)).scalar() or 0

    # Paginated
    query = query.order_by(desc(UsageRecord.created_at)).offset((page - 1) * limit).limit(limit)
    result = await session.execute(query)
    records = list(result.all())

    return UsageHistoryResponse(
        records=[UsageRecordResponse.model_validate(r) for r in records],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/chart-data")
async def get_chart_data(
    period: str = Query("14d", pattern="^(7d|14d|30d)$"),
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get chart data for the specified period."""
    days = int(period.replace("d", ""))
    chart_data = []
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - 1 - i)
        day_result = await session.execute(
            select(
                UsageRecord.provider,
                func.sum(UsageRecord.total_tokens).label("tokens"),
                func.sum(UsageRecord.cost_usd).label("cost"),
            )
            .where(UsageRecord.user_id == user_id)
            .where(func.date(UsageRecord.created_at) == date.date())
            .group_by(UsageRecord.provider)
        )
        rows = day_result.all()
        if rows:
            for r in rows:
                chart_data.append(
                    ChartDataPoint(
                        date=date.strftime("%Y-%m-%d"),
                        tokens=int(r.tokens or 0),
                        cost=float(r.cost or 0),
                        provider=r.provider,
                    )
                )
        else:
            chart_data.append(
                ChartDataPoint(
                    date=date.strftime("%Y-%m-%d"),
                    tokens=0,
                    cost=0.0,
                    provider="openai",
                )
            )
    return chart_data
