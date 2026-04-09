from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_session
from app.middleware.auth import require_user
from app.models.proxy import ProxyLog, ProxyKey
from datetime import date

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/realtime")
async def get_realtime_stats(
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Get real-time stats for the current user from proxy logs."""
    pk_ids = await session.execute(
        select(ProxyKey.id).where(ProxyKey.user_id == user_id, ProxyKey.active == True)  # noqa
    )
    proxy_key_ids = [r[0] for r in pk_ids.all()]

    if not proxy_key_ids:
        return {
            "tokens_today": 0,
            "cost_today": 0.0,
            "calls_today": 0,
        }

    today = date.today()
    result = await session.execute(
        select(
            func.sum(ProxyLog.total_tokens).label("tokens"),
            func.sum(ProxyLog.total_cost).label("cost"),
            func.count(ProxyLog.id).label("calls"),
        ).where(
            ProxyLog.proxy_key_id.in_(proxy_key_ids),  # type: ignore
            func.date(ProxyLog.created_at) == today,
        )
    )
    row = result.one_or_none()

    return {
        "tokens_today": int(row.tokens or 0) if row else 0,
        "cost_today": round(float(row.cost or 0), 4) if row else 0.0,
        "calls_today": row.calls or 0 if row else 0,
    }
