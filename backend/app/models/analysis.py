from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import uuid


class PromptAnalysis(SQLModel, table=True):
    __tablename__ = "prompt_analyses"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    original_prompt: str = Field()
    optimized_prompt: Optional[str] = Field(default=None)
    original_tokens: int = Field()
    optimized_tokens: Optional[int] = Field(default=None)
    saved_tokens: Optional[int] = Field(default=None)
    saved_cost_usd: Optional[float] = Field(default=None)
    model: str = Field()
    provider: str = Field()
    created_at: datetime = Field(default_factory=datetime.utcnow)
