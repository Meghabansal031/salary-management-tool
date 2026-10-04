from typing import get_args

import pytest
from app.schemas import EmployeeCreate
from app.schemas.employee import SortField
from app.services import employees as service
from app.services.employees import EmployeeQuery


def names(items) -> list[str]:
    return [employee.full_name for employee in items]


def run(db, **params):
    return service.list_employees(db, EmployeeQuery(**params))


def test_empty_database_returns_no_items(db):
    items, total = run(db)
    assert items == []
    assert total == 0


def test_default_returns_everyone_sorted_by_name(db, sample_employees):
    items, total = run(db)

    assert total == 12
    assert len(items) == 12
    assert names(items)[0] == "Aarav Mehta"
    assert names(items)[-1] == "Yuki Tanaka"


# ---------- filters ----------


@pytest.mark.parametrize(
    "filters, expected",
    [
        ({"country": "IN"}, 3),
        ({"country": "in"}, 3),  # normalized to uppercase
        ({"country": "DE"}, 2),
        ({"country": "BR"}, 0),  # supported country with nobody in it
        ({"department": "Engineering"}, 6),
        ({"job_title": "Data Analyst"}, 3),
        (
            {"job_title": "Software Engineer", "country": "IN"},
            3,
        ),  # filters combine with AND
        ({"job_title": "Software Engineer", "country": "US"}, 1),
        ({"country": ""}, 12),  # blank filter is ignored
    ],
)
def test_filters(db, sample_employees, filters, expected):
    _items, total = run(db, **filters)
    assert total == expected


# ---------- search ----------


@pytest.mark.parametrize(
    "term, expected_name",
    [
        ("mar", "Sophie Martin"),  # part of a name
        ("weber@acme", "Lukas Weber"),  # part of an email
        ("SCHMIDT", "Anna Schmidt"),  # case-insensitive
        ("  tanaka  ", "Yuki Tanaka"),  # surrounding spaces ignored
    ],
)
def test_search_matches_name_or_email(db, sample_employees, term, expected_name):
    items, total = run(db, q=term)
    assert total == 1
    assert names(items) == [expected_name]


@pytest.mark.parametrize("term", ["%", "_"])
def test_search_treats_wildcards_literally(db, sample_employees, term):
    _items, total = run(db, q=term)
    assert total == 0


def test_search_combines_with_filters(db, sample_employees):
    assert run(db, q="schmidt", country="IN")[1] == 0
    assert run(db, q="schmidt", country="DE")[1] == 1


# ---------- sorting ----------


def test_sort_by_salary_descending(db, sample_employees):
    items, _ = run(db, sort="salary", order="desc")
    assert names(items)[0] == "Yuki Tanaka"  # 7,000,000 JPY: raw numbers, not converted


def test_sort_by_salary_ascending(db, sample_employees):
    items, _ = run(db, sort="salary", order="asc")
    assert names(items)[0] == "Sophie Martin"


def test_sort_by_hire_date_puts_oldest_first(db, sample_employees):
    items, _ = run(db, sort="hire_date", order="asc")
    assert names(items)[0] == "Michael Brown"  # hired 2016


def test_text_sort_ignores_letter_case(db, sample_employees, payload):
    service.create_employee(
        db, EmployeeCreate(**payload(full_name="bob lowercase", email="bob@acme.com"))
    )
    items, _ = run(db)
    # case-sensitive sorting would push "bob lowercase" after every capitalized name
    assert names(items)[:3] == ["Aarav Mehta", "Anna Schmidt", "bob lowercase"]


def test_unknown_sort_field_is_refused(db):
    with pytest.raises(ValueError):
        run(db, sort="salary; DROP TABLE employees")


def test_unknown_sort_order_is_refused(db):
    with pytest.raises(ValueError):
        run(db, order="sideways")


def test_sort_whitelist_matches_the_allowed_fields():
    assert set(service.SORT_COLUMNS) == set(get_args(SortField))


# ---------- pagination ----------


def test_pages_split_the_results_and_report_the_same_total(db, sample_employees):
    sizes = []
    for page in (1, 2, 3):
        items, total = run(db, page=page, page_size=5)
        sizes.append(len(items))
        assert total == 12
    assert sizes == [5, 5, 2]


def test_page_beyond_the_end_is_empty_but_keeps_the_total(db, sample_employees):
    items, total = run(db, page=4, page_size=5)
    assert items == []
    assert total == 12


def test_paging_through_tied_sort_values_never_repeats_or_skips_rows(
    db, sample_employees
):
    # Only 4 distinct departments for 12 people: heavy ties. The id tie-breaker keeps order stable.
    seen = []
    for page in (1, 2, 3):
        items, _ = run(db, sort="department", page=page, page_size=5)
        seen.extend(employee.id for employee in items)

    assert len(seen) == 12
    assert len(set(seen)) == 12


def test_filters_apply_before_paging(db, sample_employees):
    items, total = run(db, country="US", page=2, page_size=2)
    assert total == 3
    assert len(items) == 1
