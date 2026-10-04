"""Put generated employees into the database, quickly and in one transaction."""

from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from app.models import Employee
from app.seed.generator import DEFAULT_COUNT, DEFAULT_SEED, generate_employees


class DatabaseNotEmptyError(RuntimeError):
    """Raised instead of silently mixing demo data into existing data."""


def _employee_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Employee)) or 0


def seed_database(
    db: Session,
    count: int = DEFAULT_COUNT,
    seed: int = DEFAULT_SEED,
    reset: bool = False,
) -> int:
    """Insert ``count`` generated employees and return how many were inserted.

    Refuses to run on a non-empty table unless ``reset`` is true, in which case the
    existing employees are deleted first (ids start again from 1, so a reset database is
    identical every time).
    """
    if _employee_count(db) and not reset:
        raise DatabaseNotEmptyError(
            "The database already has employees. Use reset to replace them."
        )

    rows = generate_employees(count, seed)
    if reset:
        db.execute(delete(Employee))
    if rows:
        db.execute(
            insert(Employee), rows
        )  # one bulk executemany, not 10,000 round trips
    db.commit()
    return len(rows)


def seed_if_empty(
    db: Session, count: int = DEFAULT_COUNT, seed: int = DEFAULT_SEED
) -> int:
    """Seed only when there is no data yet (used on the first start of a hosted demo)."""
    if _employee_count(db):
        return 0
    return seed_database(db, count, seed)
