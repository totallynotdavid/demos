from dataclasses import dataclass, field
from datetime import date
from functools import cached_property

from calendario.domain.types import DayType


@dataclass(frozen=True)
class Day:
    """Represents a single calendar day."""

    date: date
    day_type: DayType | None

    def __post_init__(self) -> None:
        if self.date is None:
            msg = "Date cannot be None"
            raise ValueError(msg)

    @cached_property
    def week_number(self) -> int:
        """ISO week number."""
        return self.date.isocalendar()[1]

    @cached_property
    def year(self) -> int:
        """Year of the date."""
        return self.date.year

    @cached_property
    def is_weekend(self) -> bool:
        """True if Saturday or Sunday."""
        return self.date.weekday() in (5, 6)

    @cached_property
    def is_work_day(self) -> bool:
        """True if this is a work day type."""
        return self.day_type in (
            DayType.WORK,
            DayType.ORDERING,
            DayType.WORKING_HOLIDAY,
        )

    @cached_property
    def is_rest_day(self) -> bool:
        """True if this is a rest day type."""
        return self.day_type in (DayType.REST, DayType.HOLIDAY)

    def with_type(self, day_type: DayType) -> "Day":
        """Returns new Day with updated type (immutable update)."""
        return Day(date=self.date, day_type=day_type)


@dataclass(frozen=True)
class Week:
    """Represents a week with 7 days."""

    week_number: int
    year: int
    days: tuple[Day, ...]

    def __post_init__(self) -> None:
        if len(self.days) != 7:
            msg = f"Week must have 7 days, got {len(self.days)}"
            raise ValueError(msg)

        if not all(d.week_number == self.week_number for d in self.days):
            msg = "All days must be from same week"
            raise ValueError(msg)

    def get_day(self, weekday: int) -> Day:
        """Get day by weekday (0=Monday, 6=Sunday)."""
        if not 0 <= weekday <= 6:
            msg = f"Weekday must be 0-6, got {weekday}"
            raise ValueError(msg)
        return self.days[weekday]

    @cached_property
    def saturday_sunday(self) -> tuple[Day, Day]:
        """Returns Saturday and Sunday of this week."""
        return (self.days[5], self.days[6])

    @cached_property
    def ends_with_rest(self) -> bool:
        """True if week ends with a rest day."""
        return self.days[-1].is_rest_day


@dataclass(frozen=True)
class Calendar:
    """Represents a full year calendar."""

    year: int
    weeks: tuple[Week, ...]
    _days_index: dict[date, Day] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        if not self.weeks:
            msg = "Calendar must have at least one week"
            raise ValueError(msg)

        if not all(w.year == self.year for w in self.weeks):
            msg = "All weeks must be from same year"
            raise ValueError(msg)

        # Build fast lookup index
        days_index: dict[date, Day] = {}
        for week in self.weeks:
            for day in week.days:
                days_index[day.date] = day

        object.__setattr__(self, "_days_index", days_index)

    def get_day(self, date_val: date) -> Day:
        """Get day by date."""
        return self._days_index[date_val]

    def get_week(self, week_number: int) -> Week:
        """Get week by ISO week number."""
        for week in self.weeks:
            if week.week_number == week_number:
                return week
        msg = f"Week {week_number} not found in calendar"
        raise KeyError(msg)

    def get_month_days(self, month: int) -> tuple[Day, ...]:
        """Get all days in a specific month."""
        if not 1 <= month <= 12:
            msg = f"Month must be 1-12, got {month}"
            raise ValueError(msg)

        return tuple(
            day for day in self._days_index.values() if day.date.month == month
        )

    @cached_property
    def all_days(self) -> tuple[Day, ...]:
        """All days in calendar, sorted by date."""
        return tuple(sorted(self._days_index.values(), key=lambda d: d.date))
