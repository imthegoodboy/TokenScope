from pydantic import BaseModel
from typing import Optional


class TokenScore(BaseModel):
    token: str
    score: float
    importance: str


class AnalyzePromptRequest(BaseModel):
    prompt: str
    model: str
    provider: str


class AnalyzePromptResponse(BaseModel):
    tokens: int
    word_count: int
    char_count: int
    estimated_cost_input: float
    estimated_cost_output: float
    estimated_cost_total: float
    token_scores: list[TokenScore]
    top_important: list[TokenScore]


class OptimizePromptRequest(BaseModel):
    prompt: str
    model: str
    provider: str
    target_tokens: Optional[int] = None


class OptimizePromptResponse(BaseModel):
    original: str
    optimized: str
    original_tokens: int
    optimized_tokens: int
    saved_tokens: int
    saved_cost_input: float
    saved_cost_output: float
    saved_cost_total: float
    kept_key_tokens: list[TokenScore]
