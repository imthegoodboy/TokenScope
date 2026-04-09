from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import ProxyKey, APILog, Usage, get_db
from ..services.token_analyzer import TokenAnalyzer
from ..services.tfidf_engine import TFIDFEngine
from ..services.proxy_forwarder import ProxyForwarder
from ..services.live_logger import LiveLogger
from datetime import datetime, date
import json
import time

router = APIRouter()
token_analyzer = TokenAnalyzer()
tfidf_engine = TFIDFEngine()
proxy_forwarder = ProxyForwarder()
live_logger = LiveLogger()

@router.post("/proxy/{proxy_id}")
async def proxy_request(
    proxy_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    start_time = time.time()

    result = await db.execute(
        select(ProxyKey).where(ProxyKey.proxy_id == proxy_id, ProxyKey.is_active == True)
    )
    proxy_key = result.scalar_one_or_none()

    if not proxy_key:
        raise HTTPException(status_code=404, detail="Proxy key not found")

    body = await request.json()
    messages = body.get("messages", [])

    if proxy_key.auto_enhance and messages:
        user_message = next((m["content"] for m in messages if m.get("role") == "user"), "")
        if user_message:
            tfidf_scores = tfidf_engine.analyze(user_message)
            enhanced_prompt = tfidf_engine.enhance_prompt(user_message)
            messages = [
                m if m.get("role") != "user"
                else {**m, "content": enhanced_prompt}
                for m in messages
            ]
        else:
            tfidf_scores = None
            enhanced_prompt = None
    else:
        user_message = next((m.get("content", "") for m in messages if m.get("role") == "user"), "")
        tfidf_scores = tfidf_engine.analyze(user_message) if user_message else None
        enhanced_prompt = None

    settings = {
        "temperature": proxy_key.temperature,
        "max_tokens": proxy_key.max_tokens,
    }

    if proxy_key.system_prompt:
        messages = [{"role": "system", "content": proxy_key.system_prompt}] + messages

    try:
        response = await proxy_forwarder.forward(
            provider=proxy_key.provider,
            api_key=proxy_key.api_key,
            model=proxy_key.model,
            messages=messages,
            settings=settings
        )

        latency_ms = int((time.time() - start_time) * 1000)

        usage = response.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", 0)

        cost = token_analyzer.calculate_cost(
            provider=proxy_key.provider,
            model=proxy_key.model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )

        today = date.today().isoformat()
        usage_result = await db.execute(
            select(Usage).where(
                Usage.user_id == proxy_key.user_id,
                Usage.date == today,
                Usage.provider == proxy_key.provider
            )
        )
        usage_record = usage_result.scalar_one_or_none()

        if usage_record:
            usage_record.prompt_tokens += prompt_tokens
            usage_record.completion_tokens += completion_tokens
            usage_record.total_tokens += total_tokens
            usage_record.cost += cost
            usage_record.request_count += 1
        else:
            usage_record = Usage(
                user_id=proxy_key.user_id,
                date=today,
                provider=proxy_key.provider,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost=cost,
                request_count=1
            )
            db.add(usage_record)

        log_entry = APILog(
            proxy_id=proxy_id,
            user_id=proxy_key.user_id,
            provider=proxy_key.provider,
            model=proxy_key.model,
            messages=messages if proxy_key.system_prompt else body.get("messages", []),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost=cost,
            latency_ms=latency_ms,
            enhanced_prompt=enhanced_prompt,
            tfidf_scores=tfidf_scores,
            status="success"
        )
        db.add(log_entry)
        await db.commit()

        live_logger.log({
            "type": "request",
            "proxy_id": proxy_id,
            "user_id": proxy_key.user_id,
            "provider": proxy_key.provider,
            "model": proxy_key.model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost": cost,
            "latency_ms": latency_ms,
            "timestamp": datetime.utcnow().isoformat()
        })

        return response

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)

        log_entry = APILog(
            proxy_id=proxy_id,
            user_id=proxy_key.user_id,
            provider=proxy_key.provider,
            model=proxy_key.model,
            messages=body.get("messages", []),
            status="error",
            error_message=str(e),
            latency_ms=latency_ms
        )
        db.add(log_entry)
        await db.commit()

        live_logger.log({
            "type": "error",
            "proxy_id": proxy_id,
            "user_id": proxy_key.user_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        })

        raise HTTPException(status_code=500, detail=str(e))
