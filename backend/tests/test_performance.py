"""Benchmark on 10,000 employees, checking the targets in REQUIREMENTS.md.

    list endpoint       < 300 ms
    insights endpoints  < 500 ms
    seed                < 10 s   (asserted in test_seed_loader.py)

Each timing is the median of 5 runs after one warm-up call, measured through the whole
API stack (routing, validation, query, JSON) against a real SQLite file in WAL mode. The
limits are the requirement numbers; real timings are normally far below them, which is
the margin that keeps the test from failing on a slow machine.

On a slow machine the limits can be relaxed, for example:  PERF_LIMIT_FACTOR=2 pytest
Run alone and see the timing table:  pytest -m performance -s
Leave the benchmark out:             pytest -m "not performance"
"""

import os
import re
import statistics
import time

import pytest
from app.core.database import Base, get_db, make_engine
from app.main import app
from app.seed.loader import seed_database
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

pytestmark = pytest.mark.performance

LIMIT_FACTOR = float(os.getenv("PERF_LIMIT_FACTOR", "1"))  # 1 = the requirement numbers
LIST_LIMIT_MS = 300 * LIMIT_FACTOR
INSIGHTS_LIMIT_MS = 500 * LIMIT_FACTOR
RUNS = 5


@pytest.fixture(scope="module")
def perf_engine(tmp_path_factory):
    """10,000 seeded employees in a real SQLite file (WAL mode), built once for this module."""
    path = tmp_path_factory.mktemp("perf") / "benchmark.db"
    engine = make_engine(f"sqlite:///{path}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        seed_database(session)
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def perf_client(perf_engine):
    def override_get_db():
        with Session(perf_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(scope="module")
def timings():
    """Collects every measurement and prints a Markdown table at the end (visible with -s)."""
    results: list[tuple[str, float, float]] = []
    yield results
    print("\n\n| Request | Median (ms) | Limit (ms) |\n|---|---|---|")
    for label, median_ms, limit in results:
        print(f"| {label} | {median_ms:.0f} | {limit:.0f} |")


def median_ms(call) -> float:
    call()  # warm-up: first call pays for imports and cold caches
    samples = []
    for _ in range(RUNS):
        started = time.perf_counter()
        call()
        samples.append((time.perf_counter() - started) * 1000)
    return statistics.median(samples)


def benchmark(client, timings, label, path, params, limit):
    def call():
        response = client.get(path, params=params)
        assert response.status_code == 200, response.text

    elapsed = median_ms(call)
    timings.append((label, elapsed, limit))
    assert elapsed < limit, f"{label} took {elapsed:.0f} ms (limit {limit} ms)"


def test_benchmark_database_really_has_ten_thousand_employees(perf_client):
    assert (
        perf_client.get("/api/employees", params={"page_size": 1}).json()["total"]
        == 10_000
    )


# ---------- list endpoint: < 300 ms ----------

LIST_CASES = [
    ("list: first page", {}),
    ("list: largest page (100 rows)", {"page_size": 100}),
    ("list: filter by country", {"country": "US"}),
    (
        "list: country + job title (also computes peer_stats)",
        {"country": "IN", "job_title": "Software Engineer"},
    ),
    ("list: search by name or email", {"q": "son"}),
    ("list: sort by salary, highest first", {"sort": "salary", "order": "desc"}),
    ("list: last page (deepest OFFSET)", {"page": 400, "page_size": 25}),
]


@pytest.mark.parametrize(
    "label, params", LIST_CASES, ids=[label for label, _ in LIST_CASES]
)
def test_list_is_fast_enough(perf_client, timings, label, params):
    benchmark(perf_client, timings, label, "/api/employees", params, LIST_LIMIT_MS)


# ---------- insights endpoints: < 500 ms ----------

INSIGHTS_CASES = [
    (
        "summary by country (local currency)",
        "/api/insights/summary",
        {"group_by": "country"},
    ),
    (
        "summary by department (USD)",
        "/api/insights/summary",
        {"group_by": "department", "basis": "usd"},
    ),
    (
        "summary by job title (USD, 31 groups)",
        "/api/insights/summary",
        {"group_by": "job_title", "basis": "usd"},
    ),
    (
        "summary by job title inside one country",
        "/api/insights/summary",
        {"group_by": "job_title", "country": "US"},
    ),
    ("distribution (USD, 20 bins)", "/api/insights/distribution", {"basis": "usd"}),
    (
        "distribution inside one country",
        "/api/insights/distribution",
        {"country": "US"},
    ),
    ("headcount by country", "/api/insights/headcount", {}),
    ("dropdown options", "/api/meta/filters", {}),
]


@pytest.mark.parametrize(
    "label, path, params", INSIGHTS_CASES, ids=[case[0] for case in INSIGHTS_CASES]
)
def test_insights_are_fast_enough(perf_client, timings, label, path, params):
    benchmark(perf_client, timings, label, path, params, INSIGHTS_LIMIT_MS)


# ---------- the indexes are really used (not a full table scan) ----------
# Speed on 10,000 rows can hide a missing index. So: make the real request, record the SQL
# the app actually sends, ask SQLite how it would run each statement, and fail on a scan.

PLAN_CASES = [
    (
        {"country": "IN", "job_title": "Software Engineer"},
        "ix_employees_country_job_title",
    ),
    ({"country": "IN", "department": "Engineering"}, "ix_employees_country_department"),
    ({"department": "Engineering"}, "ix_employees_department"),
    ({"job_title": "Software Engineer"}, "ix_employees_job_title"),
    ({"country": "IN"}, "ix_employees_country"),
]


def query_plans(engine, make_request) -> list[str]:
    """Run ``make_request`` and return SQLite's plan for every filtered employees query it sent."""
    sent: list[tuple[str, tuple]] = []

    def record(_connection, _cursor, statement, parameters, _context, _executemany):
        sent.append((statement, parameters))

    event.listen(engine, "before_cursor_execute", record)
    try:
        make_request()
    finally:
        event.remove(engine, "before_cursor_execute", record)

    plans = []
    with engine.connect() as connection:
        for statement, parameters in sent:
            if "FROM employees" in statement and "WHERE" in statement:
                rows = connection.exec_driver_sql(
                    "EXPLAIN QUERY PLAN " + statement, parameters
                ).all()
                plans.append(" | ".join(row[-1] for row in rows))
    return plans


@pytest.mark.parametrize(
    "params, expected_index", PLAN_CASES, ids=[str(params) for params, _ in PLAN_CASES]
)
def test_filtered_requests_use_an_index_instead_of_scanning_the_table(
    perf_client, perf_engine, params, expected_index
):
    plans = query_plans(
        perf_engine, lambda: perf_client.get("/api/employees", params=params)
    )

    assert plans, "no filtered query was recorded"
    for plan in plans:
        assert not re.search(r"SCAN employees", plan), plan
    assert any(expected_index in plan for plan in plans), plans
