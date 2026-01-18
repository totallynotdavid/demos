import calendar

from datetime import date, timedelta
from random import Random

from calendario.domain.types import DayType


def allocate_free_weekends(
    year: int, holidays: dict[date, DayType], rng: Random
) -> frozenset[date]:
    """
    Allocates exactly 1 free weekend (Sat-Sun) per month.

    Args:
        year: Target year
        holidays: Dict mapping date to DayType for all holidays
        rng: Random number generator for selection

    Returns:
        Frozenset of Saturday dates that should be free weekends

    Raises:
        ValueError: If cannot find valid weekend for any month
    """
    free_saturdays = []

    for month in range(1, 13):
        candidates = _find_weekend_candidates(year, month, holidays)

        if not candidates:
            msg = (
                f"Cannot find valid free weekend for {year}-{month:02d}. "
                f"All weekends are either holidays or would create 3+ day rest blocks."
            )
            raise ValueError(msg)

        chosen = rng.choice(candidates)
        free_saturdays.append(chosen)

    return frozenset(free_saturdays)


def _find_weekend_candidates(
    year: int, month: int, holidays: dict[date, DayType]
) -> list[date]:
    """
    Finds valid Saturday dates for free weekends in a month.

    A Saturday is valid if:
    - Neither Saturday nor Sunday is a holiday
    - Previous Friday is not a holiday (prevents 3-day block)
    - Next Monday is not a holiday (prevents 3-day block)

    Args:
        year: Target year
        month: Target month (1-12)
        holidays: Dict mapping date to DayType

    Returns:
        List of valid Saturday dates
    """
    candidates = []

    _, last_day = calendar.monthrange(year, month)

    for day in range(1, last_day + 1):
        current_date = date(year, month, day)

        if current_date.weekday() != 5:  # Not Saturday
            continue

        saturday = current_date
        sunday = saturday + timedelta(days=1)
        friday = saturday - timedelta(days=1)
        monday = sunday + timedelta(days=1)

        # Check: Neither Sat nor Sun is holiday
        if saturday in holidays or sunday in holidays:
            continue

        # Check: Won't create 3+ day block with adjacent days
        if friday in holidays or monday in holidays:
            continue

        candidates.append(saturday)

    return candidates
