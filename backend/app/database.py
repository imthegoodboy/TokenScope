from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tokenscope.db")

connect_args = {"check_same_thread": False}
async_engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    from app.models import user, api_key, usage, analysis, proxy  # noqa
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
