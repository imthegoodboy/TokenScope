from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from app.database import get_session
from app.middleware.auth import require_user
from app.models.proxy import ProxyLog, ProxyKey
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/logs", tags=["Proxy Logs"])


class LogResponse(BaseModel):
    id: str
    provider: str
    model: str
    request_prompt: str
    request_tokens: int
    response_text: str | None
    response_tokens: int
    total_tokens: int
    total_cost: float
    latency_ms: int
    status_code: int
    error_message: str | None
    enhancement_applied: bool
    enhanced_prompt: str | None
    created_at: str


class LogsResponse(BaseModel):
    logs: list[LogResponse]
    total: int
    page: int
    limit: int
    total_spend: float
    total_requests: int


@router.get("/", response_model=LogsResponse)
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    provider: str | None = None,
    model: str | None = None,
    search: str | None = None,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get proxy logs for the user's proxy keys."""
    pk_result = await session.execute(
        select(ProxyKey.id).where(ProxyKey.user_id == user_id)
    )
    proxy_key_ids = [r[0] for r in pk_result.all()]

    if not proxy_key_ids:
        return LogsResponse(logs=[], total=0, page=page, limit=limit, total_spend=0.0, total_requests=0)

    query = select(ProxyLog).where(
        ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
    )
    count_query = select(func.count(ProxyLog.id)).where(
        ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
    )

    if provider:
        query = query.where(ProxyLog.provider == provider)
        count_query = count_query.where(ProxyLog.provider == provider)
    if model:
        query = query.where(ProxyLog.model == model)
        count_query = count_query.where(ProxyLog.model == model)
    if search:
        query = query.where(ProxyLog.request_prompt.ilike(f"%{search}%"))
        count_query = count_query.where(ProxyLog.request_prompt.ilike(f"%{search}%"))

    total = (await session.execute(count_query)).scalar() or 0

    query = query.order_by(desc(ProxyLog.created_at)).offset((page - 1) * limit).limit(limit)
    result = await session.execute(query)
    logs = result.scalars().all()

    stats_result = await session.execute(
        select(
            func.sum(ProxyLog.total_cost).label("total_spend"),
            func.count(ProxyLog.id).label("total_requests"),
        ).where(
            ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
        )
    )
    stats = stats_result.one_or_none()

    return LogsResponse(
        logs=[
            LogResponse(
                id=log.id,
                provider=log.provider,
                model=log.model,
                request_prompt=log.request_prompt[:300] if log.request_prompt else "",
                request_tokens=log.request_tokens,
                response_text=log.response_text[:500] if log.response_text else None,
                response_tokens=log.completion_tokens,
                total_tokens=log.total_tokens,
                total_cost=log.total_cost,
                latency_ms=log.latency_ms,
                status_code=log.status_code,
                error_message=log.error_message,
                enhancement_applied=log.enhancement_applied,
                enhanced_prompt=log.enhanced_prompt[:300] if log.enhanced_prompt else None,
                created_at=log.created_at.isoformat(),
            )
            for log in logs
        ],
        total=total,
        page=page,
        limit=limit,
        total_spend=float(stats.total_spend or 0) if stats else 0.0,
        total_requests=stats.total_requests or 0 if stats else 0,
    )


