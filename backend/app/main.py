"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import init_db
from app.core.errors import register_error_handlers
from app.routers import employees


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()  # create tables on first start
    yield


app = FastAPI(title="Salary Management API", version="0.1.0", lifespan=lifespan)
register_error_handlers(app)
app.include_router(employees.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness check used by tests and by the hosting platform."""
    return {"status": "ok"}
