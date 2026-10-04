"""Validation rules for employee data (single source of truth).

The create/update API and the Excel import both validate through these models, so a
row that is valid in one place is valid in the other. Messages arrive from Pydantic as
"Value error, <message>"; the API layer can strip that prefix for display.
"""

import re
from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationInfo,
    field_validator,
)

from app.core.currency import COUNTRY_BY_CODE, SUPPORTED_CURRENCIES

# Sanity ceiling in local currency units. Generous on purpose: 1 billion JPY is only
# about 6.7 million USD, so large-denomination currencies are not rejected.
MAX_SALARY = 1_000_000_000
EARLIEST_HIRE_DATE = date(1950, 1, 1)

# List endpoint limits. The sort fields are a whitelist: only these names ever reach ORDER BY.
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100
SortField = Literal[
    "full_name", "job_title", "department", "country", "salary", "hire_date"
]
SortOrder = Literal["asc", "desc"]

# Practical email check (not the full RFC): local part, "@", dotted domain, 2+ letter TLD.
_EMAIL_PATTERN = re.compile(
    r"[A-Za-z0-9._%+\-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}"
)

# Whitespace is stripped before the length checks run, so "   " counts as empty.
FullName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
Label = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]
Email = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, to_lower=True, min_length=3, max_length=254
    ),
]
CountryCode = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_upper=True, min_length=2, max_length=2),
]
CurrencyCode = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_upper=True, min_length=3, max_length=3),
]
Salary = Annotated[int, Field(gt=0, le=MAX_SALARY)]


class EmployeeCreate(BaseModel):
    """Input for creating an employee. Values are normalized as well as checked."""

    full_name: FullName
    email: Email  # stored lowercase
    job_title: Label
    department: Label
    country: CountryCode  # uppercased, must be a supported country
    currency: CurrencyCode  # uppercased, must be the country's currency
    salary: Salary  # annual, whole units of local currency
    hire_date: date

    @field_validator("email")
    @classmethod
    def email_must_look_valid(cls, value: str) -> str:
        if not _EMAIL_PATTERN.fullmatch(value):
            raise ValueError("Enter a valid email address")
        return value

    @field_validator("country")
    @classmethod
    def country_must_be_supported(cls, value: str) -> str:
        if value not in COUNTRY_BY_CODE:
            raise ValueError(f"Unsupported country: {value}")
        return value

    # `country` is declared before `currency`, so its (valid) value is available here.
    # Checking in this field validator, not a model validator, keeps the error attached
    # to the "currency" column, which is what the import's row-level report needs.
    @field_validator("currency")
    @classmethod
    def currency_must_match_country(cls, value: str, info: ValidationInfo) -> str:
        if value not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {value}")
        country = info.data.get("country")
        if country in COUNTRY_BY_CODE:
            expected = COUNTRY_BY_CODE[country].currency
            if value != expected:
                raise ValueError(f"Currency for {country} must be {expected}")
        return value

    @field_validator("hire_date")
    @classmethod
    def hire_date_must_be_plausible(cls, value: date) -> date:
        if value > datetime.now(tz=timezone.utc).date():
            raise ValueError("Hire date cannot be in the future")
        if value < EARLIEST_HIRE_DATE:
            raise ValueError(f"Hire date cannot be before {EARLIEST_HIRE_DATE.year}")
        return value


class EmployeeUpdate(EmployeeCreate):
    """PUT replaces the whole record, so an update follows exactly the same rules."""


class EmployeeRead(BaseModel):
    """Output shape. Plain types on purpose: reading stored rows must never fail validation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    job_title: str
    department: str
    country: str
    currency: str
    salary: int
    hire_date: date
    created_at: datetime
    updated_at: datetime


class EmployeePage(BaseModel):
    """One page of employees plus the total number of matches across all pages."""

    items: list[EmployeeRead]
    total: int
    page: int
    page_size: int
