from datetime import date

from calendario.core.domain import Calendar, Day
from calendario.core.types import DayType
from calendario.validation.rules import (
    validate_holiday_pairing,
    validate_no_sunday_monday_rest,
    validate_ordering_placement,
    validate_rest_blocks,
    validate_work_block_lengths,
)


def test_validate_work_block_lengths_valid():
    days = [
        Day(date(2025, 1, 1), DayType.WORK),
        Day(date(2025, 1, 2), DayType.WORK),
        Day(date(2025, 1, 3), DayType.WORK),
        Day(date(2025, 1, 4), DayType.REST),
        Day(date(2025, 1, 5), DayType.REST),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_work_block_lengths(cal)
    assert errors == []


def test_validate_work_block_lengths_too_short():
    days = [
        Day(date(2025, 1, 1), DayType.WORK),
        Day(date(2025, 1, 2), DayType.WORK),
        Day(date(2025, 1, 3), DayType.REST),
        Day(date(2025, 1, 4), DayType.REST),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_work_block_lengths(cal)
    assert len(errors) == 1
    assert "2 days (min: 3)" in errors[0]


def test_validate_work_block_lengths_too_long():
    days = [Day(date(2025, 1, i), DayType.WORK) for i in range(1, 10)]
    cal = Calendar(2025, tuple(days))
    errors = validate_work_block_lengths(cal)
    assert len(errors) == 1
    assert "9 days (max: 7)" in errors[0]


def test_validate_rest_blocks_valid():
    days = [
        Day(date(2025, 1, 1), DayType.WORK),
        Day(date(2025, 1, 2), DayType.REST),
        Day(date(2025, 1, 3), DayType.REST),
        Day(date(2025, 1, 4), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_rest_blocks(cal)
    assert errors == []


def test_validate_rest_blocks_invalid_single():
    days = [
        Day(date(2025, 1, 1), DayType.WORK),
        Day(date(2025, 1, 2), DayType.REST),
        Day(date(2025, 1, 3), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_rest_blocks(cal)
    assert len(errors) == 1
    assert "1 days (must be 2)" in errors[0]


def test_validate_rest_blocks_invalid_triple():
    days = [
        Day(date(2025, 1, 1), DayType.WORK),
        Day(date(2025, 1, 2), DayType.REST),
        Day(date(2025, 1, 3), DayType.REST),
        Day(date(2025, 1, 4), DayType.REST),
        Day(date(2025, 1, 5), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_rest_blocks(cal)
    assert len(errors) == 1
    assert "3 days (must be 2)" in errors[0]


def test_validate_no_sunday_monday_rest_valid():
    saturday = date(2025, 1, 4)
    sunday = date(2025, 1, 5)
    assert saturday.weekday() == 5
    assert sunday.weekday() == 6

    days = [
        Day(saturday, DayType.REST),
        Day(sunday, DayType.REST),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_no_sunday_monday_rest(cal)
    assert errors == []


def test_validate_no_sunday_monday_rest_invalid():
    sunday = date(2025, 1, 5)
    monday = date(2025, 1, 6)
    assert sunday.weekday() == 6
    assert monday.weekday() == 0

    days = [
        Day(sunday, DayType.REST),
        Day(monday, DayType.REST),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_no_sunday_monday_rest(cal)
    assert len(errors) == 1
    assert "Sunday-Monday rest block" in errors[0]


def test_validate_ordering_placement_valid():
    days = [
        Day(date(2025, 1, 1), DayType.REST),
        Day(date(2025, 1, 2), DayType.REST),
        Day(date(2025, 1, 3), DayType.ORDERING),
        Day(date(2025, 1, 4), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_ordering_placement(cal)
    assert errors == []


def test_validate_ordering_placement_invalid():
    days = [
        Day(date(2025, 1, 1), DayType.REST),
        Day(date(2025, 1, 2), DayType.REST),
        Day(date(2025, 1, 3), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_ordering_placement(cal)
    assert len(errors) == 1
    assert "Expected ORDERING" in errors[0]


def test_validate_holiday_pairing_isolated():
    days = [
        Day(date(2025, 1, 1), DayType.HOLIDAY),
        Day(date(2025, 1, 2), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_holiday_pairing(cal)
    assert errors == []


def test_validate_holiday_pairing_consecutive():
    days = [
        Day(date(2025, 1, 1), DayType.WORKING_HOLIDAY),
        Day(date(2025, 1, 2), DayType.HOLIDAY),
        Day(date(2025, 1, 3), DayType.WORK),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_holiday_pairing(cal)
    assert errors == []


def test_validate_holiday_pairing_invalid_pair():
    days = [
        Day(date(2025, 1, 1), DayType.HOLIDAY),
        Day(date(2025, 1, 2), DayType.HOLIDAY),
    ]
    cal = Calendar(2025, tuple(days))
    errors = validate_holiday_pairing(cal)
    assert len(errors) == 2
    assert "should be WORKING_HOLIDAY" in errors[0]
