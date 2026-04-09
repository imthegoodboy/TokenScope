from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_session
from app.models.api_key import APIKey
from app.models.usage import UsageRecord
from app.schemas.keys import APIKeyCreate, APIKeyResponse
from app.middleware.auth import require_user
import hashlib

router = APIRouter(prefix="/keys", tags=["API Keys"])


def hash_api_key(key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


def get_last4(key: str) -> str:
    """Get the last 4 characters of a key."""
    return key[-4:] if len(key) >= 4 else key


@router.post("/", response_model=APIKeyResponse)
async def add_api_key(
    data: APIKeyCreate,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Add a new API key for the user."""
    key_hash = hash_api_key(data.api_key)
    key_last4 = get_last4(data.api_key)

    # Check for duplicates
    existing = await session.execute(
        select(APIKey).where(
            APIKey.user_id == user_id,
            APIKey.key_hash == key_hash,
        )
    )
    if existing.one_or_none():
        raise HTTPException(status_code=400, detail="API key already exists")

    api_key = APIKey(
        user_id=user_id,
        provider=data.provider,
        key_hash=key_hash,
        key_label=data.key_label,
        key_last4=key_last4,
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
    """List all API keys for the user."""
    result = await session.execute(
        select(APIKey).where(APIKey.user_id == user_id).order_by(APIKey.created_at.desc())
    )
    keys = result.all()

    response = []
    for key in keys:
        # Get usage stats for this key
        usage_result = await session.execute(
            select(
                func.count(UsageRecord.id).label("usage_count"),
                func.sum(UsageRecord.cost_usd).label("total_spent"),
            ).where(UsageRecord.api_key_id == key.id)
        )
        usage = usage_result.one_or_none()

        response.append(
            APIKeyResponse(
                id=key.id,
                provider=key.provider,
                key_label=key.key_label,
                key_last4=key.key_last4,
                active=key.active,
                created_at=key.created_at,
                usage_count=usage.usage_count or 0 if usage else 0,
                total_spent=float(usage.total_spent or 0) if usage else 0.0,
            )
        )

    return response


@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete an API key."""
    result = await session.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == user_id,
        )
    )
    key = result.one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    await session.delete(key)
    await session.commit()
    return {"status": "deleted"}
