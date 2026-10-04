"""The ``employees`` table: one row per employee, salary in local currency."""

from datetime import date, datetime

from sqlalchemy import CheckConstraint, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    job_title: Mapped[str] = mapped_column(String(80), index=True)
    department: Mapped[str] = mapped_column(String(80), index=True)
    country: Mapped[str] = mapped_column(String(2), index=True)  # ISO 3166-1 alpha-2
    currency: Mapped[str] = mapped_column(String(3))  # ISO 4217
    # Annual salary in whole units of `currency`. Integer, never float, so money is exact.
    salary: Mapped[int]
    hire_date: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_employees_email"),
        # Emails are stored lowercase (validation normalizes them), so a plain unique
        # constraint is case-insensitive. This check makes the database enforce it too.
        CheckConstraint("email = lower(email)", name="ck_employees_email_lowercase"),
        CheckConstraint("salary > 0", name="ck_employees_salary_positive"),
        # Most questions combine a country with a role or department.
        Index("ix_employees_country_job_title", "country", "job_title"),
        Index("ix_employees_country_department", "country", "department"),
    )
