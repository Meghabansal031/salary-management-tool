"""Employee business logic. Knows about the database, not about HTTP."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeUpdate


def _raise_if_duplicate_email(
    db: Session, email: str, exclude_id: int | None, cause: IntegrityError
) -> None:
    """After a failed write, tell a duplicate email apart from any other integrity error."""
    query = select(Employee.id).where(Employee.email == email)
    if exclude_id is not None:
        query = query.where(Employee.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError("An employee with this email already exists") from cause


def get_employee(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise NotFoundError(f"Employee {employee_id} not found")
    return employee


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    employee = Employee(**data.model_dump())
    db.add(employee)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()  # leave the session usable
        _raise_if_duplicate_email(db, data.email, None, exc)
        raise
    db.refresh(employee)  # load database-generated values such as id and created_at
    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee:
    employee = get_employee(db, employee_id)
    for field, value in data.model_dump().items():
        setattr(employee, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        _raise_if_duplicate_email(db, data.email, employee_id, exc)
        raise
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee_id: int) -> None:
    employee = get_employee(db, employee_id)
    db.delete(employee)
    db.commit()
