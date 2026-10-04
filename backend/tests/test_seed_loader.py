import time

import pytest
from app.models import Employee
from app.seed.generator import generate_employees
from app.seed.loader import DatabaseNotEmptyError, seed_database, seed_if_empty
from sqlalchemy import func, select


def count(db) -> int:
    return db.scalar(select(func.count()).select_from(Employee))


def test_seed_inserts_the_requested_number(db):
    assert seed_database(db, count=200) == 200
    assert count(db) == 200


def test_seeding_ten_thousand_rows_takes_well_under_ten_seconds(db):
    started = time.perf_counter()
    seed_database(db)  # the default: 10,000 employees
    elapsed = time.perf_counter() - started

    assert count(db) == 10_000
    assert elapsed < 10  # the requirement; in practice this takes about a second


def test_stored_rows_match_the_generator_exactly(db):
    seed_database(db, count=50)
    stored = db.scalars(select(Employee).order_by(Employee.id)).all()

    for employee, row in zip(stored, generate_employees(count=50), strict=True):
        assert employee.email == row["email"]
        assert employee.salary == row["salary"]
        assert employee.hire_date == row["hire_date"]


def test_seed_refuses_to_mix_into_existing_data(db):
    seed_database(db, count=10)
    with pytest.raises(DatabaseNotEmptyError):
        seed_database(db, count=10)
    assert count(db) == 10


def test_reset_replaces_existing_data_and_restarts_ids(db):
    seed_database(db, count=10)
    seed_database(db, count=20, reset=True)

    assert count(db) == 20
    assert db.scalar(select(func.min(Employee.id))) == 1


def test_seed_if_empty_seeds_once(db):
    assert seed_if_empty(db, count=25) == 25
    assert seed_if_empty(db, count=25) == 0
    assert count(db) == 25


def test_seed_if_empty_leaves_existing_data_alone(db, sample_employees):
    assert seed_if_empty(db, count=25) == 0
    assert count(db) == 12
