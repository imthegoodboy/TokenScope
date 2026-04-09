from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_session
from app.models.api_key import APIKey, encrypt_key
from app.models.proxy import ProxyLog, ProxyKey
from app.models.usage import UsageRecord
from app.schemas.keys import APIKeyCreate, APIKeyResponse
from app.middleware.auth import require_user

router = APIRouter(prefix="/keys", tags=["API Keys"])


@router.post("/", response_model=APIKeyResponse)
async def add_api_key(
    data: APIKeyCreate,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Add a new provider API key for the user."""
    encrypted = encrypt_key(data.api_key)

    api_key = APIKey(
        user_id=user_id,
        provider=data.provider,
        encrypted_key=encrypted,
        key_label=data.key_label,
    )
    session.add(api_key)
    await session.commit()
    await session.refresh(api_key)

    return APIKeyResponse(
        id=api_key.id,
        provider=api_key.provider,
        key_label=api_key.key_label,
        key_last4=api_key.key_last4,
        active=api_key.active,
        created_at=api_key.created_at,
    )


@router.get("/", response_model=list[APIKeyResponse])
async def list_api_keys(
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """List all provider API keys for the user."""
    result = await session.execute(
        select(APIKey).where(APIKey.user_id == user_id).order_by(APIKey.created_at.desc())
    )
    keys = result.scalars().all()

    response = []
    for key in keys:
        # Get proxy log stats for this provider (grouped by provider)
        pk_ids = await session.execute(
            select(ProxyKey.id).where(ProxyKey.user_id == user_id)
        )
        proxy_key_ids = [r[0] for r in pk_ids.all()]

        log_result = await session.execute(
            select(
                func.count(ProxyLog.id).label("usage_count"),
                func.sum(ProxyLog.total_cost).label("total_spent"),
            ).where(
                ProxyLog.proxy_key_id.in_(proxy_key_ids),  # type: ignore
                ProxyLog.provider == key.provider,
            )
        )
        log_stats = log_result.one_or_none()

        response.append(APIKeyResponse(
            id=key.id,
            provider=key.provider,
            key_label=key.key_label,
            key_last4=key.key_last4,
            active=key.active,
            created_at=key.created_at,
            usage_count=log_stats.usage_count if log_stats and log_stats.usage_count else 0,
            total_spent=float(log_stats.total_spent or 0) if log_stats else 0.0,
        ))

    return response


@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a provider API key."""
    result = await session.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == user_id,
        )
    )
    key = result.scalars().first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    await session.delete(key)
    await session.commit()
    return {"status": "deleted"}
