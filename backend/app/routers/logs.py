from fastapi import APIRouter, Depends, Query, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import APILog, get_db
from ..services.live_logger import LiveLogger
import json
import asyncio

router = APIRouter()
live_logger = LiveLogger()

@router.get("/logs/stream")
async def stream_logs(
    proxy_id: str = Query(default=None),
    user_id: str = Query(default=None)
):
    channel_id = f"{user_id}:{proxy_id}" if user_id else proxy_id

    async def event_generator():
        queue = live_logger.subscribe(channel_id)
        try:
            while True:
                try:
                    log = await asyncio.wait_for(queue.get(), timeout=30)
                    if user_id and log.get('user_id') != user_id:
                        continue
                    yield f"data: {json.dumps(log)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        except asyncio.CancelledError:
            live_logger.unsubscribe(channel_id, queue)
            yield f"data: {json.dumps({'type': 'disconnected'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/logs/{proxy_id}")
async def get_logs_for_proxy(
    proxy_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(APILog).where(
            APILog.proxy_id == proxy_id
        ).order_by(
            APILog.created_at.desc()
        ).limit(limit)
    )

    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "provider": log.provider,
            "model": log.model,
            "messages": log.messages,
            "prompt_tokens": log.prompt_tokens,
            "completion_tokens": log.completion_tokens,
            "total_tokens": log.total_tokens,
            "cost": log.cost,
            "latency_ms": log.latency_ms,
            "enhanced_prompt": log.enhanced_prompt,
            "tfidf_scores": log.tfidf_scores,
            "status": log.status,
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]
