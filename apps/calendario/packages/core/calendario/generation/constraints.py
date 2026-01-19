from datetime import date, timedelta
from typing import NamedTuple

from calendario.domain import DayType


class ScheduleState(NamedTuple):
    """Immutable state during calendar generation"""

    current_date: date
    days_so_far: tuple
    weeks_with_rest: frozenset[int]
    months_with_weekend: frozenset[int]

    @property
    def last_day(self):
        """Get the last placed day, if any"""
        return self.days_so_far[-1] if self.days_so_far else None

    @property
    def current_work_streak(self) -> int:
        """Count consecutive work days at end of days_so_far"""
        count = 0
        for day in reversed(self.days_so_far):
            if day.is_work_day:
                count += 1
            else:
                break
        return count


def needs_rest_this_week(state: ScheduleState, current_date: date) -> bool:
    """Check if current week still needs a rest block"""
    week_num = current_date.isocalendar()[1]
    return week_num not in state.weeks_with_rest


def needs_weekend_this_month(state: ScheduleState, current_date: date) -> bool:
    """Check if current month still needs a weekend (Sat-Sun rest)"""
    return current_date.month not in state.months_with_weekend


def would_create_sunday_monday_rest(start_date: date) -> bool:
    """Check if starting rest on start_date would create Sun-Mon rest block"""
    return start_date.weekday() == 6


def can_place_rest_at(start_date: date, holiday_map: dict[date, DayType]) -> bool:
    """
    Check if we can place a 2-day rest block starting at start_date.

    Requirements:
    - Not starting on Sunday (would create Sun-Mon rest)
    - Not on holidays (don't overwrite)
    - Won't merge with following holiday (would create 3+ day rest)

    Args:
        start_date: Proposed start of rest block
        holiday_map: Map of holidays

    Returns:
        True if rest can be placed here
    """
    if would_create_sunday_monday_rest(start_date):
        return False

    end_date = start_date + timedelta(days=1)

    # Can't overwrite holidays
    if start_date in holiday_map or end_date in holiday_map:
        return False

    # Can't merge with next day if it's a HOLIDAY (creates 3+ day rest)
    next_day = end_date + timedelta(days=1)
    return not (next_day in holiday_map and holiday_map[next_day] == DayType.HOLIDAY)


def is_saturday(d: date) -> bool:
    """Check if date is Saturday"""
    return d.weekday() == 5


def max_work_days_remaining(state: ScheduleState) -> int:
    """
    Maximum work days we can place before hitting the 7-day work block limit.

    Accounts for current work streak.
    """
    return 7 - state.current_work_streak
