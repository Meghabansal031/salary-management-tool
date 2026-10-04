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


SAMPLE_EMPLOYEES = [
    # name, email prefix, job title, department, country, currency, salary, hire date
    (
        "Aarav Mehta",
        "aarav.mehta",
        "Software Engineer",
        "Engineering",
        "IN",
        "INR",
        2_000_000,
        "2020-03-01",
    ),
    (
        "Priya Sharma",
        "priya.sharma",
        "Software Engineer",
        "Engineering",
        "IN",
        "INR",
        2_400_000,
        "2021-06-01",
    ),
    (
        "Rohan Gupta",
        "rohan.gupta",
        "Software Engineer",
        "Engineering",
        "IN",
        "INR",
        2_800_000,
        "2019-01-15",
    ),
    (
        "Anna Schmidt",
        "anna.schmidt",
        "Software Engineer",
        "Engineering",
        "DE",
        "EUR",
        70_000,
        "2022-02-01",
    ),
    (
        "Lukas Weber",
        "lukas.weber",
        "Software Engineer",
        "Engineering",
        "DE",
        "EUR",
        80_000,
        "2018-09-10",
    ),
    (
        "John Carter",
        "john.carter",
        "Software Engineer",
        "Engineering",
        "US",
        "USD",
        120_000,
        "2017-05-05",
    ),
    (
        "Emily Davis",
        "emily.davis",
        "Product Manager",
        "Product",
        "US",
        "USD",
        140_000,
        "2019-11-20",
    ),
    (
        "Michael Brown",
        "michael.brown",
        "Product Manager",
        "Product",
        "US",
        "USD",
        150_000,
        "2016-04-04",
    ),
    (
        "Sophie Martin",
        "sophie.martin",
        "HR Specialist",
        "People",
        "FR",
        "EUR",
        55_000,
        "2023-01-09",
    ),
    (
        "Yuki Tanaka",
        "yuki.tanaka",
        "Data Analyst",
        "Analytics",
        "JP",
        "JPY",
        7_000_000,
        "2021-08-23",
    ),
    (
        "Oliver Smith",
        "oliver.smith",
        "Data Analyst",
        "Analytics",
        "GB",
        "GBP",
        60_000,
        "2020-10-12",
    ),
    (
        "Chloe Wilson",
        "chloe.wilson",
        "Data Analyst",
        "Analytics",
        "GB",
        "GBP",
        66_000,
        "2022-07-18",
    ),
]


@pytest.fixture
def sample_employees(db):
    """12 employees across 6 countries with hand-checkable numbers (reused by later tests)."""
    from datetime import date

    from app.models import Employee

    rows = [
        Employee(
            full_name=name,
            email=f"{email}@acme.com",
            job_title=title,
            department=department,
            country=country,
            currency=currency,
            salary=salary,
            hire_date=date.fromisoformat(hired),
        )
        for name, email, title, department, country, currency, salary, hired in SAMPLE_EMPLOYEES
    ]
    db.add_all(rows)
    db.commit()
    return rows
