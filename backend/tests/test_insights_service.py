import pytest
from app.core.errors import BadRequestError
from app.seed.generator import generate_employees
from app.seed.loader import seed_database
from app.services import insights


def test_distribution_rejects_zero_bins(db):
    with pytest.raises(ValueError):
        insights.salary_distribution(db, bins=0, basis="usd")


def test_distribution_rejects_unknown_basis(db):
    with pytest.raises(ValueError):
        insights.salary_distribution(db, basis="euro")


def test_distribution_local_without_country_is_refused(db):
    with pytest.raises(BadRequestError):
        insights.salary_distribution(db, basis="local")


def test_distribution_matches_plain_python_binning_on_seeded_data(db):
    seed_database(db, count=2000)
    salaries = [
        row["salary"]
        for row in generate_employees(count=2000)
        if row["country"] == "US"
    ]

    result = insights.salary_distribution(db, bins=10, basis="local", country="US")

    low, high = min(salaries), max(salaries)
    expected = [0] * 10
    for salary in salaries:
        expected[min(int((salary - low) * 10 / (high - low)), 9)] += 1

    assert result.total == len(salaries)
    assert [b.count for b in result.bins] == expected


def test_headcount_matches_plain_python_counts_on_seeded_data(db):
    seed_database(db, count=2000)
    rows = generate_employees(count=2000)

    result = {row.country: row.count for row in insights.headcount_by_country(db)}

    for code in {row["country"] for row in rows}:
        assert result[code] == sum(1 for row in rows if row["country"] == code)
    assert sum(result.values()) == 2000


def test_peer_stats_needs_both_filters(db, sample_employees):
    assert insights.peer_stats(db, "IN", None) is None
    assert insights.peer_stats(db, None, "Software Engineer") is None
    assert insights.peer_stats(db, " ", "Software Engineer") is None


def test_display_currency():
    assert insights.display_currency("usd", "job_title") == "USD"
    assert insights.display_currency("local", "country", "JP") == "JPY"
    assert insights.display_currency("local", "job_title", None, "de") == "EUR"
    assert insights.display_currency("local", "job_title", None, None) is None
