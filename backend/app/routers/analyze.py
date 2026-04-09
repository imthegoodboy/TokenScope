from fastapi import APIRouter, Depends
from app.schemas.analyze import (
    AnalyzePromptRequest,
    AnalyzePromptResponse,
    OptimizePromptRequest,
    OptimizePromptResponse,
    TokenScore,
)
from app.middleware.auth import require_user
from app.services import token_service, cost_service, tfidf_service

router = APIRouter(prefix="/analyze", tags=["Analyzer"])


@router.post("/prompt", response_model=AnalyzePromptResponse)
async def analyze_prompt(
    data: AnalyzePromptRequest,
    user_id: str = Depends(require_user),
):
    """Analyze a prompt: token count, cost estimation, TF-IDF importance."""
    prompt = data.prompt

    # Tokenize and count
    tokens = token_service.count_tokens(prompt, data.provider, data.model)
    word_count = len(prompt.split())
    char_count = len(prompt)

    # Cost estimation
    est_input = cost_service.estimate_cost(prompt, data.provider, data.model, is_completion=False)
    # Estimate completion tokens as ~70% of prompt length
    completion_text = "x" * int(tokens * 0.7)
    est_output = cost_service.estimate_cost(completion_text, data.provider, data.model, is_completion=True)

    # TF-IDF scores
    word_scores = tfidf_service.compute_tfidf_scores(prompt)
    token_scores = [
        TokenScore(token=t["token"], score=t["score"], importance=t["importance"])
        for t in word_scores
    ]
    top_important = sorted(token_scores, key=lambda x: x.score, reverse=True)[:10]

    return AnalyzePromptResponse(
        tokens=tokens,
        word_count=word_count,
        char_count=char_count,
        estimated_cost_input=est_input,
        estimated_cost_output=est_output,
        estimated_cost_total=est_input + est_output,
        token_scores=token_scores,
        top_important=top_important,
    )


@router.post("/optimize", response_model=OptimizePromptResponse)
async def optimize_prompt(
    data: OptimizePromptRequest,
    user_id: str = Depends(require_user),
):
    """Get an optimized version of the prompt using TF-IDF."""
    result = tfidf_service.optimize_prompt(
        data.prompt,
        target_tokens=data.target_tokens,
    )

    optimized_tokens = token_service.count_tokens(result["optimized"], data.provider, data.model)
    original_tokens = token_service.count_tokens(data.prompt, data.provider, data.model)
    saved_tokens = original_tokens - optimized_tokens

    # Cost difference
    saved_cost_input = cost_service.estimate_cost(
        " ".join([t["token"] for t in result["kept_key_tokens"][:optimized_tokens]]),
        data.provider,
        data.model,
        is_completion=False,
    )
    saved_cost_total = saved_cost_input * 1.7  # Include estimated output

    return OptimizePromptResponse(
        original=data.prompt,
        optimized=result["optimized"],
        original_tokens=original_tokens,
        optimized_tokens=optimized_tokens,
        saved_tokens=saved_tokens,
        saved_cost_input=saved_cost_input,
        saved_cost_output=saved_cost_input * 0.7,
        saved_cost_total=saved_cost_total,
        kept_key_tokens=[
            TokenScore(token=t["token"], score=t["score"], importance=t["importance"])
            for t in result["kept_key_tokens"]
        ],
    )
