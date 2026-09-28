from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from functools import cached_property


class DayType(Enum):
    """Types of days in the calendar"""

    WORK = "work"
    REST = "rest"
    ORDERING = "ordering"
    HOLIDAY = "holiday"
    WORKING_HOLIDAY = "working_holiday"


@dataclass(frozen=True)
class Day:
    """A single day in the calendar with its type"""

    date: date
    day_type: DayType

    @cached_property
    def is_work_day(self) -> bool:
        return self.day_type in (
            DayType.WORK,
            DayType.ORDERING,
            DayType.WORKING_HOLIDAY,
        )

    @cached_property
    def is_rest_day(self) -> bool:
        return self.day_type in (DayType.REST, DayType.HOLIDAY)


@dataclass(frozen=True)
class Calendar:
    """A complete year calendar with all days"""

    year: int
    days: tuple[Day, ...]
    _index: dict[date, Day] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        if not self.days:
            msg = "Calendar must have at least one day"
            raise ValueError(msg)

        if not all(d.date.year == self.year for d in self.days):
            msg = "All days must be from the same year"
            raise ValueError(msg)

        index = {day.date: day for day in self.days}
        object.__setattr__(self, "_index", index)

    def get_day(self, d: date) -> Day:
        """Get a specific day from the calendar"""
        return self._index[d]

    def get_month_days(self, month: int) -> tuple[Day, ...]:
        """Get all days for a specific month"""
        if not 1 <= month <= 12:
            msg = f"Month must be 1-12, got {month}"
            raise ValueError(msg)
        return tuple(d for d in self.days if d.date.month == month)

    def get_work_blocks(self) -> list[list[Day]]:
        """Get all work blocks (consecutive work days)"""
        blocks = []
        current = []
        for day in self.days:
            if day.is_work_day:
                current.append(day)
            elif current:
                blocks.append(current)
                current = []
        if current:
            blocks.append(current)
        return blocks

    def get_rest_blocks(self) -> list[list[Day]]:
        """Get all REST blocks (consecutive REST days, not holidays)"""
        blocks = []
        current = []
        for day in self.days:
            if day.day_type == DayType.REST:
                current.append(day)
            elif current:
                blocks.append(current)
                current = []
        if current:
            blocks.append(current)
        return blocks
