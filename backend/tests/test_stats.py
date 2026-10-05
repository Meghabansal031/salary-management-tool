import random
import statistics

import pytest
from app.services.stats import MEDIAN, P25, P75, interpolate, percentile, rank_positions

# ---------- which ranks are needed ----------


@pytest.mark.parametrize(
    "n, p, expected",
    [
        (5, 0.5, (3, 3, 0.0)),  # odd count: the middle value itself
        (4, 0.5, (2, 3, 0.5)),  # even count: halfway between the two middle values
        (1, 0.25, (1, 1, 0.0)),  # one value: every percentile is that value
        (1, 0.75, (1, 1, 0.0)),
        (
            10,
            0.75,
            (7, 8, 0.75),
        ),  # position 6.75 -> ranks 7 and 8, three quarters across
        (3, 0.25, (1, 2, 0.5)),
        (5, 0.0, (1, 1, 0.0)),  # minimum
        (5, 1.0, (5, 5, 0.0)),  # maximum
    ],
)
def test_rank_positions(n, p, expected):
    assert rank_positions(n, p) == expected


def test_rank_positions_rejects_an_empty_group():
    with pytest.raises(ValueError):
        rank_positions(0, 0.5)


@pytest.mark.parametrize("p", [-0.1, 1.1])
def test_rank_positions_rejects_p_outside_zero_to_one(p):
    with pytest.raises(ValueError):
        rank_positions(5, p)


# ---------- interpolation and percentile ----------


def test_interpolate_goes_between_two_values():
    assert interpolate(10, 20, 0) == 10
    assert interpolate(10, 20, 0.5) == 15
    assert interpolate(10, 20, 1) == 20


def test_percentile_of_a_single_value_is_that_value():
    assert percentile([42], P25) == 42
    assert percentile([42], MEDIAN) == 42


def test_percentile_of_identical_values():
    assert percentile([5, 5, 5, 5], P75) == 5


def test_percentile_hand_checked_example():
    values = [10, 20, 30, 40]
    assert percentile(values, MEDIAN) == 25  # between 20 and 30
    assert (
        percentile(values, P25) == 17.5
    )  # position 0.75: three quarters from 10 to 20
    assert percentile(values, P75) == 32.5  # position 2.25: a quarter from 30 to 40


# ---------- independent check against Python's own statistics library ----------


@pytest.mark.parametrize("size", [2, 3, 4, 5, 10, 11, 100, 101])
def test_quartiles_match_the_standard_library(size):
    rng = random.Random(size)
    values = sorted(rng.randint(30_000, 300_000) for _ in range(size))

    q1, q2, q3 = statistics.quantiles(values, n=4, method="inclusive")

    assert percentile(values, P25) == pytest.approx(q1)
    assert percentile(values, MEDIAN) == pytest.approx(q2)
    assert percentile(values, P75) == pytest.approx(q3)


@pytest.mark.parametrize("size", [2, 3, 4, 5, 10, 11, 100, 101])
def test_median_matches_statistics_median(size):
    rng = random.Random(size + 1000)
    values = sorted(rng.randint(1, 1_000_000) for _ in range(size))
    assert percentile(values, MEDIAN) == pytest.approx(statistics.median(values))
