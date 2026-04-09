from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid


class ProxyKey(SQLModel, table=True):
    __tablename__ = "proxy_keys"

    id: str = Field(primary_key=True, default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(index=True)
    key_hash: str = Field()  # SHA-256 of the proxy key
    key_label: str = Field(default="Default Key")
    active: bool = Field(default=True)
    rate_limit: int = Field(default=60)  # requests per minute
    auto_enhance: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProxyLog(SQLModel, table=True):
    __tablename__ = "proxy_logs"

    id: str = Field(primary_key=True, default_factory=lambda: str(uuid.uuid4()))
    proxy_key_id: str = Field(index=True)
    user_id: str = Field(index=True)
    provider: str = Field()  # openai | anthropic | gemini
    model: str = Field()

    # Request
    request_prompt: str = Field()
    request_tokens: int = Field(default=0)
    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)

    # Enhancement
    enhanced_prompt: str = Field(default=None)
    enhancement_applied: bool = Field(default=False)
    enhancement_cost: float = Field(default=0.0)

    # Response
    response_text: str = Field(default=None)
    response_tokens: int = Field(default=0)
    raw_response: str = Field(default=None)

    # Cost
    prompt_cost: float = Field(default=0.0)
    completion_cost: float = Field(default=0.0)
    total_cost: float = Field(default=0.0)

    # Performance
    latency_ms: int = Field(default=0)
    status_code: int = Field(default=200)
    error_message: str = Field(default=None)

    # Metadata
    endpoint: str = Field(default="chat/completions")
    ip_address: str = Field(default=None)
    user_agent: str = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
