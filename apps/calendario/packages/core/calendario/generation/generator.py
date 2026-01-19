from datetime import date
from random import Random

from calendario.domain import Calendar
from calendario.generation.holidays import process_holidays
from calendario.generation.schedule import build_schedule
from calendario.validation.validator import validate_calendar


def generate_calendar(
    year: int,
    holidays: list[date] | None = None,
    seed: int | None = None,
) -> Calendar:
    """
    Generate a valid calendar for the specified year.

    The generated calendar will satisfy all requirements:
    - REQ1: Solitary holidays are rest, pairs have one working day
    - REQ2: Rest days come in 2-day blocks
    - REQ3: First work day after rest is ORDERING
    - REQ4: Work blocks are 3-7 days with variability
    - REQ5: Exactly one Sat-Sun weekend per month
    - REQ6: Exactly one rest block per ISO week
    - REQ7: No Sunday-Monday rest blocks

    Args:
        year: Year to generate (must be >= 1)
        holidays: Optional list of holiday dates
        seed: Optional random seed for reproducibility

    Returns:
        Valid Calendar object

    Raises:
        ValueError: If inputs are invalid
        ValidationError: If algorithm produces invalid calendar (bug)

    Examples:
        >>> cal = generate_calendar(2025, seed=42)
        >>> len(cal.days)
        365

        >>> cal = generate_calendar(2025, holidays=[date(2025, 1, 1)])
        >>> cal.get_day(date(2025, 1, 1)).day_type
        DayType.HOLIDAY
    """
    # Validate inputs
    if year < 1:
        msg = f"Invalid year: {year}"
        raise ValueError(msg)

    holidays = holidays or []

    if holidays and not all(h.year == year for h in holidays):
        msg = "All holidays must be in the target year"
        raise ValueError(msg)

    if len(holidays) != len(set(holidays)):
        msg = "Duplicate holidays found"
        raise ValueError(msg)

    # Process holidays into typed map
    holiday_map = process_holidays(holidays)

    # Generate schedule
    rng = Random(seed) if seed is not None else Random()
    days = build_schedule(year, holiday_map, rng)

    # Build calendar
    calendar = Calendar(year, days)

    # Validate (should always pass with correct algorithm)
    validate_calendar(calendar)

    return calendar
