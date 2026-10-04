"""Supported countries, their currencies and static USD exchange rates.

This is the single source of truth: validation, dropdowns, the seed script and
USD-normalized insights all read from here. Adding a country is a one-line change.

Rates are static on purpose (deterministic tests, no external dependency) and
illustrative, not live market data. ``salary_factor`` is only used by the seed script
to make demo salaries differ realistically between countries (US = 1.0).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Country:
    code: str  # ISO 3166-1 alpha-2, for example "GB" for the United Kingdom
    name: str
    region: str
    currency: str  # ISO 4217
    salary_factor: float


COUNTRIES: tuple[Country, ...] = (
    Country("US", "United States", "North America", "USD", 1.00),
    Country("CA", "Canada", "North America", "CAD", 0.85),
    Country("GB", "United Kingdom", "Europe", "GBP", 0.80),
    Country("DE", "Germany", "Europe", "EUR", 0.80),
    Country("FR", "France", "Europe", "EUR", 0.72),
    Country("NL", "Netherlands", "Europe", "EUR", 0.82),
    Country("IN", "India", "Asia", "INR", 0.30),
    Country("JP", "Japan", "Asia", "JPY", 0.70),
    Country("SG", "Singapore", "Asia", "SGD", 0.85),
    Country("AU", "Australia", "Asia-Pacific", "AUD", 0.85),
    Country("AE", "United Arab Emirates", "Middle East", "AED", 0.75),
    Country("BR", "Brazil", "Latin America", "BRL", 0.35),
)

# USD value of 1 unit of the local currency.
USD_PER_UNIT: dict[str, float] = {
    "USD": 1.0,
    "CAD": 0.73,
    "GBP": 1.27,
    "EUR": 1.08,
    "INR": 0.012,
    "JPY": 0.0067,
    "SGD": 0.74,
    "AUD": 0.66,
    "AED": 0.272,
    "BRL": 0.18,
}

COUNTRY_BY_CODE: dict[str, Country] = {c.code: c for c in COUNTRIES}
SUPPORTED_CURRENCIES: frozenset[str] = frozenset(USD_PER_UNIT)


class UnsupportedCountryError(ValueError):
    """Raised when a country code is not in the supported list."""


class UnsupportedCurrencyError(ValueError):
    """Raised when a currency code has no exchange rate."""


def get_country(code: str) -> Country:
    try:
        return COUNTRY_BY_CODE[code]
    except KeyError:
        raise UnsupportedCountryError(f"Unsupported country: {code!r}") from None


def currency_for_country(code: str) -> str:
    return get_country(code).currency


def to_usd(amount: float, currency: str) -> float:
    """Convert an amount in ``currency`` to USD using the static rates."""
    try:
        return amount * USD_PER_UNIT[currency]
    except KeyError:
        raise UnsupportedCurrencyError(f"Unsupported currency: {currency!r}") from None
