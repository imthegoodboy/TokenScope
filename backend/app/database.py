from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os


def _migrate_api_keys_schema(connection) -> None:
    """SQLite: add encrypted_key when DB still has the legacy key_hash schema."""
    if connection.dialect.name != "sqlite":
        return
    tab = connection.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='api_keys'")
    ).fetchone()
    if not tab:
        return
    cols = {row[1] for row in connection.execute(text("PRAGMA table_info(api_keys)"))}
    if "encrypted_key" in cols:
        return
    connection.execute(
        text(
            "ALTER TABLE api_keys ADD COLUMN encrypted_key VARCHAR NOT NULL DEFAULT ''"
        )
    )
    # Legacy rows only had key_hash; proxy cannot recover plaintext — disable them.
    if "key_hash" in cols:
        connection.execute(text("UPDATE api_keys SET active = 0"))
    else:
        connection.execute(
            text("UPDATE api_keys SET active = 0 WHERE encrypted_key = ''")
        )

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./tokenscope.db")

connect_args = {"check_same_thread": False}
async_engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    from app.models import user, api_key, usage, analysis, proxy  # noqa
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.run_sync(_migrate_api_keys_schema)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
