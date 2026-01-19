from datetime import date

import pytest

from calendario import (
    generate_calendar,
    generate_ecuador_calendar,
    generate_multiple_calendars,
)
from calendario.domain import DayType


def test_generate_calendar_basic():
    """Generate a basic calendar for 2025"""
    cal = generate_calendar(2025, seed=42)

    assert cal.year == 2025
    assert len(cal.days) == 365


def test_generate_calendar_deterministic():
    """Same seed produces same calendar"""
    cal1 = generate_calendar(2025, seed=42)
    cal2 = generate_calendar(2025, seed=42)

    assert cal1.days == cal2.days


def test_generate_calendar_different_seeds():
    """Different seeds produce different calendars"""
    cal1 = generate_calendar(2025, seed=42)
    cal2 = generate_calendar(2025, seed=99)

    assert cal1.days != cal2.days


def test_generate_calendar_with_holidays():
    """Generate calendar with custom holidays"""
    holidays = [date(2025, 1, 1), date(2025, 12, 25)]
    cal = generate_calendar(2025, holidays=holidays, seed=42)

    assert cal.get_day(date(2025, 1, 1)).day_type == DayType.HOLIDAY
    assert cal.get_day(date(2025, 12, 25)).day_type == DayType.HOLIDAY


def test_generate_calendar_invalid_year():
    """Invalid year raises ValueError"""
    with pytest.raises(ValueError, match="Invalid year"):
        generate_calendar(0, seed=42)


def test_generate_calendar_holidays_wrong_year():
    """Holidays from wrong year raise ValueError"""
    holidays = [date(2024, 1, 1)]
    with pytest.raises(ValueError, match="must be in the target year"):
        generate_calendar(2025, holidays=holidays, seed=42)


def test_generate_calendar_duplicate_holidays():
    """Duplicate holidays raise ValueError"""
    holidays = [date(2025, 1, 1), date(2025, 1, 1)]
    with pytest.raises(ValueError, match="Duplicate holidays"):
        generate_calendar(2025, holidays=holidays, seed=42)


def test_generate_ecuador_calendar():
    """Generate calendar with Ecuador holidays"""
    cal = generate_ecuador_calendar(2025, seed=42)

    assert cal.year == 2025
    assert len(cal.days) == 365

    # Check that Jan 1 is a holiday
    jan_1 = cal.get_day(date(2025, 1, 1))
    assert jan_1.day_type in (DayType.HOLIDAY, DayType.WORKING_HOLIDAY)


def test_generate_ecuador_calendar_invalid_year():
    """Invalid year for Ecuador preset raises ValueError"""
    with pytest.raises(ValueError, match="No Ecuador holidays preset"):
        generate_ecuador_calendar(2030, seed=42)


def test_generate_multiple_calendars():
    """Generate multiple calendars for workers"""
    calendars = generate_multiple_calendars(2025, num_workers=3, base_seed=100)

    assert len(calendars) == 3
    assert all(cal.year == 2025 for cal in calendars)

    # All calendars should be different
    assert calendars[0].days != calendars[1].days
    assert calendars[1].days != calendars[2].days


def test_generate_multiple_calendars_deterministic():
    """Same base seed produces same set of calendars"""
    calendars1 = generate_multiple_calendars(2025, num_workers=2, base_seed=100)
    calendars2 = generate_multiple_calendars(2025, num_workers=2, base_seed=100)

    assert calendars1[0].days == calendars2[0].days
    assert calendars1[1].days == calendars2[1].days


def test_generated_calendar_has_work_and_rest_blocks():
    """Generated calendar has proper work and rest blocks"""
    cal = generate_calendar(2025, seed=42)

    work_blocks = cal.get_work_blocks()
    rest_blocks = cal.get_rest_blocks()

    assert len(work_blocks) > 0
    assert len(rest_blocks) > 0

    # All work blocks should be 3-7 days
    for block in work_blocks:
        assert 3 <= len(block) <= 7

    # All rest blocks should be 2 days
    for block in rest_blocks:
        assert len(block) == 2


def test_leap_year():
    """Generate calendar for leap year"""
    cal = generate_calendar(2024, seed=42)

    assert cal.year == 2024
    assert len(cal.days) == 366  # Leap year
