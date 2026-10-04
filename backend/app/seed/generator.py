"""Generate realistic employees. Pure Python: no database, fully deterministic.

The same ``seed`` always produces the same rows (on the same Python version, because the
standard library may change its random algorithms between releases). Tests therefore
compare two runs with each other instead of hard-coding expected values.
"""

import random
import re
from datetime import timedelta

from app.core.currency import COUNTRIES, USD_PER_UNIT
from app.seed.data import (
    COUNTRY_NAME_GROUP,
    COUNTRY_WEIGHTS,
    EARLIEST_HIRE_DATE,
    EMAIL_DOMAIN,
    JOB_CATALOG,
    NAME_POOLS,
    REFERENCE_DATE,
)

DEFAULT_COUNT = 10_000
DEFAULT_SEED = 42


def _slug(text: str) -> str:
    """Lowercase letters only: 'van den Berg' -> 'vandenberg'."""
    return re.sub(r"[^a-z]", "", text.lower())


def _round_salary(value: float) -> int:
    """Keep three significant digits (85,432 -> 85,400; 2,431,987 -> 2,430,000), like real pay."""
    whole = max(int(value), 1)
    step = 10 ** max(len(str(whole)) - 3, 0)
    return max(round(whole / step) * step, 1)


def generate_employees(
    count: int = DEFAULT_COUNT, seed: int = DEFAULT_SEED
) -> list[dict]:
    """Return ``count`` employee rows as dicts, ready for a bulk insert."""
    if count < 0:
        raise ValueError("count must not be negative")

    rng = random.Random(seed)

    countries = list(COUNTRIES)
    country_weights = [COUNTRY_WEIGHTS[country.code] for country in countries]
    roles = [
        (department, role)
        for department, group in JOB_CATALOG.items()
        for role in group
    ]
    role_weights = [role.weight for _department, role in roles]
    hire_span_days = (REFERENCE_DATE - EARLIEST_HIRE_DATE).days

    rows: list[dict] = []
    used_emails: dict[str, int] = {}

    for _ in range(count):
        country = rng.choices(countries, country_weights)[0]
        department, role = rng.choices(roles, role_weights)[0]

        first_names, last_names = NAME_POOLS[COUNTRY_NAME_GROUP[country.code]]
        first, last = rng.choice(first_names), rng.choice(last_names)

        # Emails are unique by construction: repeats get a number (john.smith, john.smith2, ...).
        # The base only contains letters, so a numbered email can never equal another base.
        base = f"{_slug(first)}.{_slug(last)}"
        seen = used_emails.get(base, 0)
        used_emails[base] = seen + 1
        email = f"{base}{seen + 1 if seen else ''}@{EMAIL_DOMAIN}"

        # US band for the role -> scaled for the country -> a little noise -> local currency.
        usd_base = rng.triangular(
            role.low_usd,
            role.high_usd,
            role.low_usd + 0.4 * (role.high_usd - role.low_usd),
        )
        noise = min(max(rng.gauss(1.0, 0.05), 0.85), 1.15)
        usd_salary = usd_base * country.salary_factor * noise
        salary = _round_salary(usd_salary / USD_PER_UNIT[country.currency])

        # Skewed towards recent hires, as in a growing company.
        offset = int(rng.triangular(0, hire_span_days, hire_span_days * 0.7))

        rows.append(
            {
                "full_name": f"{first} {last}",
                "email": email,
                "job_title": role.title,
                "department": department,
                "country": country.code,
                "currency": country.currency,
                "salary": salary,
                "hire_date": EARLIEST_HIRE_DATE + timedelta(days=offset),
            }
        )
    return rows
