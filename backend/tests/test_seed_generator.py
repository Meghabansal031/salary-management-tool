from collections import Counter
from statistics import mean

import pytest
from app.core.currency import COUNTRIES, COUNTRY_BY_CODE, to_usd
from app.schemas import EmployeeCreate
from app.seed.data import (
    COUNTRY_NAME_GROUP,
    COUNTRY_WEIGHTS,
    EARLIEST_HIRE_DATE,
    JOB_CATALOG,
    NAME_POOLS,
    REFERENCE_DATE,
    TITLE_BANDS,
)
from app.seed.generator import generate_employees


@pytest.fixture(scope="module")
def rows():
    """The default 10,000 rows, generated once for the whole module."""
    return generate_employees()


# ---------- shape and determinism ----------


def test_generates_ten_thousand_rows_by_default(rows):
    assert len(rows) == 10_000


def test_count_is_respected():
    assert len(generate_employees(count=37)) == 37
    assert generate_employees(count=0) == []


def test_negative_count_is_refused():
    with pytest.raises(ValueError):
        generate_employees(count=-1)


def test_same_seed_gives_identical_data():
    assert generate_employees(count=2000, seed=42) == generate_employees(
        count=2000, seed=42
    )


def test_different_seed_gives_different_data():
    assert generate_employees(count=500, seed=1) != generate_employees(
        count=500, seed=2
    )


def test_a_larger_run_starts_with_the_same_rows_as_a_smaller_one():
    # Each row only depends on the rows before it, so extending the count never reshuffles history.
    assert generate_employees(count=300)[:100] == generate_employees(count=100)


# ---------- every row obeys the real validation rules ----------


def test_every_row_passes_the_same_validation_as_the_api(rows):
    for row in rows:
        EmployeeCreate(**row)


def test_emails_are_unique_and_already_lowercase(rows):
    emails = [row["email"] for row in rows]
    assert len(set(emails)) == len(emails)
    assert all(email == email.lower() for email in emails)


# ---------- realism ----------


def test_all_countries_and_departments_are_present(rows):
    assert {row["country"] for row in rows} == {country.code for country in COUNTRIES}
    assert {row["department"] for row in rows} == set(JOB_CATALOG)
    assert len(JOB_CATALOG) == 10


def test_every_supported_country_has_a_weight_and_a_name_pool():
    codes = {country.code for country in COUNTRIES}
    assert set(COUNTRY_WEIGHTS) == codes
    assert set(COUNTRY_NAME_GROUP) == codes
    assert set(COUNTRY_NAME_GROUP.values()) <= set(NAME_POOLS)


def test_headcount_follows_the_weights(rows):
    counts = Counter(row["country"] for row in rows)
    assert counts.most_common(1)[0][0] == "US"
    assert counts["US"] > counts["JP"] * 2


def test_each_job_title_stays_in_its_own_department(rows):
    department_of = {
        role.title: department
        for department, group in JOB_CATALOG.items()
        for role in group
    }
    assert all(department_of[row["job_title"]] == row["department"] for row in rows)


def test_salaries_stay_near_the_role_band_for_the_country(rows):
    for row in rows:
        band = TITLE_BANDS[row["job_title"]]
        factor = COUNTRY_BY_CODE[row["country"]].salary_factor
        usd = to_usd(row["salary"], row["currency"])
        # noise is clamped to +/-15%, rounding adds under 1%
        assert band.low_usd * factor * 0.84 <= usd <= band.high_usd * factor * 1.16, row


def test_the_same_role_pays_more_in_the_us_than_in_india(rows):
    def average_usd(country):
        return mean(
            to_usd(row["salary"], row["currency"])
            for row in rows
            if row["job_title"] == "Software Engineer" and row["country"] == country
        )

    assert average_usd("US") > 2 * average_usd("IN")


def test_salaries_are_rounded_to_three_significant_digits(rows):
    for row in rows[:500]:
        digits = str(row["salary"])
        assert set(digits[3:]) <= {"0"}, row["salary"]


def test_hire_dates_are_within_the_expected_window(rows):
    assert all(EARLIEST_HIRE_DATE <= row["hire_date"] <= REFERENCE_DATE for row in rows)
