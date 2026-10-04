"""FastAPI application entry point.

Routers are registered here as they are built (employees, insights, meta, imports).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()  # create tables on first start
    yield


app = FastAPI(title="Salary Management API", version="0.1.0", lifespan=lifespan)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness check used by tests and by the hosting platform."""
    return {"status": "ok"}
