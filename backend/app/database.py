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

class ExtensionLog(Base):
    """Tracks Chrome extension usage - prompt optimizations accepted by users"""
    __tablename__ = "extension_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    original_prompt = Column(Text, nullable=False)
    optimized_prompt = Column(Text, nullable=False)
    original_tokens = Column(Integer, default=0)
    optimized_tokens = Column(Integer, default=0)
    tokens_saved = Column(Integer, default=0)
    cost_original = Column(Float, default=0.0)
    cost_optimized = Column(Float, default=0.0)
    cost_saved = Column(Float, default=0.0)
    attention_score = Column(Float, default=0.0)  # 0-1 score based on usage pattern
    chatbot = Column(String(50), default="chatgpt")  # chatgpt, claude, gemini, manual
    accepted = Column(Boolean, default=True)  # true = user accepted, false = dismissed
    created_at = Column(DateTime, default=datetime.utcnow)

class ExtensionStats(Base):
    """Aggregated extension stats per user"""
    __tablename__ = "extension_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    total_optimizations = Column(Integer, default=0)
    total_accepts = Column(Integer, default=0)
    total_rejects = Column(Integer, default=0)
    total_tokens_saved = Column(Integer, default=0)
    total_cost_saved = Column(Float, default=0.0)
    avg_attention_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Group(Base):
    """Groups for team/workspace collaboration"""
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    code = Column(String(8), unique=True, nullable=False, index=True)  # Unique join code
    admin_id = Column(String(255), nullable=False, index=True)  # Creator's user ID
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class GroupMember(Base):
    """Members of a group"""
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    role = Column(String(50), default="member")  # admin, member
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with async_session_maker() as session:
        yield session
