from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.database import init_db
from app.redis_client import init_redis
from app.routers import usage_router, keys_router, analyze_router, stats_router
from app.routers.proxy_keys import router as proxy_keys_router
from app.routers.logs import router as logs_router
from app.proxy.router import router as proxy_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_redis()
    yield


app = FastAPI(
    title="TokenScope Proxy API",
    description="AI API Proxy Gateway — Track, enhance, and optimize your AI API usage.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Proxy endpoints (OpenAI-compatible — for user apps to call)
app.include_router(proxy_router)

# Dashboard API endpoints
app.include_router(keys_router, prefix="/api/v1")
app.include_router(proxy_keys_router, prefix="/api/v1")
app.include_router(logs_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")
app.include_router(usage_router, prefix="/api/v1")
app.include_router(analyze_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": "TokenScope Proxy API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "proxy_endpoint": "/v1/chat/completions",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
