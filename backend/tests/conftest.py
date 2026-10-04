import app.models  # noqa: F401  (registers the tables on Base.metadata)
import pytest
from app.core.database import Base, make_engine
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
