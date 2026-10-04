"""HTTP layer for employees: parse the request, call the service, shape the response."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services import employees as employee_service

router = APIRouter(prefix="/api/employees", tags=["employees"])
_DB_DEPENDENCY = Depends(get_db)


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(data: EmployeeCreate, db: Session = _DB_DEPENDENCY):
    return employee_service.create_employee(db, data)


@router.get("/{employee_id}", response_model=EmployeeRead)
def read_employee(employee_id: int, db: Session = _DB_DEPENDENCY):
    return employee_service.get_employee(db, employee_id)


@router.put("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: int, data: EmployeeUpdate, db: Session = _DB_DEPENDENCY
):
    return employee_service.update_employee(db, employee_id, data)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: Session = _DB_DEPENDENCY):
    employee_service.delete_employee(db, employee_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
