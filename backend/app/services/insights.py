"""Salary statistics per group (country, department or job title), computed in the database."""

from dataclasses import dataclass

from sqlalchemy import case, func, select, tuple_
from sqlalchemy.orm import Session

from app.core.currency import USD_PER_UNIT
from app.core.errors import BadRequestError
from app.models import Employee
from app.services.employees import employee_filters
from app.services.stats import MEDIAN, P25, P75, interpolate, rank_positions

# Whitelist of columns a client can group by.
GROUP_COLUMNS = {
    "country": Employee.country,
    "department": Employee.department,
    "job_title": Employee.job_title,
}


@dataclass(frozen=True)
class GroupStats:
    group: str
    count: int
    min: float
    p25: float  # bottom of the typical range (a quarter of the group earns less)
    median: float
    average: float
    p75: float  # top of the typical range (three quarters of the group earns less)
    max: float


def usd_salary_expression():
    """SQL expression converting each salary to USD with the static rates (done in the database)."""
    return case(
        *[
            (Employee.currency == code, Employee.salary * rate)
            for code, rate in USD_PER_UNIT.items()
        ]
    )


def group_summary(
    db: Session,
    group_by: str,
    basis: str = "local",
    q: str | None = None,
    country: str | None = None,
    department: str | None = None,
    job_title: str | None = None,
) -> list[GroupStats]:
    """Count, min, P25, median, average, P75 and max for every group, sorted by group name."""
    group_column = GROUP_COLUMNS.get(group_by)
    if group_column is None:
        raise ValueError(f"Unsupported group_by: {group_by!r}")
    if basis not in ("local", "usd"):
        raise ValueError(f"Unsupported basis: {basis!r}")

    # Averaging rupees with euros is meaningless. Local amounts are only comparable
    # inside one country, so refuse (the UI then switches to USD).
    limited_to_one_country = bool(country and country.strip()) or group_by == "country"
    if basis == "local" and not limited_to_one_country:
        raise BadRequestError(
            "Local-currency statistics need a single country. Filter by country or use USD."
        )

    value = Employee.salary if basis == "local" else usd_salary_expression()
    filters = employee_filters(q, country, department, job_title)

    # Query 1: the simple aggregates, one row per group.
    aggregates = db.execute(
        select(
            group_column,
            func.count(),
            func.min(value),
            func.max(value),
            func.avg(value),
        )
        .where(*filters)
        .group_by(group_column)
        .order_by(group_column)
    ).all()
    if not aggregates:
        return []

    # Work out, per group, which ranks the quartiles fall on (pure Python, see stats.py).
    needed: dict[tuple[str, float], tuple[int, int, float]] = {}
    wanted_ranks: set[tuple[str, int]] = set()
    for group, count, *_ in aggregates:
        for p in (P25, MEDIAN, P75):
            lower, upper, fraction = rank_positions(count, p)
            needed[(group, p)] = (lower, upper, fraction)
            wanted_ranks.update({(group, lower), (group, upper)})

    # Query 2: rank every salary inside its group (window function) and fetch only the
    # handful of rows sitting on those ranks.
    ranked = (
        select(
            group_column.label("grp"),
            value.label("value"),
            func.row_number()
            .over(partition_by=group_column, order_by=value)
            .label("rn"),
        )
        .where(*filters)
        .subquery()
    )
    rows = db.execute(
        select(ranked.c.grp, ranked.c.rn, ranked.c.value).where(
            tuple_(ranked.c.grp, ranked.c.rn).in_(sorted(wanted_ranks))
        )
    ).all()
    value_at = {(grp, rn): float(v) for grp, rn, v in rows}

    def quantile(group: str, p: float) -> float:
        lower, upper, fraction = needed[(group, p)]
        return interpolate(value_at[(group, lower)], value_at[(group, upper)], fraction)

    return [
        GroupStats(
            group=group,
            count=count,
            min=round(float(minimum), 2),
            p25=round(quantile(group, P25), 2),
            median=round(quantile(group, MEDIAN), 2),
            average=round(float(average), 2),
            p75=round(quantile(group, P75), 2),
            max=round(float(maximum), 2),
        )
        for group, count, minimum, maximum, average in aggregates
    ]
