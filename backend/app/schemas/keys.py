from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class APIKeyCreate(BaseModel):
    provider: str
    api_key: str
    key_label: Optional[str] = None


class APIKeyResponse(BaseModel):
    id: str
    provider: str
    key_label: Optional[str]
    key_last4: str
    active: bool
    created_at: datetime
    usage_count: Optional[int] = None
    total_spent: Optional[float] = None


class APIKeyListResponse(BaseModel):
    keys: list[APIKeyResponse]
