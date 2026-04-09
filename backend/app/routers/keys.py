from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from ..database import ProxyKey, get_db
from ..schemas import ProxyKeyCreate, ProxyKeyResponse, ProxyKeyUpdate
import secrets
import httpx

router = APIRouter()

def get_user_id(x_user_id: str = Header(default=None)) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    return x_user_id

@router.post("/keys", response_model=ProxyKeyResponse)
async def create_proxy_key(
    key_data: ProxyKeyCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    proxy_id = secrets.token_urlsafe(12)

    async with httpx.AsyncClient() as client:
        try:
            if key_data.provider == "openai":
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {key_data.api_key}"},
                    timeout=5.0
                )
            elif key_data.provider == "gemini":
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={key_data.api_key}",
                    timeout=5.0
                )
            elif key_data.provider == "anthropic":
                response = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={"x-api-key": key_data.api_key},
                    timeout=5.0
                )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid API key")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not validate API key: {str(e)}")

    proxy_key = ProxyKey(
        user_id=user_id,
        proxy_id=proxy_id,
        api_key=key_data.api_key,
        provider=key_data.provider,
        model=key_data.model,
        temperature=key_data.temperature,
        max_tokens=key_data.max_tokens,
        system_prompt=key_data.system_prompt,
        auto_enhance=key_data.auto_enhance
    )
    db.add(proxy_key)
    await db.commit()
    await db.refresh(proxy_key)
    return proxy_key

@router.get("/keys", response_model=list[ProxyKeyResponse])
async def list_proxy_keys(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(ProxyKey).where(ProxyKey.user_id == user_id, ProxyKey.is_active == True)
    )
    return result.scalars().all()

@router.get("/keys/{proxy_id}", response_model=ProxyKeyResponse)
async def get_proxy_key(
    proxy_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(ProxyKey).where(ProxyKey.proxy_id == proxy_id, ProxyKey.user_id == user_id)
    )
    proxy_key = result.scalar_one_or_none()
    if not proxy_key:
        raise HTTPException(status_code=404, detail="Proxy key not found")
    return proxy_key

@router.put("/keys/{proxy_id}", response_model=ProxyKeyResponse)
async def update_proxy_key(
    proxy_id: str,
    key_data: ProxyKeyUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        select(ProxyKey).where(ProxyKey.proxy_id == proxy_id, ProxyKey.user_id == user_id)
    )
    proxy_key = result.scalar_one_or_none()
    if not proxy_key:
        raise HTTPException(status_code=404, detail="Proxy key not found")

    update_data = key_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(proxy_key, key, value)

    await db.commit()
    await db.refresh(proxy_key)
    return proxy_key

@router.delete("/keys/{proxy_id}")
async def delete_proxy_key(
    proxy_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    result = await db.execute(
        update(ProxyKey)
        .where(ProxyKey.proxy_id == proxy_id, ProxyKey.user_id == user_id)
        .values(is_active=False)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Proxy key not found")
    await db.commit()
    return {"message": "Proxy key deleted"}
