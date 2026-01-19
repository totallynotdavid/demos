from datetime import date

import pytest

from calendario.core.types import DayType
from calendario.generation.holidays import process_holidays


def test_process_holidays_empty():
    result = process_holidays([])
    assert result == {}


def test_process_holidays_single_isolated():
    holidays = [date(2025, 1, 1)]
    result = process_holidays(holidays)
    assert result == {date(2025, 1, 1): DayType.HOLIDAY}


def test_process_holidays_consecutive_pair():
    holidays = [date(2025, 2, 16), date(2025, 2, 17)]
    result = process_holidays(holidays)
    assert result == {
        date(2025, 2, 16): DayType.WORKING_HOLIDAY,
        date(2025, 2, 17): DayType.HOLIDAY,
    }


def test_process_holidays_multiple_isolated():
    holidays = [date(2025, 1, 1), date(2025, 5, 1), date(2025, 12, 25)]
    result = process_holidays(holidays)
    assert result == {
        date(2025, 1, 1): DayType.HOLIDAY,
        date(2025, 5, 1): DayType.HOLIDAY,
        date(2025, 12, 25): DayType.HOLIDAY,
    }


def test_process_holidays_sunday_monday_pair_raises():
    sunday = date(2025, 3, 2)
    monday = date(2025, 3, 3)
    assert sunday.weekday() == 6
    assert monday.weekday() == 0

    with pytest.raises(ValueError, match="Sunday-Monday holiday pair not allowed"):
        process_holidays([sunday, monday])


def test_process_holidays_more_than_two_consecutive_raises():
    holidays = [date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 3)]
    with pytest.raises(ValueError, match="Holiday block too large"):
        process_holidays(holidays)


def test_process_holidays_handles_duplicates():
    holidays = [date(2025, 1, 1), date(2025, 1, 1)]
    result = process_holidays(holidays)
    assert result == {date(2025, 1, 1): DayType.HOLIDAY}


def test_process_holidays_unsorted_input():
    holidays = [date(2025, 5, 1), date(2025, 1, 1), date(2025, 12, 25)]
    result = process_holidays(holidays)
    assert len(result) == 3
    assert all(dt == DayType.HOLIDAY for dt in result.values())
