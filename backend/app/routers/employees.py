"""HTTP layer for employees: parse the request, call the service, shape the response."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.currency import currency_for_country
from app.core.database import get_db
from app.schemas import EmployeeCreate, EmployeePage, EmployeeRead, EmployeeUpdate
from app.schemas.employee import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SortField, SortOrder
from app.schemas.insights import PeerStats
from app.services import employees as employee_service
from app.services import insights as insights_service
from app.services.employees import EmployeeQuery

router = APIRouter(prefix="/api/employees", tags=["employees"])
DB_DEPENDENCY = Depends(get_db)


@router.get("", response_model=EmployeePage)
def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    q: str | None = Query(None, max_length=100, description="Search name or email"),
    country: str | None = Query(None, max_length=2),
    department: str | None = Query(None, max_length=80),
    job_title: str | None = Query(None, max_length=80),
    sort: SortField = "full_name",
    order: SortOrder = "asc",
    db: Session = DB_DEPENDENCY,
):
    items, total = employee_service.list_employees(
        db,
        EmployeeQuery(
            page=page,
            page_size=page_size,
            q=q,
            country=country,
            department=department,
            job_title=job_title,
            sort=sort,
            order=order,
        ),
    )
    peers = insights_service.peer_stats(db, country, job_title)
    return EmployeePage(
        items=[EmployeeRead.model_validate(employee) for employee in items],
        total=total,
        page=page,
        page_size=page_size,
        peer_stats=PeerStats(
            country=country.strip().upper(),
            job_title=job_title.strip(),
            currency=currency_for_country(country.strip().upper()),
            count=peers.count,
            p25=peers.p25,
            median=peers.median,
            p75=peers.p75,
        )
        if peers
        else None,
    )


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(data: EmployeeCreate, db: Session = DB_DEPENDENCY):
    return employee_service.create_employee(db, data)


@router.get("/{employee_id}", response_model=EmployeeRead)
def read_employee(employee_id: int, db: Session = DB_DEPENDENCY):
    return employee_service.get_employee(db, employee_id)


@router.put("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: int, data: EmployeeUpdate, db: Session = DB_DEPENDENCY
):
    return employee_service.update_employee(db, employee_id, data)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: Session = DB_DEPENDENCY):
    employee_service.delete_employee(db, employee_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
