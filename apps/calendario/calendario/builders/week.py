from datetime import date, timedelta
from random import Random

from calendario.domain.models import Day, Week
from calendario.domain.types import DayType


def build_week(
    week_number: int,
    year: int,
    free_weekend_saturdays: frozenset[date],
    holiday_types: dict[date, DayType],
    *,
    previous_week_ended_with_rest: bool,
    rng: Random,
) -> Week:
    """
    Builds a single week with all constraints satisfied.

    Steps:
    1. Create 7 blank days
    2. Assign holidays
    3. Place rest block (weekend if allocated, else weekday)
    4. Fill work days
    5. Create Week object

    Args:
        week_number: ISO week number
        year: Year
        free_weekend_saturdays: Set of Saturday dates that should be free weekends
        holiday_types: Dict mapping holiday dates to DayType
        previous_week_ended_with_rest: True if previous week ended with rest
        rng: Random number generator (unused for now, deterministic placement)

    Returns:
        Week object with all days assigned

    Raises:
        ValueError: If rest block cannot be placed
    """
    days = _create_blank_week_days(week_number, year)
    days = _assign_holidays_to_days(days, holiday_types)

    rest_saturday = _find_free_weekend_for_week(days, free_weekend_saturdays)
    days = _place_rest_block(days, rest_saturday, holiday_types)
    days = _fill_work_days(
        days, previous_week_ended_with_rest=previous_week_ended_with_rest
    )

    return Week(week_number=week_number, year=year, days=tuple(days))


def _create_blank_week_days(week_number: int, year: int) -> list[Day]:
    """
    Creates 7 Day objects with None type for the given ISO week.

    Args:
        week_number: ISO week number
        year: Year

    Returns:
        List of 7 Day objects (Monday to Sunday)
    """
    jan_4 = date(year, 1, 4)
    week_start = (
        jan_4 - timedelta(days=jan_4.weekday()) + timedelta(weeks=week_number - 1)
    )

    days = []
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        days.append(Day(date=day_date, day_type=None))

    return days


def _assign_holidays_to_days(
    days: list[Day], holiday_types: dict[date, DayType]
) -> list[Day]:
    """
    Assigns holiday types to applicable days.

    Args:
        days: List of Day objects
        holiday_types: Dict mapping date to DayType

    Returns:
        Updated list of Day objects
    """
    return [
        day.with_type(holiday_types[day.date]) if day.date in holiday_types else day
        for day in days
    ]


def _find_free_weekend_for_week(
    days: list[Day], free_weekend_saturdays: frozenset[date]
) -> date | None:
    """
    Returns Saturday date if this week has a free weekend.

    Args:
        days: List of Day objects
        free_weekend_saturdays: Set of Saturday dates for free weekends

    Returns:
        Saturday date if found, None otherwise
    """
    for day in days:
        if day.date.weekday() == 5 and day.date in free_weekend_saturdays:
            return day.date
    return None


def _place_rest_block(
    days: list[Day],
    free_weekend_saturday: date | None,
    holiday_types: dict[date, DayType],
) -> list[Day]:
    """
    Places 2-day rest block in the week.

    Priority:
    1. Use free weekend if allocated
    2. Find valid weekday position

    Args:
        days: List of Day objects
        free_weekend_saturday: Saturday date if this week has free weekend
        holiday_types: Dict mapping date to DayType (for validation)

    Returns:
        Updated list of Day objects

    Raises:
        ValueError: If rest block cannot be placed
    """
    if free_weekend_saturday:
        sat_idx = next(i for i, d in enumerate(days) if d.date == free_weekend_saturday)
        days[sat_idx] = days[sat_idx].with_type(DayType.REST)
        days[sat_idx + 1] = days[sat_idx + 1].with_type(DayType.REST)
        return days

    valid_idx = _find_weekday_rest_position(days)
    if valid_idx is None:
        msg = (
            f"Cannot place rest block in week {days[0].week_number}. "
            f"No valid position found."
        )
        raise ValueError(msg)

    days[valid_idx] = days[valid_idx].with_type(DayType.REST)
    days[valid_idx + 1] = days[valid_idx + 1].with_type(DayType.REST)
    return days


def _find_weekday_rest_position(days: list[Day]) -> int | None:
    """
    Finds valid position for weekday rest block.

    A position is valid if:
    - Both days are unassigned
    - Not Sunday-Monday
    - Won't create 3+ consecutive rest days

    Args:
        days: List of Day objects

    Returns:
        Index where rest block can start, or None if no valid position
    """
    for i in range(6):  # 0-5 (can't start on Sunday)
        day1, day2 = days[i], days[i + 1]

        # Must be unassigned
        if day1.day_type is not None or day2.day_type is not None:
            continue

        # Cannot be Sunday-Monday
        if day1.date.weekday() == 6:
            continue

        # Cannot create 3+ consecutive rest
        if i > 0 and days[i - 1].is_rest_day:
            continue
        if i < 5 and days[i + 2].is_rest_day:
            continue

        return i

    return None


def _fill_work_days(
    days: list[Day], *, previous_week_ended_with_rest: bool
) -> list[Day]:
    """
    Fills unassigned days with WORK/ORDERING.

    Rules:
    - First work day after rest block -> ORDERING
    - If week starts with work and previous week ended with rest -> ORDERING
    - All other work days -> WORK

    Args:
        days: List of Day objects
        previous_week_ended_with_rest: True if previous week ended with rest

    Returns:
        Updated list of Day objects

    Raises:
        ValueError: If no rest block found in week
    """
    rest_idx = next((i for i, d in enumerate(days) if d.day_type == DayType.REST), None)

    if rest_idx is None:
        msg = "No rest block found in week"
        raise ValueError(msg)

    # Determine if we need ORDERING at start
    needs_ordering_at_start = rest_idx > 0 and previous_week_ended_with_rest

    # Fill before rest block
    if rest_idx > 0:
        days = _fill_segment(
            days, 0, rest_idx, start_with_ordering=needs_ordering_at_start
        )

    # Fill after rest block (always starts with ORDERING)
    rest_end = rest_idx + 2  # Rest block is 2 days
    if rest_end < 7:
        days = _fill_segment(days, rest_end, 7, start_with_ordering=True)

    return days


def _fill_segment(
    days: list[Day], start: int, end: int, *, start_with_ordering: bool
) -> list[Day]:
    """
    Fills a segment with work days.

    Args:
        days: List of Day objects
        start: Start index (inclusive)
        end: End index (exclusive)
        start_with_ordering: If True, first day is ORDERING

    Returns:
        Updated list of Day objects
    """
    for i in range(start, end):
        if days[i].day_type is not None:
            continue

        if i == start and start_with_ordering:
            days[i] = days[i].with_type(DayType.ORDERING)
        else:
            days[i] = days[i].with_type(DayType.WORK)

    return days
