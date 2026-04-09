from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./tokenscope.db"

    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "TokenScope"
    debug: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
