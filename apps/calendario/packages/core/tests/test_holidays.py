from datetime import date

import pytest

from calendario.domain import DayType
from calendario.generation.holidays import process_holidays


def test_empty_holidays():
    """Empty list returns empty dict"""
    assert process_holidays([]) == {}


def test_single_isolated_holiday():
    """Single holiday becomes HOLIDAY"""
    holidays = [date(2025, 1, 1)]
    result = process_holidays(holidays)
    assert result == {date(2025, 1, 1): DayType.HOLIDAY}


def test_multiple_isolated_holidays():
    """Multiple isolated holidays all become HOLIDAY"""
    holidays = [date(2025, 1, 1), date(2025, 5, 1), date(2025, 12, 25)]
    result = process_holidays(holidays)
    assert result == {
        date(2025, 1, 1): DayType.HOLIDAY,
        date(2025, 5, 1): DayType.HOLIDAY,
        date(2025, 12, 25): DayType.HOLIDAY,
    }


def test_consecutive_pair():
    """Consecutive pair: first is WORKING_HOLIDAY, second is HOLIDAY"""
    holidays = [date(2025, 1, 1), date(2025, 1, 2)]  # Thu-Fri
    result = process_holidays(holidays)
    assert result == {
        date(2025, 1, 1): DayType.WORKING_HOLIDAY,
        date(2025, 1, 2): DayType.HOLIDAY,
    }


def test_sunday_monday_pair_raises():
    """Sunday-Monday pairs are not allowed"""
    sunday = date(2025, 3, 2)
    monday = date(2025, 3, 3)
    assert sunday.weekday() == 6
    assert monday.weekday() == 0

    with pytest.raises(ValueError, match="Sunday-Monday holiday pair not allowed"):
        process_holidays([sunday, monday])


def test_three_consecutive_raises():
    """3+ consecutive holidays are not allowed"""
    holidays = [date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 3)]
    with pytest.raises(ValueError, match="Holiday block too large"):
        process_holidays(holidays)


def test_handles_duplicates():
    """Duplicate dates are deduplicated"""
    holidays = [date(2025, 1, 1), date(2025, 1, 1)]
    result = process_holidays(holidays)
    assert result == {date(2025, 1, 1): DayType.HOLIDAY}


def test_sorts_unsorted_input():
    """Unsorted input is handled correctly"""
    holidays = [date(2025, 5, 1), date(2025, 1, 1), date(2025, 12, 25)]
    result = process_holidays(holidays)
    assert len(result) == 3
    assert all(dt == DayType.HOLIDAY for dt in result.values())
