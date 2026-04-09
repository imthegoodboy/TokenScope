from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProxyKeyCreate(BaseModel):
    api_key: str
    provider: str  # openai, gemini, anthropic
    model: str
    temperature: float = 0.7
    max_tokens: int = 2048
    system_prompt: Optional[str] = None
    auto_enhance: bool = False

class ProxyKeyUpdate(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None
    auto_enhance: Optional[bool] = None

class ProxyKeyResponse(BaseModel):
    id: int
    user_id: str
    proxy_id: str
    provider: str
    model: str
    temperature: float
    max_tokens: int
    system_prompt: Optional[str]
    auto_enhance: bool
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
