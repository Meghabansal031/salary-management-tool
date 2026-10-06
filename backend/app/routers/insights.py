"""HTTP layer for salary insights."""

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.currency import COUNTRY_BY_CODE
from app.core.database import get_db
from app.schemas.insights import (
    Basis,
    DistributionBin,
    DistributionResponse,
    GroupBy,
    GroupStatsOut,
    HeadcountItem,
    HeadcountResponse,
    SummaryResponse,
)
from app.services import insights as insights_service

router = APIRouter(prefix="/api/insights", tags=["insights"])
DB_SESSION_DEPENDENCY = Depends(get_db)

# The same optional filters as the employee list, so numbers always match what the list shows.
SearchText = Annotated[
    str | None, Query(max_length=100, description="Search name or email")
]
CountryFilter = Annotated[str | None, Query(max_length=2)]
DepartmentFilter = Annotated[str | None, Query(max_length=80)]
JobTitleFilter = Annotated[str | None, Query(max_length=80)]


@router.get("/summary", response_model=SummaryResponse)
def summary(
    group_by: GroupBy = "country",
    basis: Basis = "local",
    q: SearchText = None,
    country: CountryFilter = None,
    department: DepartmentFilter = None,
    job_title: JobTitleFilter = None,
    db: Session = DB_SESSION_DEPENDENCY,
):
    stats = insights_service.group_summary(
        db, group_by, basis, q, country, department, job_title
    )
    return SummaryResponse(
        group_by=group_by,
        basis=basis,
        items=[
            GroupStatsOut(
                **asdict(item),
                currency=insights_service.display_currency(
                    basis, group_by, item.group, country
                ),
            )
            for item in stats
        ],
    )


@router.get("/distribution", response_model=DistributionResponse)
def distribution(
    bins: int = Query(20, ge=2, le=50),
    basis: Basis = "local",
    q: SearchText = None,
    country: CountryFilter = None,
    department: DepartmentFilter = None,
    job_title: JobTitleFilter = None,
    db: Session = DB_SESSION_DEPENDENCY,
):
    result = insights_service.salary_distribution(
        db, bins, basis, q, country, department, job_title
    )
    return DistributionResponse(
        basis=basis,
        currency=insights_service.display_currency(basis, "job_title", None, country),
        total=result.total,
        min=result.min,
        max=result.max,
        bins=[
            DistributionBin(start=b.start, end=b.end, count=b.count)
            for b in result.bins
        ],
    )


@router.get("/headcount", response_model=HeadcountResponse)
def headcount(
    q: SearchText = None,
    department: DepartmentFilter = None,
    job_title: JobTitleFilter = None,
    db: Session = DB_SESSION_DEPENDENCY,
):
    rows = insights_service.headcount_by_country(db, q, department, job_title)
    total = sum(row.count for row in rows)
    items = []
    for row in rows:
        country = COUNTRY_BY_CODE.get(row.country)
        items.append(
            HeadcountItem(
                country=row.country,
                country_name=country.name if country else row.country,
                currency=country.currency if country else "",
                headcount=row.count,
                share_percent=round(row.count / total * 100, 1),
                average_salary_usd=row.average_usd,
            )
        )
    return HeadcountResponse(total=total, items=items)
