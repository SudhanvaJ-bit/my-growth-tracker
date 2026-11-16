"""Application settings, read from environment variables (or a local .env file)."""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-only-secret-change-me-please-32chars"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"  # set to "production" when deployed
    database_url: str = "postgresql://postgres:postgres@localhost:5432/growth_tracker"
    secret_key: str = DEV_SECRET
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    # Comma-separated list of frontend origins allowed to call the API.
    cors_origins: str = "http://localhost:5173"

    @field_validator("database_url")
    @classmethod
    def normalise_database_url(cls, value: str) -> str:
        # Managed providers hand out postgres:// or postgresql:// URLs.
        # SQLAlchemy needs to be told which driver to use (psycopg 3).
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://"):]
        if value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value[len("postgresql://"):]
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.environment == "production" and (
        settings.secret_key == DEV_SECRET or len(settings.secret_key) < 32
    ):
        raise RuntimeError("Set SECRET_KEY to a random string of at least 32 characters in production.")
    return settings
