from datetime import date

from calendario.config.presets import get_ecuador_holidays
from calendario.core.domain import Calendar
from calendario.generation.generator import generate_calendar as _generate_calendar


def generate_calendar(
    year: int,
    holidays: list[date] | None = None,
    seed: int | None = None,
) -> Calendar:
    """
    Generate a calendar for the specified year.

    Args:
        year: Year to generate calendar for
        holidays: Optional list of holiday dates
        seed: Optional random seed for reproducibility

    Returns:
        Valid Calendar object

    Raises:
        ValueError: If year is invalid or holidays contain duplicates
        ValidationError: If constraints cannot be satisfied

    Example:
        >>> cal = generate_calendar(2025, seed=42)
        >>> len(cal.days)
        365
    """
    return _generate_calendar(year, holidays, seed)


def generate_ecuador_calendar(year: int, seed: int | None = None) -> Calendar:
    """
    Generate a calendar using Ecuador's official holidays.

    Args:
        year: Year to generate calendar for
        seed: Optional random seed for reproducibility

    Returns:
        Valid Calendar object

    Raises:
        ValueError: If no preset exists for the year
        ValidationError: If constraints cannot be satisfied

    Example:
        >>> cal = generate_ecuador_calendar(2025, seed=42)
    """
    holidays = get_ecuador_holidays(year)
    return _generate_calendar(year, holidays, seed)


def generate_multiple_calendars(
    year: int,
    num_workers: int,
    holidays: list[date] | None = None,
    base_seed: int | None = None,
) -> list[Calendar]:
    """
    Generate multiple calendars for different workers.

    Args:
        year: Year to generate calendars for
        num_workers: Number of worker calendars to generate
        holidays: Optional list of holiday dates
        base_seed: Optional base seed (each worker gets base_seed + worker_index)

    Returns:
        List of valid Calendar objects

    Example:
        >>> calendars = generate_multiple_calendars(2025, num_workers=3, base_seed=100)
        >>> len(calendars)
        3
    """
    calendars = []
    for i in range(num_workers):
        seed = (base_seed + i) if base_seed is not None else None
        calendar = _generate_calendar(year, holidays, seed)
        calendars.append(calendar)
    return calendars
