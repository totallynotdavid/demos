from datetime import date

import pytest

from calendario.api import (
    generate_calendar,
    generate_ecuador_calendar,
    generate_multiple_calendars,
)
from calendario.core.types import DayType
from calendario.validation.validator import ValidationError


def test_generate_calendar_2025_no_holidays():
    cal = generate_calendar(2025, seed=42)
    
    assert cal.year == 2025
    assert len(cal.days) == 365
    
    work_blocks = cal.get_work_blocks()
    for block in work_blocks:
        assert 3 <= len(block) <= 7
    
    rest_blocks = cal.get_rest_blocks()
    for block in rest_blocks:
        assert len(block) == 2


def test_generate_calendar_deterministic_with_seed():
    cal1 = generate_calendar(2025, seed=42)
    cal2 = generate_calendar(2025, seed=42)
    
    assert cal1.days == cal2.days


def test_generate_calendar_different_without_seed():
    cal1 = generate_calendar(2025, seed=42)
    cal2 = generate_calendar(2025, seed=99)
    
    assert cal1.days != cal2.days


def test_generate_calendar_with_holidays():
    holidays = [date(2025, 1, 1), date(2025, 12, 25)]
    cal = generate_calendar(2025, holidays=holidays, seed=42)
    
    assert cal.get_day(date(2025, 1, 1)).day_type == DayType.HOLIDAY
    assert cal.get_day(date(2025, 12, 25)).day_type == DayType.HOLIDAY


def test_generate_calendar_invalid_year():
    with pytest.raises(ValueError, match="Invalid year"):
        generate_calendar(0, seed=42)


def test_generate_calendar_holidays_wrong_year():
    holidays = [date(2024, 1, 1)]
    with pytest.raises(ValueError, match="must be in the target year"):
        generate_calendar(2025, holidays=holidays, seed=42)


def test_generate_calendar_duplicate_holidays():
    holidays = [date(2025, 1, 1), date(2025, 1, 1)]
    with pytest.raises(ValueError, match="Duplicate holidays"):
        generate_calendar(2025, holidays=holidays, seed=42)


def test_generate_ecuador_calendar_2025():
    cal = generate_ecuador_calendar(2025, seed=42)
    
    assert cal.year == 2025
    assert len(cal.days) == 365
    
    jan_1 = cal.get_day(date(2025, 1, 1))
    assert jan_1.day_type in (DayType.HOLIDAY, DayType.WORKING_HOLIDAY)


def test_generate_ecuador_calendar_2026():
    cal = generate_ecuador_calendar(2026, seed=42)
    
    assert cal.year == 2026
    assert len(cal.days) == 365


def test_generate_ecuador_calendar_invalid_year():
    with pytest.raises(ValueError, match="No Ecuador holidays preset"):
        generate_ecuador_calendar(2030, seed=42)


def test_generate_multiple_calendars():
    calendars = generate_multiple_calendars(2025, num_workers=3, base_seed=100)
    
    assert len(calendars) == 3
    assert all(cal.year == 2025 for cal in calendars)
    
    assert calendars[0].days != calendars[1].days
    assert calendars[1].days != calendars[2].days


def test_generate_multiple_calendars_deterministic():
    calendars1 = generate_multiple_calendars(2025, num_workers=2, base_seed=100)
    calendars2 = generate_multiple_calendars(2025, num_workers=2, base_seed=100)
    
    assert calendars1[0].days == calendars2[0].days
    assert calendars1[1].days == calendars2[1].days


def test_monthly_weekends_constraint():
    cal = generate_calendar(2025, seed=42)
    
    for month in range(1, 13):
        month_days = cal.get_month_days(month)
        free_weekends = 0
        
        for i in range(len(month_days) - 1):
            day1 = month_days[i]
            day2 = month_days[i + 1]
            
            if (day1.date.weekday() == 5 and 
                day2.date.weekday() == 6 and
                day1.day_type == DayType.REST and 
                day2.day_type == DayType.REST):
                free_weekends += 1
        
        assert free_weekends == 1, f"Month {month} has {free_weekends} free weekends"


def test_ordering_after_rest():
    cal = generate_calendar(2025, seed=42)
    
    for i in range(1, len(cal.days)):
        if cal.days[i - 1].is_rest_day and cal.days[i].is_work_day:
            assert cal.days[i].day_type == DayType.ORDERING


def test_no_sunday_monday_rest():
    cal = generate_calendar(2025, seed=42)
    
    for i in range(len(cal.days) - 1):
        if (cal.days[i].day_type == DayType.REST and 
            cal.days[i + 1].day_type == DayType.REST):
            assert not (cal.days[i].date.weekday() == 6 and 
                       cal.days[i + 1].date.weekday() == 0)