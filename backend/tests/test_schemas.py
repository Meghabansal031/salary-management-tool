from datetime import date, datetime, timedelta, timezone

import pytest
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.schemas.employee import MAX_SALARY
from pydantic import ValidationError


def payload(**overrides) -> dict:
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
    return values


def failed_fields(**overrides) -> set[str]:
    """Validate and return the names of the fields that were rejected."""
    with pytest.raises(ValidationError) as excinfo:
        EmployeeCreate(**payload(**overrides))
    return {str(error["loc"][0]) for error in excinfo.value.errors()}


# ---------- happy path and normalization ----------


def test_valid_payload_is_accepted():
    employee = EmployeeCreate(**payload())
    assert employee.salary == 2_400_000
    assert employee.country == "IN"


def test_values_are_trimmed_and_normalized():
    employee = EmployeeCreate(
        **payload(
            full_name="  Megha Bansal  ",
            email="  Megha.Bansal@ACME.com ",
            country=" in ",
            currency="inr",
        )
    )
    assert employee.full_name == "Megha Bansal"
    assert employee.email == "megha.bansal@acme.com"
    assert employee.country == "IN"
    assert employee.currency == "INR"


def test_update_uses_the_same_rules_as_create():
    assert issubclass(EmployeeUpdate, EmployeeCreate)
    with pytest.raises(ValidationError):
        EmployeeUpdate(**payload(salary=0))


# ---------- required fields ----------


def test_all_fields_are_required():
    with pytest.raises(ValidationError) as excinfo:
        EmployeeCreate()
    assert len(excinfo.value.errors()) == 8


# ---------- names, titles, departments ----------


@pytest.mark.parametrize("name", ["", "   ", "x" * 121])
def test_invalid_full_name_is_rejected(name):
    assert failed_fields(full_name=name) == {"full_name"}


def test_full_name_length_boundaries_are_accepted():
    assert EmployeeCreate(**payload(full_name="x")).full_name == "x"
    assert len(EmployeeCreate(**payload(full_name="x" * 120)).full_name) == 120


@pytest.mark.parametrize("field", ["job_title", "department"])
@pytest.mark.parametrize("value", ["", "   ", "x" * 81])
def test_invalid_title_or_department_is_rejected(field, value):
    assert failed_fields(**{field: value}) == {field}


# ---------- email ----------


@pytest.mark.parametrize(
    "email",
    ["plainaddress", "a@b", "a@@b.com", "a b@x.com", "@x.com", "a@x.", "a@.com", ""],
)
def test_invalid_email_is_rejected(email):
    assert failed_fields(email=email) == {"email"}


@pytest.mark.parametrize(
    "email",
    ["first.last+tag@sub.example.co.uk", "a@b.co", "x_y-z@my-company.com"],
)
def test_valid_email_forms_are_accepted(email):
    assert EmployeeCreate(**payload(email=email)).email == email


# ---------- country and currency ----------


def test_unsupported_country_is_rejected():
    assert "country" in failed_fields(country="XX")


def test_unsupported_currency_is_rejected():
    assert failed_fields(currency="XXX") == {"currency"}


def test_currency_must_match_the_country():
    # Germany pays in EUR, so a USD salary is a data-entry mistake.
    assert failed_fields(country="DE", currency="USD") == {"currency"}


def test_euro_countries_accept_eur():
    for country in ("DE", "FR", "NL"):
        assert (
            EmployeeCreate(**payload(country=country, currency="EUR")).currency == "EUR"
        )


def test_united_kingdom_is_gb_with_gbp():
    employee = EmployeeCreate(**payload(country="GB", currency="GBP"))
    assert employee.country == "GB"


# ---------- salary ----------


@pytest.mark.parametrize("salary", [0, -1, MAX_SALARY + 1, 1.5, "abc", None])
def test_invalid_salary_is_rejected(salary):
    assert failed_fields(salary=salary) == {"salary"}


@pytest.mark.parametrize("salary", [1, MAX_SALARY])
def test_salary_boundaries_are_accepted(salary):
    assert EmployeeCreate(**payload(salary=salary)).salary == salary


def test_whole_number_float_from_a_spreadsheet_is_accepted():
    # Excel cells often arrive as 50000.0
    assert EmployeeCreate(**payload(salary=50000.0)).salary == 50000


# ---------- hire date ----------


def test_future_hire_date_is_rejected():
    today = datetime.now(tz=timezone.utc).date()
    assert failed_fields(hire_date=today + timedelta(days=1)) == {"hire_date"}


def test_hire_date_today_is_accepted():
    today = datetime.now(tz=timezone.utc).date()
    assert EmployeeCreate(**payload(hire_date=today)).hire_date == today


def test_implausibly_old_hire_date_is_rejected():
    assert failed_fields(hire_date=date(1949, 12, 31)) == {"hire_date"}


def test_hire_date_accepts_iso_string():
    assert EmployeeCreate(**payload(hire_date="2021-06-01")).hire_date == date(
        2021, 6, 1
    )


# ---------- errors name the failing field (needed for the import's error report) ----------


def test_multiple_errors_are_all_reported():
    assert failed_fields(full_name="", salary=-5, email="nope") == {
        "full_name",
        "salary",
        "email",
    }


# ---------- output shape ----------


def test_read_schema_serializes_a_database_row():
    row = Employee(
        id=1,
        created_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
        **payload(),
    )
    read = EmployeeRead.model_validate(row)
    assert read.id == 1
    assert read.email == "megha.bansal@acme.com"
