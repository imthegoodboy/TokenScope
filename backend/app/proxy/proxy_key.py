import hashlib
import secrets
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.proxy import ProxyKey
from app.models.api_key import APIKey


def generate_proxy_key() -> str:
    """Generate a secure proxy key: tsk_live_xxxx..."""
    token = secrets.token_urlsafe(32)
    return f"tsk_live_{token}"


def hash_proxy_key(key: str) -> str:
    """Hash a proxy key for storage."""
    return hashlib.sha256(key.encode()).hexdigest()


def verify_proxy_key(key: str, stored_hash: str) -> bool:
    """Verify a proxy key against its hash."""
    return hashlib.sha256(key.encode()).hexdigest() == stored_hash


async def get_proxy_key(db: AsyncSession, key: str) -> Optional[ProxyKey]:
    """Look up a proxy key by the key itself."""
    key_hash = hash_proxy_key(key)
    result = await db.execute(
        select(ProxyKey).where(
            ProxyKey.key_hash == key_hash,
            ProxyKey.active == True  # noqa
        )
    )
    return result.one_or_none()


async def get_user_provider_key(db: AsyncSession, user_id: str, provider: str) -> Optional[APIKey]:
    """Get the user's provider API key for a given provider."""
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == user_id,
            APIKey.provider == provider,
            APIKey.active == True  # noqa
        ).limit(1)
    )
    return result.one_or_none()


async def create_proxy_key(db: AsyncSession, user_id: str, label: str = "Default Key") -> tuple[ProxyKey, str]:
    """Create a new proxy key for a user. Returns the key object and the raw key."""
    raw_key = generate_proxy_key()
    key_hash = hash_proxy_key(raw_key)
    proxy_key = ProxyKey(
        user_id=user_id,
        key_hash=key_hash,
        key_label=label,
    )
    db.add(proxy_key)
    await db.commit()
    await db.refresh(proxy_key)
    return proxy_key, raw_key
