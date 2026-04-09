from fastapi import APIRouter, Body
from pydantic import BaseModel
from ..services.tfidf_engine import TFIDFEngine

router = APIRouter()
tfidf_engine = TFIDFEngine()

class AnalyzeRequest(BaseModel):
    prompt: str
    target_model: str = "chatgpt"

class EnhanceRequest(BaseModel):
    prompt: str
    target_model: str = "chatgpt"

@router.post("/analyze")
async def analyze_prompt(request: AnalyzeRequest):
    scores = tfidf_engine.analyze(request.prompt)

    tokens = request.prompt.split()
    token_scores = [
        {
            "token": token,
            "score": scores.get(token, 0.0),
            "importance": "high" if scores.get(token, 0) > 0.5 else "medium" if scores.get(token, 0) > 0.2 else "low"
        }
        for token in tokens
    ]

    current_tokens = len(tokens)
    current_cost = tfidf_engine.estimate_cost(request.prompt, request.target_model)

    enhanced = tfidf_engine.enhance_prompt(request.prompt)
    enhanced_tokens = len(enhanced.split())
    enhanced_cost = tfidf_engine.estimate_cost(enhanced, request.target_model)

    return {
        "original": {
            "text": request.prompt,
            "tokens": current_tokens,
            "estimated_cost": current_cost
        },
        "token_scores": token_scores,
        "suggestion": {
            "text": enhanced,
            "tokens": enhanced_tokens,
            "estimated_cost": enhanced_cost,
            "token_savings": current_tokens - enhanced_tokens,
            "cost_savings_percent": ((current_cost - enhanced_cost) / current_cost * 100) if current_cost > 0 else 0
        }
    }

@router.post("/enhance")
async def enhance_prompt(request: EnhanceRequest):
    enhanced = tfidf_engine.enhance_prompt(request.prompt)

    return {
        "original": request.prompt,
        "enhanced": enhanced,
        "original_tokens": len(request.prompt.split()),
        "enhanced_tokens": len(enhanced.split())
    }
