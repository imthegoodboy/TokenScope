from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers import proxy, keys, stats, logs, usage, analyzer, extension, groups
from .database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="TokenScope API",
    description="AI Proxy and Token Analytics Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proxy.router, prefix="/api/v1", tags=["Proxy"])
app.include_router(keys.router, prefix="/api/v1", tags=["Keys"])
app.include_router(stats.router, prefix="/api/v1", tags=["Stats"])
app.include_router(logs.router, prefix="/api/v1", tags=["Logs"])
app.include_router(usage.router, prefix="/api/v1", tags=["Usage"])
app.include_router(analyzer.router, prefix="/api/v1", tags=["Analyzer"])
app.include_router(extension.router, prefix="/api/v1", tags=["Extension"])
app.include_router(groups.router, prefix="/api/v1", tags=["Groups"])

@app.get("/")
async def root():
    return {"status": "ok", "service": "TokenScope API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
