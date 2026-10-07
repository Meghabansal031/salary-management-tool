"""Application settings, read from environment variables with safe defaults."""

import os
from dataclasses import dataclass


def _split(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    # SQLite file next to where the server is started (backend/). Override for hosting.
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./salary.db")
    # Browser origins allowed to call the API (comma-separated). Defaults to the local
    # Next.js dev server; set to the deployed frontend's address in production.
    cors_origins: tuple[str, ...] = _split(
        os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    )


settings = Settings()
