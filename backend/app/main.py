"""FastAPI application entry point.

Routers are registered here as they are built (employees, insights, meta, imports).
"""

from fastapi import FastAPI

app = FastAPI(title="Salary Management API", version="0.1.0")


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness check used by tests and by the hosting platform."""
    return {"status": "ok"}
