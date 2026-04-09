from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UsageTrackRequest(BaseModel):
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    api_key_id: Optional[str] = None
    prompt_text: Optional[str] = None
    response_text: Optional[str] = None
    response_id: Optional[str] = None
    timestamp: Optional[str] = None


class UsageRecordResponse(BaseModel):
    id: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    created_at: datetime
    prompt_text: Optional[str] = None
    response_text: Optional[str] = None


class ProviderStats(BaseModel):
    tokens: int
    cost: float
    calls: int


class ModelStats(BaseModel):
    model: str
    tokens: int
    cost: float
    calls: int


class ChartDataPoint(BaseModel):
    date: str
    tokens: int
    cost: float
    provider: str


class UsageSummaryResponse(BaseModel):
    total_spend: float
    total_tokens: int
    total_calls: int
    avg_cost_per_call: float
    active_keys: int
    provider_breakdown: dict[str, ProviderStats]
    model_breakdown: List[ModelStats]
    chart_data: List[ChartDataPoint]
    recent_calls: List[UsageRecordResponse]


class UsageHistoryResponse(BaseModel):
    records: List[UsageRecordResponse]
    total: int
    page: int
    limit: int
