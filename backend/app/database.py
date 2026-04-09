from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tokenscope.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class ProxyKey(Base):
    __tablename__ = "proxy_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    proxy_id = Column(String(64), unique=True, nullable=False, index=True)
    api_key = Column(Text, nullable=False)
    provider = Column(String(50), nullable=False)  # openai, gemini, anthropic
    model = Column(String(100), nullable=False)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2048)
    system_prompt = Column(Text, nullable=True)
    auto_enhance = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class APILog(Base):
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    proxy_id = Column(String(64), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    messages = Column(JSON, nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    enhanced_prompt = Column(Text, nullable=True)
    tfidf_scores = Column(JSON, nullable=True)
    status = Column(String(50), default="success")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Usage(Base):
    __tablename__ = "usage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    provider = Column(String(50), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    request_count = Column(Integer, default=0)

class PromptOptimization(Base):
    __tablename__ = "prompt_optimizations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    original_prompt = Column(Text, nullable=False)
    optimized_prompt = Column(Text, nullable=False)
    original_tokens = Column(Integer, default=0)
    optimized_tokens = Column(Integer, default=0)
    tokens_saved = Column(Integer, default=0)
    cost_saved = Column(Float, default=0.0)
    target_model = Column(String(100), nullable=True)
    source = Column(String(50), default="extension")  # extension, dashboard, api
    accepted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # New fields for attention score calculation
    prompt_quality_score = Column(Float, default=0.0)  # Score 0-100 for prompt quality
    complexity_score = Column(Float, default=0.0)  # How complex was the prompt
    efficiency_score = Column(Float, default=0.0)  # How efficient was the optimization
    mistakes_made = Column(JSON, nullable=True)  # Array of mistake types identified
    improvements_made = Column(JSON, nullable=True)  # Array of improvements applied
    attention_score = Column(Float, default=0.0)  # Final attention score 0-100

class UserScore(Base):
    __tablename__ = "user_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, unique=True, index=True)
    total_prompts = Column(Integer, default=0)
    total_optimizations = Column(Integer, default=0)
    total_tokens_saved = Column(Integer, default=0)
    total_cost_saved = Column(Float, default=0.0)

    # Scoring fields
    average_quality_score = Column(Float, default=0.0)
    average_efficiency_score = Column(Float, default=0.0)
    attention_score = Column(Float, default=50.0)  # Default 50, ranges 0-100

    # Rank and tier
    rank = Column(Integer, default=0)
    tier = Column(String(50), default="beginner")  # beginner, intermediate, advanced, expert, master

    # Performance metrics
    best_score = Column(Float, default=0.0)
    worst_score = Column(Float, default=0.0)
    improvement_trend = Column(Float, default=0.0)  # Positive = improving, negative = declining

    # Stats
    streak_days = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, unique=True, index=True)
    role = Column(String(50), nullable=False)  # developer, user
    created_at = Column(DateTime, default=datetime.utcnow)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with async_session_maker() as session:
        yield session
