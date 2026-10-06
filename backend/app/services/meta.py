"""Option lists for dropdowns."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.currency import COUNTRIES, SUPPORTED_CURRENCIES
from app.models import Employee
from app.schemas.insights import CountryOption, MetaFilters


def filter_options(db: Session) -> MetaFilters:
    """Supported countries and currencies, plus the departments and job titles in use."""
    departments = db.scalars(
        select(Employee.department).distinct().order_by(Employee.department)
    ).all()
    job_titles = db.scalars(
        select(Employee.job_title).distinct().order_by(Employee.job_title)
    ).all()
    return MetaFilters(
        countries=[
            CountryOption(code=c.code, name=c.name, currency=c.currency)
            for c in COUNTRIES
        ],
        departments=list(departments),
        job_titles=list(job_titles),
        currencies=sorted(SUPPORTED_CURRENCIES),
    )
