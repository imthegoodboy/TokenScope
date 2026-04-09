from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.database import init_db
from app.redis_client import init_redis
from app.routers import usage_router, keys_router, analyze_router, stats_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await init_redis()
    yield
    # Shutdown


app = FastAPI(
    title="TokenScope API",
    description="AI Token Analytics & Optimization Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(usage_router, prefix="/api/v1")
app.include_router(keys_router, prefix="/api/v1")
app.include_router(analyze_router, prefix="/api/v1")
app.include_router(stats_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": "TokenScope API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
