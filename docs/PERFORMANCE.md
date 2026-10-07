# Performance Notes

Targets come from `REQUIREMENTS.md`. They are checked automatically by `backend/tests/test_performance.py` on 10,000 seeded employees.

| Target | Limit | How it is checked |
|---|---|---|
| List endpoint (any filter, sort or page) | < 300 ms | 7 request shapes, median of 5 runs after a warm-up |
| Insights endpoints (summary, distribution, headcount, dropdowns) | < 500 ms | 8 request shapes, median of 5 runs |
| Seed 10,000 employees | < 10 s | `test_seed_loader.py` |
| Whole test suite | < 10 s | the time `pytest` prints at the end |

Timings are measured through the full API stack (routing, validation, query, JSON) against a real SQLite file in WAL mode. The limits asserted are the requirement numbers themselves, so a passing test means the requirement is met with room to spare.

## How to run

```bash
cd backend
pytest -m performance -s     # benchmark only, prints the timing table
pytest -m "not performance"  # everything else, faster during development
PERF_LIMIT_FACTOR=2 pytest   # relax the limits on a slow machine (2 = twice as generous)
```

## What keeps it fast

| Concern | Technique |
|---|---|
| Filtering | Indexes on `country`, `department`, `job_title`, plus composites `(country, job_title)` and `(country, department)`. A test records the SQL the app really sends for each filter, asks SQLite for its query plan (`EXPLAIN QUERY PLAN`) and fails if any statement scans the table or misses the expected index. |
| List size | Page size is capped at 100; the browser never receives more than one page. |
| Page totals | A separate `COUNT` query, so the page query stays simple. |
| Stable paging | Every sort ends with the employee `id`, so deep pages never repeat or skip rows. |
| Statistics | Computed in the database. Count, min, max and average use `GROUP BY`; the median and quartiles use a window function that ranks salaries, and only the few rows on the needed ranks are fetched. |
| USD comparison | Converted inside the database with a `CASE` expression from the static rates table. |
| Seeding and import | One transaction and one bulk insert, not one insert per row. |
| SQLite settings | WAL mode (readers do not block the writer) and `synchronous=NORMAL`. |

## Known limits (and the next step for each)

| Limit | Why it is acceptable now | Next step |
|---|---|---|
| `OFFSET` gets slower on deep pages | The deepest page of 10,000 rows is still far inside the limit | Keyset pagination if the data grows far beyond 10k |
| Search is `LIKE '%term%'`, a scan of the table | Scanning 10,000 rows takes a few milliseconds | SQLite full-text search (FTS5) for much larger data |
| Sorting by name uses `lower()`, which cannot use an index | Sorting 10,000 rows is fast | A case-insensitive column or index |
| Salary sort across countries compares raw local amounts | The UI filters by country first or labels the currency | Sort by the USD value |
| SQLite allows one writer at a time | One HR user | PostgreSQL (SQLAlchemy lets us switch) |

## Measured on my machine

> **To fill in:** run `pytest -m performance -s` and paste the table it prints here, with the date and your machine (for example "Python 3.12, laptop, SSD"). The numbers below are deliberately empty until you have measured them yourself.

| Request | Median (ms) | Limit (ms) |
|---|---|---|
| list: first page | 6 | 300 |
| list: largest page (100 rows) | 8 | 300 |
| list: filter by country | 5 | 300 |
| list: country + job title (also computes peer_stats) |7 | 300 |
| list: search by name or email | 17 | 300 |
| list: sort by salary, highest first | 7 | 300 |
| list: last page (deepest OFFSET) | 20 | 300 |
| summary by country (local currency) | 23 | 500 |
| summary by department (USD) | 31 | 500 |
| summary by job title (USD, 31 groups) | 31 | 500 |
| summary by job title inside one country | 14 | 500 |
| distribution (USD, 20 bins) | 13 | 500 |
| distribution inside one country | 7 | 500 |
| headcount by country | 8 | 500 |
| dropdown options | 4 | 500 |


Seed time (`python -m app.seed --reset`): 0.42s
Whole test suite (`pytest`): 260 passed, in 4.00s
