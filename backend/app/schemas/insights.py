"""Shared vocabulary for the insights queries."""

from typing import Literal

GroupBy = Literal["country", "department", "job_title"]

# "local": amounts in each employee's own currency (only meaningful inside one country).
# "usd": every amount converted with the static rates table, so any mix can be compared.
Basis = Literal["local", "usd"]
