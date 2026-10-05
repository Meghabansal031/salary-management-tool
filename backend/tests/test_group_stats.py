import statistics
from collections import defaultdict
from typing import get_args

import pytest
from app.core.currency import to_usd
from app.core.errors import BadRequestError
from app.schemas.insights import GroupBy
from app.seed.generator import generate_employees
from app.seed.loader import seed_database
from app.services import insights
from app.services.insights import group_summary


def by_group(stats):
    return {item.group: item for item in stats}


def check(item, count, minimum, p25, median, average, p75, maximum):
    assert item.count == count
    assert item.min == pytest.approx(minimum)
    assert item.p25 == pytest.approx(p25)
    assert item.median == pytest.approx(median)
    assert item.average == pytest.approx(average)
    assert item.p75 == pytest.approx(p75)
    assert item.max == pytest.approx(maximum)


# ---------- hand-checked numbers (sample_employees in conftest.py) ----------


def test_stats_by_country_in_local_currency(db, sample_employees):
    stats = by_group(group_summary(db, "country", "local"))

    assert set(stats) == {"IN", "DE", "US", "FR", "JP", "GB"}
    check(
        stats["IN"], 3, 2_000_000, 2_200_000, 2_400_000, 2_400_000, 2_600_000, 2_800_000
    )
    check(stats["DE"], 2, 70_000, 72_500, 75_000, 75_000, 77_500, 80_000)
    check(stats["US"], 3, 120_000, 130_000, 140_000, 136_666.67, 145_000, 150_000)
    check(stats["GB"], 2, 60_000, 61_500, 63_000, 63_000, 64_500, 66_000)


def test_a_group_of_one_has_the_same_value_everywhere(db, sample_employees):
    france = by_group(group_summary(db, "country", "local"))["FR"]
    check(france, 1, 55_000, 55_000, 55_000, 55_000, 55_000, 55_000)


def test_groups_are_sorted_by_name(db, sample_employees):
    groups = [item.group for item in group_summary(db, "country", "local")]
    assert groups == sorted(groups)


def test_stats_by_job_title_inside_one_country(db, sample_employees):
    stats = by_group(group_summary(db, "job_title", "local", country="IN"))

    assert set(stats) == {"Software Engineer"}
    check(
        stats["Software Engineer"],
        3,
        2_000_000,
        2_200_000,
        2_400_000,
        2_400_000,
        2_600_000,
        2_800_000,
    )


def test_country_filter_is_case_insensitive(db, sample_employees):
    assert group_summary(db, "job_title", "local", country="in") == group_summary(
        db, "job_title", "local", country="IN"
    )


def test_usd_basis_converts_in_the_database(db, sample_employees):
    # Software Engineers worldwide in USD, sorted: 24,000 28,800 33,600 75,600 86,400 120,000
    stats = by_group(group_summary(db, "job_title", "usd"))

    check(
        stats["Software Engineer"], 6, 24_000, 30_000, 54_600, 61_400, 83_700, 120_000
    )


def test_usd_and_local_agree_for_a_country_that_uses_usd(db, sample_employees):
    usd = by_group(group_summary(db, "country", "usd"))["US"]
    local = by_group(group_summary(db, "country", "local"))["US"]
    assert usd == local


def test_filters_are_applied_before_grouping(db, sample_employees):
    stats = group_summary(db, "department", "local", country="GB")

    assert [(item.group, item.count) for item in stats] == [("Analytics", 2)]


def test_search_filter_is_applied(db, sample_employees):
    stats = group_summary(db, "country", "local", q="schmidt")
    assert [(item.group, item.count) for item in stats] == [("DE", 1)]


def test_no_matching_employees_gives_an_empty_list(db, sample_employees):
    assert group_summary(db, "department", "local", country="BR") == []


def test_empty_database_gives_an_empty_list(db):
    assert group_summary(db, "country", "usd") == []


# ---------- guard against meaningless mixed-currency statistics ----------


@pytest.mark.parametrize(
    "kwargs",
    [
        {"group_by": "job_title"},
        {"group_by": "department"},
        {"group_by": "job_title", "department": "Engineering"},
        {"group_by": "department", "q": "a"},
    ],
)
def test_local_currency_across_countries_is_refused(db, sample_employees, kwargs):
    with pytest.raises(BadRequestError):
        group_summary(db, basis="local", **kwargs)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"group_by": "country", "basis": "local"},
        {"group_by": "job_title", "basis": "local", "country": "IN"},
        {"group_by": "department", "basis": "usd"},
    ],
)
def test_allowed_combinations_work(db, sample_employees, kwargs):
    assert group_summary(db, **kwargs)


def test_unknown_group_by_is_refused(db):
    with pytest.raises(ValueError):
        group_summary(db, "salary; DROP TABLE employees", "usd")


def test_unknown_basis_is_refused(db):
    with pytest.raises(ValueError):
        group_summary(db, "country", "euro")


def test_group_by_whitelist_matches_the_allowed_values():
    assert set(insights.GROUP_COLUMNS) == set(get_args(GroupBy))


# ---------- independent check: database result vs plain Python on 2,000 seeded employees ----------


def python_quartiles(values):
    values = sorted(values)
    if len(values) == 1:
        return values[0], values[0], values[0]
    return tuple(statistics.quantiles(values, n=4, method="inclusive"))


@pytest.mark.parametrize("group_by", ["country", "department", "job_title"])
def test_database_statistics_match_python_statistics_in_usd(db, group_by):
    seed_database(db, count=2000)
    rows = generate_employees(count=2000)

    expected = defaultdict(list)
    for row in rows:
        expected[row[group_by]].append(to_usd(row["salary"], row["currency"]))

    actual = by_group(group_summary(db, group_by, "usd"))

    assert set(actual) == set(expected)
    for group, values in expected.items():
        q1, q2, q3 = python_quartiles(values)
        item = actual[group]
        assert item.count == len(values)
        assert item.min == pytest.approx(min(values), abs=0.01)
        assert item.max == pytest.approx(max(values), abs=0.01)
        assert item.average == pytest.approx(statistics.mean(values), abs=0.01)
        assert item.p25 == pytest.approx(q1, abs=0.01)
        assert item.median == pytest.approx(q2, abs=0.01)
        assert item.p75 == pytest.approx(q3, abs=0.01)


def test_database_statistics_match_python_statistics_in_local_currency(db):
    seed_database(db, count=2000)
    rows = generate_employees(count=2000)

    expected = defaultdict(list)
    for row in rows:
        if row["country"] == "IN":
            expected[row["job_title"]].append(row["salary"])

    actual = by_group(group_summary(db, "job_title", "local", country="IN"))

    assert set(actual) == set(expected)
    for group, values in expected.items():
        q1, q2, q3 = python_quartiles(values)
        assert actual[group].median == pytest.approx(q2, abs=0.01)
        assert actual[group].p25 == pytest.approx(q1, abs=0.01)
        assert actual[group].p75 == pytest.approx(q3, abs=0.01)
