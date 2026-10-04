import pytest
from app.core.currency import (
    COUNTRIES,
    SUPPORTED_CURRENCIES,
    USD_PER_UNIT,
    UnsupportedCountryError,
    UnsupportedCurrencyError,
    currency_for_country,
    to_usd,
)


def test_twelve_countries_with_unique_codes():
    codes = [c.code for c in COUNTRIES]
    assert len(codes) == 12
    assert len(set(codes)) == 12


def test_every_country_currency_has_a_rate():
    for country in COUNTRIES:
        assert country.currency in USD_PER_UNIT, country.code


def test_every_rate_belongs_to_a_country():
    used = {c.currency for c in COUNTRIES}
    assert used == SUPPORTED_CURRENCIES


def test_usd_rate_is_one_and_all_rates_positive():
    assert USD_PER_UNIT["USD"] == 1.0
    assert all(rate > 0 for rate in USD_PER_UNIT.values())


def test_salary_factors_are_between_zero_and_one():
    assert all(0 < c.salary_factor <= 1.0 for c in COUNTRIES)


def test_united_kingdom_uses_iso_code_gb():
    assert currency_for_country("GB") == "GBP"


def test_euro_countries_share_a_currency():
    assert {currency_for_country(code) for code in ("DE", "FR", "NL")} == {"EUR"}


def test_unknown_country_raises():
    with pytest.raises(UnsupportedCountryError):
        currency_for_country("XX")


def test_to_usd_converts_with_static_rate():
    assert to_usd(100, "USD") == 100
    assert to_usd(1000, "EUR") == pytest.approx(1080)


def test_to_usd_unknown_currency_raises():
    with pytest.raises(UnsupportedCurrencyError):
        to_usd(100, "XXX")
