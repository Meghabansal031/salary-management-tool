"""Deterministic demo data. Run with ``python -m app.seed``.

Kept import-free on purpose: ``generator`` is pure Python (no database), so it can be
used and tested on its own; ``loader`` is the only part that touches the database.
"""
