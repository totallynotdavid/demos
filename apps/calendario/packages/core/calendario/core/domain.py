from dataclasses import dataclass, field
from datetime import date
from functools import cached_property

from calendario.core.types import DayType


@dataclass(frozen=True)
class Day:
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
        return self._index[d]

    def get_month_days(self, month: int) -> tuple[Day, ...]:
        if not 1 <= month <= 12:
            msg = f"Month must be 1-12, got {month}"
            raise ValueError(msg)
        return tuple(d for d in self.days if d.date.month == month)

    def get_work_blocks(self) -> list[list[Day]]:
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
