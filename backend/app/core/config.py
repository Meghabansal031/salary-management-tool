"""Application settings, read from environment variables with safe defaults."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # SQLite file next to where the server is started (backend/). Override for hosting.
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./salary.db")


settings = Settings()
