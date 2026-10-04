# Salary Management Tool: Requirements

## Goal
Replace the Excel files ACME's HR team uses to manage salaries for ~10,000 employees across multiple countries with a web app. The HR Manager (the only persona) must be able to **maintain salary data** quickly and **answer questions about how the organization pays people**.

## Primary user: the HR Manager
Not an engineer; works in Excel today, so is comfortable with filtering and sorting, but loses time to slow files, copy-paste errors and rebuilding pivot tables for every "how do we pay?" question. Needs trustworthy answers in seconds, for example in a leadership meeting or when preparing an offer.

| Job | What they are trying to do | Example question | What the app must provide |
|---|---|---|---|
| Maintain records | Keep data accurate as people join, move or get raises | "Update Megha's salary", "Add a new hire in Germany" | Fast search, add/edit forms with validation |
| Understand pay by group | Summarize pay for any slice of the org | "What is the median salary for Engineers in India?" | Count, min, median, average, max and typical pay range by country, department and job title |
| Spot outliers and gaps | Check consistency and fairness within a role | "Who earns far above or below their job-title peers?" | Filter by job title, sort by salary, group median visible alongside |
| Compare across countries | See the org-wide picture despite different currencies | "How do headcount and pay differ across countries?" | Headcount by country; USD-normalized comparison |
| Load existing data | Move off Excel without retyping 10,000 rows | "Import last year's spreadsheet" | Excel/CSV import with validation and an error report |

## Scope: what we are building
1. **Employee management (CRUD):** name, email, job title, department, country, currency, annual salary, hire date.
2. **Browse at scale:** server-side search, filters (country, department, job title), sorting, pagination. The UI never loads all 10,000 rows.
3. **Salary insights dashboard:** count, min, median, average, max and typical pay range (where the middle half of employees fall) by country, department and job title; salary histogram; headcount by country.
4. **Multi-country pay:** salaries stored in **local currency**; group comparisons use local currency within a country; org-wide comparisons convert to USD with a static rates table.
5. **Seed script:** deterministic (fixed random seed); 10,000 realistic employees in seconds.
6. **Quality bar:** unit tests on validation, aggregation, filtering, pagination and import; list API < 300 ms, insights < 500 ms on 10k rows.
7. **Excel import (final build step):** upload `.xlsx`/`.csv`, download a template, validate every row, preview row-level errors, commit valid rows. Built last because it depends on the final data model and validation rules.

## Deliberately left out (and why)
| Not included | Reason |
|---|---|
| Payroll, bonuses, equity, tax computation | Each adds its own data model and country-specific rules. Base salary answers the stated problem; the schema can gain component columns later. |
| Authentication and roles | One persona; first production addition. |
| Salary history and audit trail | Valuable, but doubles the data model; overwriting is acceptable for now. |
| Live exchange rates | External dependency and non-determinism; static rates keep tests deterministic. |
| Approval workflows, notifications | Outside the stated problem. |

## Success criteria
- Find any employee and edit their salary in under 30 seconds.
- Every question in the table above is answerable in the app.
- A 10,000-row spreadsheet imports in under 30 seconds with a clear error report.
- Seed runs in under 10 seconds; tests run in under 10 seconds; app is deployed with a short demo video.

## Technical approach
Python (FastAPI + SQLAlchemy + SQLite) backend; Next.js (React) UI with a component library; `openpyxl`/`pandas` for import. Aggregations run in the database, with indexes on country, department and job title. Details in `docs/DESIGN.md`.
