from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import uuid


class APIKey(SQLModel, table=True):
    __tablename__ = "api_keys"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    provider: str = Field()
    key_hash: str = Field()
    key_label: Optional[str] = Field(default=None)
    key_last4: str = Field()
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
