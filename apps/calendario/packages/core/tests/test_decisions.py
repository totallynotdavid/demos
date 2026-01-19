"""
Tests for work block length decision functions.
"""

from datetime import date

from calendario.domain import DayType
from calendario.generation.constraints import ScheduleState
from calendario.generation.decisions import (
    is_valid_work_length,
    lands_on_friday,
    simulate_work_placement,
)


def test_simulate_work_placement_no_holidays():
    """Simulate work placement without holidays"""
    start = date(2025, 1, 5)  # Monday
    holiday_map = {}

    # 3 work days: Mon, Tue, Wed → rest starts Thu
    result = simulate_work_placement(start, 3, holiday_map)
    assert result == date(2025, 1, 8)  # Thursday
    assert result.weekday() == 3


def test_simulate_work_placement_with_holidays():
    """Simulate work placement skipping holidays"""
    start = date(2025, 1, 5)  # Monday
    holiday_map = {
        date(2025, 1, 6): DayType.HOLIDAY,  # Tuesday is holiday
    }

    # 3 work days: Mon, [Tue holiday], Wed, Thu → rest starts Fri
    result = simulate_work_placement(start, 3, holiday_map)
    assert result == date(2025, 1, 9)  # Friday
    assert result.weekday() == 4


def test_lands_on_friday():
    """Check if work length lands on Friday"""
    start = date(2025, 1, 5)  # Monday
    holiday_map = {}

    # 4 work days from Monday lands on Friday
    assert lands_on_friday(start, 4, holiday_map)

    # 3 work days from Monday lands on Thursday
    assert not lands_on_friday(start, 3, holiday_map)


def test_is_valid_work_length_basic():
    """Basic work length validation"""
    state = ScheduleState(
        current_date=date(2025, 1, 5),
        days_so_far=(),
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )

    start = date(2025, 1, 5)  # Monday
    holiday_map = {}

    # Length 3-7 should all be valid initially
    assert is_valid_work_length(state, start, 3, holiday_map)
    assert is_valid_work_length(state, start, 4, holiday_map)
    assert is_valid_work_length(state, start, 5, holiday_map)


def test_is_valid_work_length_respects_max():
    """Work length respects 7-day block limit"""
    # Already have 5 work days
    from calendario.domain import Day

    work_days = tuple(Day(date(2025, 1, 1), DayType.WORK) for i in range(5))

    state = ScheduleState(
        current_date=date(2025, 1, 6),
        days_so_far=work_days,
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )

    start = date(2025, 1, 6)
    holiday_map = {}

    # Can only add 2 more work days (5 + 2 = 7)
    assert not is_valid_work_length(state, start, 3, holiday_map)


def test_is_valid_work_length_sunday_landing():
    """Work length that lands on Sunday is invalid (creates Sun-Mon rest)"""
    state = ScheduleState(
        current_date=date(2025, 1, 5),  # Monday
        days_so_far=(),
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )

    start = date(2025, 1, 5)  # Monday
    holiday_map = {}

    # 2 work days: Mon, Tue → rest would start Wed (valid)
    # But if we calculate 6 days: Mon-Sat → rest would start Sun (invalid)
    # Actually, with current week needs rest, we need to check this

    # The constraint is enforced via can_place_rest_at in is_valid_work_length
    result = is_valid_work_length(state, start, 6, holiday_map)
    # 6 days from Monday = rest starts Sunday (invalid due to Sun-Mon rest rule)
    assert not result
