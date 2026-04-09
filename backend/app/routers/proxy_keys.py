from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_session
from app.proxy.proxy_key import create_proxy_key, get_proxy_key as get_pk
from app.middleware.auth import require_user
from pydantic import BaseModel

router = APIRouter(prefix="/proxy-keys", tags=["Proxy Keys"])


class CreateProxyKeyRequest(BaseModel):
    label: str = "Default"


class ProxyKeyResponse(BaseModel):
    id: str
    key_label: str
    active: bool
    rate_limit: int
    auto_enhance: bool
    created_at: str


class ProxyKeyWithSecretResponse(BaseModel):
    id: str
    key: str  # The actual proxy key (only shown once!
    key_label: str
    active: bool
    rate_limit: int
    auto_enhance: bool
    created_at: str


@router.post("/", response_model=ProxyKeyWithSecretResponse)
async def create_key(
    body: CreateProxyKeyRequest,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new proxy API key. The raw key is only shown ONCE — store it securely."""
    proxy_key, raw_key = await create_proxy_key(session, user_id, body.label)
    return ProxyKeyWithSecretResponse(
        id=proxy_key.id,
        key=raw_key,
        key_label=proxy_key.key_label,
        active=proxy_key.active,
        rate_limit=proxy_key.rate_limit,
        auto_enhance=proxy_key.auto_enhance,
        created_at=proxy_key.created_at.isoformat(),
    )


@router.get("/", response_model=list[ProxyKeyResponse])
async def list_proxy_keys(
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """List all proxy keys for the user (does NOT include raw keys)."""
    from app.models.proxy import ProxyKey
    result = await session.execute(
        select(ProxyKey).where(ProxyKey.user_id == user_id).order_by(ProxyKey.created_at.desc())
    )
    keys = result.all()
    return [
        ProxyKeyResponse(
            id=k.id,
            key_label=k.key_label,
            active=k.active,
            rate_limit=k.rate_limit,
            auto_enhance=k.auto_enhance,
            created_at=k.created_at.isoformat(),
        )
        for k in keys
    ]


@router.delete("/{key_id}")
async def delete_proxy_key(
    key_id: str,
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a proxy key."""
    from app.models.proxy import ProxyKey
    result = await session.execute(
        select(ProxyKey).where(
            ProxyKey.id == key_id,
            ProxyKey.user_id == user_id,
        )
    )
    key = result.one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="Proxy key not found")

    key.active = False
    await session.commit()
    return {"status": "disabled"}


@router.patch("/{key_id}/toggle-enhance")
async def toggle_enhance(
    key_id: str,
    enabled: bool = Query(..., description="Enable (true) or disable (false) auto-enhancement"),
    user_id: str = Depends(require_user),
    session: AsyncSession = Depends(get_session),
):
    """Toggle auto-enhancement for a proxy key."""
    from app.models.proxy import ProxyKey
    result = await session.execute(
        select(ProxyKey).where(
            ProxyKey.id == key_id,
            ProxyKey.user_id == user_id,
        )
    )
    key = result.one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="Proxy key not found")

    key.auto_enhance = enabled
    await session.commit()
    return {"auto_enhance": key.auto_enhance}
