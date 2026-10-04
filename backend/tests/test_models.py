from datetime import date

import pytest
from app.models import Employee
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError


def make_employee(**overrides) -> Employee:
    values = {
        "full_name": "Megha Bansal",
        "email": "megha.bansal@acme.com",
        "job_title": "Software Engineer",
        "department": "Engineering",
        "country": "IN",
        "currency": "INR",
        "salary": 2_400_000,
        "hire_date": date(2021, 6, 1),
    }
    values.update(overrides)
    return Employee(**values)


def test_employee_round_trip(db):
    db.add(make_employee())
    db.commit()

    saved = db.query(Employee).one()
    assert saved.id is not None
    assert saved.salary == 2_400_000
    assert saved.created_at is not None


def test_expected_indexes_exist(engine):
    names = {index["name"] for index in inspect(engine).get_indexes("employees")}
    assert {
        "ix_employees_country",
        "ix_employees_department",
        "ix_employees_job_title",
        "ix_employees_country_job_title",
        "ix_employees_country_department",
    } <= names


def test_duplicate_email_is_rejected(db):
    db.add(make_employee())
    db.commit()

    db.add(make_employee(full_name="Someone Else"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_uppercase_email_is_rejected(db):
    db.add(make_employee(email="Megha.Bansal@acme.com"))
    with pytest.raises(IntegrityError):
        db.commit()


@pytest.mark.parametrize("salary", [0, -1])
def test_non_positive_salary_is_rejected(db, salary):
    db.add(make_employee(salary=salary))
    with pytest.raises(IntegrityError):
        db.commit()
