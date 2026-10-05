"""Percentile maths, as pure functions with no database.

SQLite has no MEDIAN or percentile function, so the database ranks the salaries
(``ROW_NUMBER()`` window function) and returns only the one or two rows around each
percentile. These functions say *which* ranks are needed and interpolate between them.

Method: linear interpolation between closest ranks, position = (n - 1) * p. This is the
same as ``statistics.quantiles(method="inclusive")`` and ``numpy.percentile`` defaults,
which is how the tests check it independently.
"""

import math
from collections.abc import Sequence

# The "typical pay range" is the middle half of employees: from P25 to P75.
P25, MEDIAN, P75 = 0.25, 0.5, 0.75


def rank_positions(n: int, p: float) -> tuple[int, int, float]:
    """Where percentile ``p`` falls among ``n`` sorted values.

    Returns ``(lower_rank, upper_rank, fraction)``: 1-based ranks (as ROW_NUMBER() counts
    them) and how far between them the percentile sits (0 = exactly on the lower rank).
    """
    if n < 1:
        raise ValueError("n must be at least 1")
    if not 0 <= p <= 1:
        raise ValueError("p must be between 0 and 1")
    position = (n - 1) * p  # 0-based and possibly fractional
    lower = math.floor(position)
    upper = math.ceil(position)
    return lower + 1, upper + 1, position - lower


def interpolate(low_value: float, high_value: float, fraction: float) -> float:
    return low_value + (high_value - low_value) * fraction


def percentile(sorted_values: Sequence[float], p: float) -> float:
    """Percentile ``p`` (0 to 1) of values that are already sorted ascending."""
    lower, upper, fraction = rank_positions(len(sorted_values), p)
    return interpolate(sorted_values[lower - 1], sorted_values[upper - 1], fraction)
