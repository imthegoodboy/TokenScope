import time
import json
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_session
from app.proxy.proxy_key import get_proxy_key
from app.models.api_key import APIKey
from app.models.proxy import ProxyLog
from app.proxy.forwarder import (
    forward_to_provider,
    ProxyError,
    count_tokens_openai,
)
from app.services.cost_service import get_cost
from datetime import datetime

router = APIRouter(tags=["Proxy"])


def extract_provider_from_model(model: str) -> str:
    model = model.lower()
    if any(x in model for x in ["claude", "sonnet", "haiku", "opus"]):
        return "anthropic"
    if "gemini" in model:
        return "gemini"
    return "openai"


async def get_proxy_key_session(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> tuple[dict, AsyncSession]:
    """Validate proxy key from Authorization header."""
    auth = request.headers.get("authorization", "")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header. Use: Bearer tsk_live_xxxxx",
        )

    raw_key = auth.replace("Bearer ", "")
    proxy_key = await get_proxy_key(session, raw_key)
    if not proxy_key:
        raise HTTPException(status_code=401, detail="Invalid proxy key")

    return proxy_key, session


@router.api_route("/v1/chat/completions", methods=["POST"])
async def chat_completions(
    body: dict,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Proxy chat completion requests. Core of the TokenScope gateway."""
    # Authenticate
    auth = request.headers.get("authorization", "")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header. Use: Bearer <your_proxy_key>",
        )

    raw_key = auth.replace("Bearer ", "")
    proxy_key_obj = await get_proxy_key(session, raw_key)
    if not proxy_key_obj:
        raise HTTPException(status_code=401, detail="Invalid proxy key")

    user_id = proxy_key_obj.user_id
    model = body.get("model", "gpt-4o")
    provider = extract_provider_from_model(model)
    messages = body.get("messages", [])

    # Build prompt text from messages
    prompt_text = "\n".join(
        f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages
    )

    # Count input tokens
    input_tokens = count_tokens_openai(prompt_text, model)

    # Get user's provider API key
    result = await session.execute(
        select(APIKey).where(
            APIKey.user_id == user_id,
            APIKey.provider == provider,
            APIKey.active == True,  # noqa
        ).limit(1)
    )
    api_key_obj = result.one_or_none()
    if not api_key_obj:
        raise HTTPException(
            status_code=400,
            detail=f"No active {provider} API key found. Add one in your dashboard at /dashboard/keys",
        )

    # Decrypt the provider API key
    try:
        provider_api_key = api_key_obj.get_decrypted_key()
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to decrypt API key. Please re-add it.",
        )

    # Extract other params
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 2048)

    # ── Log the incoming request ──────────────────────────────────────
    log = ProxyLog(
        proxy_key_id=proxy_key_obj.id,
        user_id=user_id,
        provider=provider,
        model=model,
        request_prompt=prompt_text,
        request_tokens=input_tokens,
        endpoint="/v1/chat/completions",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    session.add(log)
    await session.flush()

    # ── Forward to provider ─────────────────────────────────────────
    try:
        forward_result = await forward_to_provider(
            provider=provider,
            api_key=provider_api_key,
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        raw = forward_result["raw"]
        latency_ms = forward_result["latency_ms"]

        # Extract usage from response
        usage = raw.get("usage", {})
        if provider == "anthropic":
            prompt_tok = usage.get("input_tokens", 0) or input_tokens
            completion_tok = usage.get("output_tokens", 0)
        elif provider == "gemini":
            usage_meta = raw.get("usageMetadata", {})
            prompt_tok = usage_meta.get("promptTokenCount", 0) or input_tokens
            completion_tok = usage_meta.get("candidatesTokenCount", 0)
        else:
            prompt_tok = usage.get("prompt_tokens", input_tokens) or input_tokens
            completion_tok = usage.get("completion_tokens", 0)

        total_tokens = prompt_tok + completion_tok

        # Calculate cost
        total_cost = get_cost(prompt_tok, completion_tok, provider, model)

        # Rebuild response for OpenAI format
        response_data = raw
        if provider != "openai":
            response_data = _rebuild_openai_response(provider, raw, model)

        # Update log
        log.response_tokens = completion_tok
        log.prompt_tokens = prompt_tok
        log.total_tokens = total_tokens
        log.prompt_cost = get_cost(prompt_tok, 0, provider, model)
        log.completion_cost = get_cost(0, completion_tok, provider, model)
        log.total_cost = total_cost
        log.latency_ms = latency_ms
        log.status_code = 200
        log.raw_response = json.dumps(raw)[:10000]
        log.response_text = _extract_response_text(provider, raw)
        await session.commit()

        return response_data

    except ProxyError as e:
        log.status_code = e.status_code
        log.error_message = e.message
        await session.commit()
        raise HTTPException(status_code=e.status_code, detail=e.message)

    except Exception as e:
        log.status_code = 500
        log.error_message = str(e)
        await session.commit()
        raise HTTPException(status_code=500, detail=str(e))


def _extract_response_text(provider: str, raw: dict) -> str:
    try:
        if provider == "anthropic":
            return raw.get("content", [{}])[0].get("text", "")
        elif provider == "gemini":
            candidates = raw.get("candidates", [{}])
            return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        else:
            return raw.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception:
        return ""


def _rebuild_openai_response(provider: str, raw: dict, model: str) -> dict:
    """Rebuild Anthropic/Gemini responses in OpenAI format."""
    try:
        usage = raw.get("usage", raw.get("usageMetadata", {}))
        if provider == "anthropic":
            content = raw.get("content", [{}])[0].get("text", "")
            return {
                "id": f"anthropic-{raw.get('id', 'unknown')}",
                "object": "chat.completion",
                "created": int(datetime.utcnow().timestamp()),
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": raw.get("stop_reason", "stop"),
                }],
                "usage": {
                    "prompt_tokens": usage.get("input_tokens", 0),
                    "completion_tokens": usage.get("output_tokens", 0),
                    "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
                },
            }
        elif provider == "gemini":
            candidates = raw.get("candidates", [{}])
            content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return {
                "id": f"gemini-{raw.get('modelVersion', 'unknown')}",
                "object": "chat.completion",
                "created": int(datetime.utcnow().timestamp()),
                "model": model,
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": content or ""},
                    "finish_reason": candidates[0].get("finishReason", "STOP"),
                }],
                "usage": {
                    "prompt_tokens": usage.get("promptTokenCount", 0),
                    "completion_tokens": usage.get("candidatesTokenCount", 0),
                    "total_tokens": usage.get("totalTokenCount", 0),
                },
            }
    except Exception:
        pass
    return raw


@router.post("/v1/completions")
async def completions(
    body: dict,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Proxy text completion requests."""
    # Similar flow but with prompt text instead of messages
    raise HTTPException(
        status_code=501,
        detail="Text completions not yet supported. Use /v1/chat/completions",
    )


@router.get("/v1/models")
async def list_models():
    """List available models."""
    return {
        "object": "list",
        "data": [
            {"id": "gpt-4o", "object": "model", "created": 1715720000, "owned_by": "openai"},
            {"id": "gpt-4o-mini", "object": "model", "created": 1715720000, "owned_by": "openai"},
            {"id": "gpt-3.5-turbo", "object": "model", "created": 1677649963, "owned_by": "openai"},
            {"id": "claude-3-5-sonnet", "object": "model", "created": 1715720000, "owned_by": "anthropic"},
            {"id": "claude-3-5-haiku", "object": "model", "created": 1715720000, "owned_by": "anthropic"},
            {"id": "gemini-2.0-flash", "object": "model", "created": 1715720000, "owned_by": "google"},
            {"id": "gemini-1.5-flash", "object": "model", "created": 1715720000, "owned_by": "google"},
            {"id": "gemini-1.5-pro", "object": "model", "created": 1715720000, "owned_by": "google"},
        ],
    }


@router.get("/v1/models/{model_name}", response_model=dict)
async def get_model(model_name: str):
    """Get info for a specific model."""
    return {
        "id": model_name,
        "object": "model",
        "created": 1715720000,
        "owned_by": "openai",
    }
