from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
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
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get proxy logs for the user's proxy keys."""
    # Find proxy keys for this user
    pk_result = await session.execute(
        select(ProxyKey.id).where(ProxyKey.user_id == user_id, ProxyKey.active == True)  # noqa
    )
    proxy_key_ids = [r[0] for r in pk_result.all()]

    if not proxy_key_ids:
        return LogsResponse(logs=[], total=0, page=page, limit=limit, total_spend=0.0, total_requests=0)

    # Base query
    query = select(ProxyLog).where(
        ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
    )

    if provider:
        query = query.where(ProxyLog.provider == provider)
    if model:
        query = query.where(ProxyLog.model == model)

    # Count total
    count_query = select(func.count(ProxyLog.id)).where(
        ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
    )
    total = (await session.execute(count_query)).scalar() or 0

    # Fetch page
    query = query.order_by(desc(ProxyLog.created_at)).offset((page - 1) * limit).limit(limit)
    result = await session.execute(query)
    logs = result.all()

    # Stats
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
                request_prompt=log.request_prompt[:200] if log.request_prompt else "",
                request_tokens=log.request_tokens,
                response_text=log.response_text[:500] if log.response_text else None,
                response_tokens=log.response_tokens,
                total_tokens=log.total_tokens,
                total_cost=log.total_cost,
                latency_ms=log.latency_ms,
                status_code=log.status_code,
                error_message=log.error_message,
                enhancement_applied=log.enhancement_applied,
                enhanced_prompt=log.enhanced_prompt[:200] if log.enhanced_prompt else None,
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
    """Get overall stats for the user."""
    # Get proxy keys
    pk_result = await session.execute(
        select(ProxyKey.id).where(ProxyKey.user_id == user_id, ProxyKey.active == True)  # noqa
    )
    proxy_key_ids = [r[0] for r in pk_result.all()]

    if not proxy_key_ids:
        return {
            "total_requests": 0,
            "total_spend": 0,
            "avg_tokens_per_request": 0,
            "avg_latency_ms": 0,
            "success_rate": 100.0,
        }

    result = await session.execute(
        select(
            func.count(ProxyLog.id).label("count"),
            func.sum(ProxyLog.total_cost).label("spend"),
            func.avg(ProxyLog.total_tokens).label("avg_tokens"),
            func.avg(ProxyLog.latency_ms).label("avg_latency"),
            func.count(
                # type: ignore
            ).filter(ProxyLog.status_code >= 200, ProxyLog.status_code < 300).label("success"),
        ).where(
            ProxyLog.proxy_key_id.in_(proxy_key_ids)  # type: ignore
        )
    )
    row = result.one_or_none()

    count = row.count if row else 0
    success = row.success if row and hasattr(row, "success") else count

    return {
        "total_requests": count or 0,
        "total_spend": float(row.spend or 0) if row else 0.0,
        "avg_tokens_per_request": float(row.avg_tokens or 0) if row else 0,
        "avg_latency_ms": int(row.avg_latency or 0) if row else 0,
        "success_rate": round((success / count * 100), 1) if count > 0 else 100.0,
    }
