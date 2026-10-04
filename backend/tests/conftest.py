import pytest
from app.core.database import Base, get_db, make_engine
from app.main import app  # importing the app also registers the tables on Base.metadata
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture
def engine():
    """A fresh in-memory SQLite database for every test: fast and isolated."""
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(engine):
    """An API client wired to the in-memory database instead of the real one.

    Used without ``with`` on purpose, so the app's startup hook (which creates the real
    database file) does not run during tests.
    """

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def payload():
    """Factory for a valid, JSON-safe employee payload; override any field by keyword."""

    def build(**overrides) -> dict:
        values = {
            "full_name": "Megha Bansal",
            "email": "megha.bansal@acme.com",
            "job_title": "Software Engineer",
            "department": "Engineering",
            "country": "IN",
            "currency": "INR",
            "salary": 2_400_000,
            "hire_date": "2021-06-01",
        }
        values.update(overrides)
        return values

    return build
