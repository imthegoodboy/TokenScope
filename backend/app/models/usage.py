from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import uuid


class UsageRecord(SQLModel, table=True):
    __tablename__ = "usage_records"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    api_key_id: Optional[str] = Field(default=None, index=True)
    provider: str = Field(index=True)
    model: str = Field()
    prompt_tokens: int = Field()
    completion_tokens: int = Field()
    total_tokens: int = Field()
    cost_usd: float = Field()
    prompt_text: Optional[str] = Field(default=None)
    response_text: Optional[str] = Field(default=None)
    response_id: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
