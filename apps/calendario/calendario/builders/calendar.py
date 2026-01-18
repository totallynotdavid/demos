from datetime import date
from random import Random

from calendario.builders.holidays import process_holidays
from calendario.builders.week import build_week
from calendario.builders.weekends import allocate_free_weekends
from calendario.domain.models import Calendar
from calendario.domain.types import CalendarConfig


def build_calendar(config: CalendarConfig, rng: Random | None = None) -> Calendar:
    """
    Builds a complete calendar for the year.

    Algorithm:
    1. Process holidays into day type assignments
    2. Allocate which weekends are free (1 per month)
    3. For each week in year:
       a. Build week with constraints
       b. Track if week ended with rest
    4. Create Calendar object

    Args:
        config: Calendar configuration
        rng: Random number generator (creates new if None)

    Returns:
        Complete Calendar object

    Raises:
        ValueError: If calendar cannot be built with given constraints
    """
    if rng is None:
        rng = Random()

    year = config["year"]

    # Step 1: Process holidays
    holiday_types = process_holidays(config["holidays"])

    # Step 2: Allocate free weekends
    free_weekend_saturdays = allocate_free_weekends(year, holiday_types, rng)

    # Step 3: Build each week
    weeks = []
    week_numbers = _get_iso_weeks_for_year(year)
    previous_week_ended_with_rest = False

    for week_num in week_numbers:
        week = build_week(
            week_number=week_num,
            year=year,
            free_weekend_saturdays=free_weekend_saturdays,
            holiday_types=holiday_types,
            previous_week_ended_with_rest=previous_week_ended_with_rest,
            rng=rng,
        )

        weeks.append(week)
        previous_week_ended_with_rest = week.ends_with_rest

    # Step 4: Create Calendar
    return Calendar(year=year, weeks=tuple(weeks))


def _get_iso_weeks_for_year(year: int) -> list[int]:
    """
    Gets all ISO week numbers that belong to the given year.

    Args:
        year: Target year

    Returns:
        List of ISO week numbers
    """
    jan_1 = date(year, 1, 1)
    dec_31 = date(year, 12, 31)

    start_week = jan_1.isocalendar()[1]
    end_week = dec_31.isocalendar()[1]

    # Handle year boundary cases
    if start_week > 50:  # Jan 1 is in previous year's last week
        start_week = 1

    if end_week == 1:  # Dec 31 is in next year's first week
        # Find last week of current year
        dec_28 = date(year, 12, 28)
        end_week = dec_28.isocalendar()[1]

    return list(range(start_week, end_week + 1))
