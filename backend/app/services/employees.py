"""Employee business logic. Knows about the database, not about HTTP."""

from dataclasses import dataclass

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeUpdate
from app.schemas.employee import DEFAULT_PAGE_SIZE


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


# ---------- listing: search, filters, sorting, pagination ----------

# Whitelist: the only columns a client can sort by. User text never goes into ORDER BY.
SORT_COLUMNS = {
    "full_name": Employee.full_name,
    "job_title": Employee.job_title,
    "department": Employee.department,
    "country": Employee.country,
    "salary": Employee.salary,
    "hire_date": Employee.hire_date,
}
_TEXT_SORTS = {"full_name", "job_title", "department", "country"}


@dataclass(frozen=True)
class EmployeeQuery:
    page: int = 1
    page_size: int = DEFAULT_PAGE_SIZE
    q: str | None = None
    country: str | None = None
    department: str | None = None
    job_title: str | None = None
    sort: str = "full_name"
    order: str = "asc"


def employee_filters(
    q: str | None = None,
    country: str | None = None,
    department: str | None = None,
    job_title: str | None = None,
) -> list[ColumnElement[bool]]:
    """WHERE conditions shared by the list and (later) the insights queries.

    Blank values are ignored. All conditions are combined with AND.
    """
    filters: list[ColumnElement[bool]] = []
    if q and q.strip():
        term = q.strip()
        # autoescape makes "%" and "_" typed by the user match literally, not as wildcards.
        filters.append(
            or_(
                Employee.full_name.icontains(term, autoescape=True),
                Employee.email.icontains(term, autoescape=True),
            )
        )
    if country and country.strip():
        filters.append(Employee.country == country.strip().upper())
    if department and department.strip():
        filters.append(Employee.department == department.strip())
    if job_title and job_title.strip():
        filters.append(Employee.job_title == job_title.strip())
    return filters


def _order_by(field: str, order: str) -> list[ColumnElement]:
    column = SORT_COLUMNS.get(field)
    if column is None:
        raise ValueError(f"Unsupported sort field: {field!r}")
    if order not in ("asc", "desc"):
        raise ValueError(f"Unsupported sort order: {order!r}")
    expression = (
        func.lower(column) if field in _TEXT_SORTS else column
    )  # "alice" next to "Alice"
    expression = expression.desc() if order == "desc" else expression.asc()
    # Tie-breaker: without a unique last key, rows with equal values (many people share a
    # department or salary) can repeat or vanish between pages.
    return [expression, Employee.id.asc()]


def list_employees(db: Session, query: EmployeeQuery) -> tuple[list[Employee], int]:
    """Return one page of employees and the total number of matches."""
    filters = employee_filters(
        query.q, query.country, query.department, query.job_title
    )

    # A separate COUNT keeps the page query simple and the total independent of the page.
    total = db.scalar(select(func.count()).select_from(Employee).where(*filters)) or 0

    page_query = (
        select(Employee)
        .where(*filters)
        .order_by(*_order_by(query.sort, query.order))
        .limit(query.page_size)
        .offset((query.page - 1) * query.page_size)
    )
    return list(db.scalars(page_query).all()), total
