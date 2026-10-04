import pytest
from app.core.errors import ConflictError, NotFoundError
from app.schemas import EmployeeCreate, EmployeeUpdate
from app.services import employees as service


def test_create_saves_and_returns_the_employee(db, payload):
    employee = service.create_employee(db, EmployeeCreate(**payload()))

    assert employee.id is not None
    assert employee.created_at is not None
    assert employee.salary == 2_400_000


def test_create_stores_the_normalized_email(db, payload):
    employee = service.create_employee(
        db, EmployeeCreate(**payload(email="Megha.Bansal@ACME.com"))
    )
    assert employee.email == "megha.bansal@acme.com"


def test_create_duplicate_email_raises_conflict(db, payload):
    service.create_employee(db, EmployeeCreate(**payload()))
    with pytest.raises(ConflictError):
        service.create_employee(db, EmployeeCreate(**payload(full_name="Someone Else")))


def test_session_is_still_usable_after_a_duplicate_error(db, payload):
    service.create_employee(db, EmployeeCreate(**payload()))
    with pytest.raises(ConflictError):
        service.create_employee(db, EmployeeCreate(**payload()))

    other = service.create_employee(
        db, EmployeeCreate(**payload(email="other@acme.com"))
    )
    assert other.id is not None


def test_get_returns_the_employee(db, payload):
    created = service.create_employee(db, EmployeeCreate(**payload()))
    assert service.get_employee(db, created.id).email == "megha.bansal@acme.com"


def test_get_missing_raises_not_found(db):
    with pytest.raises(NotFoundError):
        service.get_employee(db, 999)


def test_update_changes_the_fields(db, payload):
    created = service.create_employee(db, EmployeeCreate(**payload()))

    updated = service.update_employee(
        db, created.id, EmployeeUpdate(**payload(salary=3_000_000))
    )

    assert updated.salary == 3_000_000
    assert service.get_employee(db, created.id).salary == 3_000_000


def test_update_can_keep_the_same_email(db, payload):
    created = service.create_employee(db, EmployeeCreate(**payload()))
    updated = service.update_employee(
        db, created.id, EmployeeUpdate(**payload(job_title="Lead"))
    )
    assert updated.job_title == "Lead"


def test_update_to_another_employees_email_raises_conflict(db, payload):
    service.create_employee(db, EmployeeCreate(**payload()))
    second = service.create_employee(
        db, EmployeeCreate(**payload(email="second@acme.com"))
    )

    with pytest.raises(ConflictError):
        service.update_employee(db, second.id, EmployeeUpdate(**payload()))


def test_update_missing_raises_not_found(db, payload):
    with pytest.raises(NotFoundError):
        service.update_employee(db, 999, EmployeeUpdate(**payload()))


def test_delete_removes_the_employee(db, payload):
    created = service.create_employee(db, EmployeeCreate(**payload()))
    service.delete_employee(db, created.id)

    with pytest.raises(NotFoundError):
        service.get_employee(db, created.id)


def test_delete_missing_raises_not_found(db):
    with pytest.raises(NotFoundError):
        service.delete_employee(db, 999)