@router.get("/stats")
async def get_stats(
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get overall proxy stats for the user."""
    pk_result = await session.execute(
        select(ProxyKey.id).where(ProxyKey.user_id == user_id)
    )
    proxy_key_ids = [r[0] for r in pk_result.all()]

    if not proxy_key_ids:
        return {
            "total_requests": 0,
            "total_spend": 0.0,
            "avg_tokens_per_request": 0,
            "avg_latency_ms": 0,
            "success_rate": 100.0,
            "avg_cost_per_request": 0.0,
            "prompt_tokens_total": 0,
            "completion_tokens_total": 0,
        }

    result = await session.execute(
        select(
            func.count(ProxyLog.id).label("count"),
            func.sum(ProxyLog.total_cost).label("spend"),
            func.avg(ProxyLog.total_tokens).label("avg_tokens"),
            func.avg(ProxyLog.latency_ms).label("avg_latency"),
            func.sum(ProxyLog.prompt_tokens).label("prompt_tokens"),
            func.sum(ProxyLog.completion_tokens).label("completion_tokens"),
            func.avg(ProxyLog.total_cost).label("avg_cost"),
            func.sum(
                case((ProxyLog.status_code >= 200, 1), else_=0)  # type: ignore
            ).label("success"),
        ).where(
            ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
        )
    )
    row = result.one_or_none()

    count = row.count if row and row.count else 0
    success = row.success if row and row.success else 0

    return {
        "total_requests": count,
        "total_spend": float(row.spend or 0) if row else 0.0,
        "avg_tokens_per_request": int(row.avg_tokens or 0) if row else 0,
        "avg_latency_ms": int(row.avg_latency or 0) if row else 0,
        "success_rate": round((success / count * 100), 1) if count > 0 else 100.0,
        "avg_cost_per_request": float(row.avg_cost or 0) if row else 0.0,
        "prompt_tokens_total": int(row.prompt_tokens or 0) if row else 0,
        "completion_tokens_total": int(row.completion_tokens or 0) if row else 0,
    }


@router.get("/breakdown")
async def get_breakdown(
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get provider and model breakdown for the user."""
    pk_result = await session.execute(
        select(ProxyKey.id).where(ProxyKey.user_id == user_id)
    )
    proxy_key_ids = [r[0] for r in pk_result.all()]

    if not proxy_key_ids:
        return {"providers": {}, "models": []}

    # Provider breakdown
    provider_result = await session.execute(
        select(
            ProxyLog.provider,
            func.sum(ProxyLog.total_tokens).label("tokens"),
            func.sum(ProxyLog.total_cost).label("cost"),
            func.count(ProxyLog.id).label("calls"),
        ).where(
            ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
        ).group_by(ProxyLog.provider)
    )

    providers = {}
    for r in provider_result.all():
        providers[r.provider] = {
            "tokens": int(r.tokens or 0),
            "cost": float(r.cost or 0),
            "calls": r.calls or 0,
        }

    # Model breakdown
    model_result = await session.execute(
        select(
            ProxyLog.model,
            ProxyLog.provider,
            func.sum(ProxyLog.total_tokens).label("tokens"),
            func.sum(ProxyLog.total_cost).label("cost"),
            func.count(ProxyLog.id).label("calls"),
        ).where(
            ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
        ).group_by(ProxyLog.model, ProxyLog.provider).order_by(desc("cost")).limit(10)
    )

    models = [
        {
            "model": r.model,
            "provider": r.provider,
            "tokens": int(r.tokens or 0),
            "cost": float(r.cost or 0),
            "calls": r.calls or 0,
        }
        for r in model_result.all()
    ]

    return {"providers": providers, "models": models}


@router.get("/chart")
async def get_chart_data(
    period: str = Query("14d", pattern="^(7d|14d|30d)$"),
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get chart data for the specified period."""
    from datetime import timedelta

    days = int(period.replace("d", ""))
    chart_data = []
    for i in range(days):
        day = datetime.utcnow() - timedelta(days=days - 1 - i)
        day_result = await session.execute(
            select(
                ProxyLog.provider,
                func.sum(ProxyLog.total_tokens).label("tokens"),
                func.sum(ProxyLog.total_cost).label("cost"),
                func.count(ProxyLog.id).label("calls"),
            ).where(
                ProxyLog.proxy_key_id.in_(
                    select(ProxyKey.id).where(
                        ProxyKey.user_id == user_id,
                    )
                )
            ).where(
                func.date(ProxyLog.created_at) == day.date()
            ).group_by(ProxyLog.provider)
        )
        rows = day_result.all()
        if rows:
            for r in rows:
                chart_data.append({
                    "date": day.strftime("%Y-%m-%d"),
                    "tokens": int(r.tokens or 0),
                    "cost": float(r.cost or 0),
                    "provider": r.provider,
                    "calls": r.calls or 0,
                })
        else:
            # No data for this day
            chart_data.append({
                "date": day.strftime("%Y-%m-%d"),
                "tokens": 0,
                "cost": 0.0,
                "provider": "openai",
                "calls": 0,
            })
    return chart_data
