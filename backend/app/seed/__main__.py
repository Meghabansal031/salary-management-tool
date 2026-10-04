"""Command line: ``python -m app.seed [--count N] [--seed N] [--reset]``."""

import argparse
import sys
import time

from app.core.database import SessionLocal, init_db
from app.seed.generator import DEFAULT_COUNT, DEFAULT_SEED
from app.seed.loader import DatabaseNotEmptyError, seed_database


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.seed", description="Seed demo employees."
    )
    parser.add_argument(
        "--count", type=int, default=DEFAULT_COUNT, help="number of employees"
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="random seed")
    parser.add_argument(
        "--reset", action="store_true", help="delete existing employees first"
    )
    args = parser.parse_args(argv)

    init_db()
    started = time.perf_counter()
    with SessionLocal() as db:
        try:
            inserted = seed_database(db, args.count, args.seed, args.reset)
        except DatabaseNotEmptyError as error:
            print(f"Error: {error}", file=sys.stderr)
            return 1
    print(f"Seeded {inserted:,} employees in {time.perf_counter() - started:.2f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
