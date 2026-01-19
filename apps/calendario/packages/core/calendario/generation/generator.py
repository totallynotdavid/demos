from datetime import date
from random import Random

from calendario.core.domain import Calendar
from calendario.generation.execution import execute_plan
from calendario.generation.holidays import process_holidays
from calendario.generation.planning import create_plan
from calendario.validation.validator import validate_calendar


def generate_calendar(
    year: int,
    holidays: list[date] | None = None,
    seed: int | None = None,
) -> Calendar:
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

    rng = Random(seed) if seed is not None else Random()

    holiday_map = process_holidays(holidays)

    plan = create_plan(year, holiday_map, rng)

    calendar = execute_plan(plan)

    validate_calendar(calendar)

    return calendar
