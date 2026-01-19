from datetime import date

from calendario.domain import Day, DayType
from calendario.generation.constraints import (
    ScheduleState,
    can_place_rest_at,
    is_saturday,
    max_work_days_remaining,
    needs_rest_this_week,
    needs_weekend_this_month,
    would_create_sunday_monday_rest,
)


def test_needs_rest_this_week():
    """Check if week needs rest"""
    state = ScheduleState(
        current_date=date(2025, 1, 5),
        days_so_far=(),
        weeks_with_rest=frozenset([1, 3]),
        months_with_weekend=frozenset(),
    )

    # Week 2 needs rest
    assert needs_rest_this_week(state, date(2025, 1, 5))

    # Week 1 already has rest
    assert not needs_rest_this_week(state, date(2025, 1, 1))


def test_needs_weekend_this_month():
    """Check if month needs weekend"""
    state = ScheduleState(
        current_date=date(2025, 1, 5),
        days_so_far=(),
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset([1, 3]),
    )

    # Month 2 needs weekend
    assert needs_weekend_this_month(state, date(2025, 2, 1))

    # Month 1 already has weekend
    assert not needs_weekend_this_month(state, date(2025, 1, 15))


def test_would_create_sunday_monday_rest():
    """Sunday start creates Sun-Mon rest"""
    sunday = date(2025, 3, 2)  # Sunday
    monday = date(2025, 3, 3)  # Monday

    assert would_create_sunday_monday_rest(sunday)
    assert not would_create_sunday_monday_rest(monday)


def test_can_place_rest_at_basic():
    """Basic rest placement validation"""
    # Normal weekday - should work
    assert can_place_rest_at(date(2025, 1, 5), {})  # Monday

    # Sunday - should fail
    assert not can_place_rest_at(date(2025, 1, 4), {})  # Sunday


def test_can_place_rest_at_with_holidays():
    """Rest can't overwrite holidays"""
    holiday_map = {
        date(2025, 1, 5): DayType.HOLIDAY,
        date(2025, 1, 6): DayType.HOLIDAY,
    }

    # Can't place rest on holidays
    assert not can_place_rest_at(date(2025, 1, 5), holiday_map)


def test_can_place_rest_at_merge_prevention():
    """Rest can't merge with following HOLIDAY"""
    holiday_map = {
        date(2025, 1, 7): DayType.HOLIDAY,  # Wed
    }

    # Can't place rest Mon-Tue because Wed is HOLIDAY (would create 3-day rest)
    assert not can_place_rest_at(date(2025, 1, 5), holiday_map)

    # Working holiday doesn't block (it's a work day)
    holiday_map = {
        date(2025, 1, 7): DayType.WORKING_HOLIDAY,
    }
    assert can_place_rest_at(date(2025, 1, 5), holiday_map)


def test_is_saturday():
    """Saturday detection"""
    assert is_saturday(date(2025, 1, 4))  # Saturday
    assert not is_saturday(date(2025, 1, 5))  # Sunday


def test_max_work_days_remaining():
    """Calculate remaining work days in block"""
    # No work days placed yet
    state = ScheduleState(
        current_date=date(2025, 1, 1),
        days_so_far=(),
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )
    assert max_work_days_remaining(state) == 7

    # 3 work days already placed
    work_days = (
        Day(date(2025, 1, 1), DayType.WORK),
        Day(date(2025, 1, 2), DayType.WORK),
        Day(date(2025, 1, 3), DayType.WORK),
    )
    state = ScheduleState(
        current_date=date(2025, 1, 4),
        days_so_far=work_days,
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )
    assert max_work_days_remaining(state) == 4


def test_current_work_streak():
    """Count consecutive work days at end"""
    days = (
        Day(date(2025, 1, 1), DayType.REST),
        Day(date(2025, 1, 2), DayType.REST),
        Day(date(2025, 1, 3), DayType.ORDERING),
        Day(date(2025, 1, 4), DayType.WORK),
        Day(date(2025, 1, 5), DayType.WORK),
    )

    state = ScheduleState(
        current_date=date(2025, 1, 6),
        days_so_far=days,
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )

    assert state.current_work_streak == 3  # ORDERING + WORK + WORK
