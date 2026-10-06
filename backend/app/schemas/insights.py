"""Shared vocabulary and response shapes for the insights and meta endpoints."""

from typing import Literal

from pydantic import BaseModel

GroupBy = Literal["country", "department", "job_title"]

# "local": amounts in each employee's own currency (only meaningful inside one country).
# "usd": every amount converted with the static rates table, so any mix can be compared.
Basis = Literal["local", "usd"]


class GroupStatsOut(BaseModel):
    """Pay statistics for one group. ``p25``-``p75`` is the typical range (middle half)."""

    group: str
    currency: str | None
    count: int
    min: float
    p25: float
    median: float
    average: float
    p75: float
    max: float


class SummaryResponse(BaseModel):
    group_by: GroupBy
    basis: Basis
    items: list[GroupStatsOut]


class DistributionBin(BaseModel):
    start: float
    end: float
    count: int


class DistributionResponse(BaseModel):
    basis: Basis
    currency: str | None
    total: int
    min: float | None
    max: float | None
    bins: list[DistributionBin]


class HeadcountItem(BaseModel):
    country: str
    country_name: str
    currency: str
    headcount: int
    share_percent: float
    average_salary_usd: float


class HeadcountResponse(BaseModel):
    total: int
    items: list[HeadcountItem]


class PeerStats(BaseModel):
    """How people with the same job title in the same country are paid (local currency)."""

    country: str
    job_title: str
    currency: str
    count: int
    p25: float
    median: float
    p75: float


class CountryOption(BaseModel):
    code: str
    name: str
    currency: str


class MetaFilters(BaseModel):
    countries: list[CountryOption]
    departments: list[str]
    job_titles: list[str]
    currencies: list[str]
