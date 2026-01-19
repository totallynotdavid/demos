import calendar

from dataclasses import dataclass
from datetime import date, timedelta
from random import Random

from calendario.core.intervals import Interval
from calendario.core.types import DayType
from calendario.core.utils import get_all_iso_weeks, get_iso_week_dates


@dataclass(frozen=True)
class CalendarPlan:
    year: int
    holidays: dict[date, DayType]
    rest_intervals: list[Interval]


def create_plan(year: int, holidays: dict[date, DayType], rng: Random) -> CalendarPlan:
    monthly_weekends = select_monthly_weekends(year, holidays, rng)

    [Interval(d, d) for d in holidays]
    weekend_intervals = [
        Interval(sat, sat + timedelta(days=1)) for sat in monthly_weekends
    ]

    all_rest = weekend_intervals.copy()
    occupied = set(holidays.keys())
    for interval in weekend_intervals:
        occupied.update(interval.dates())

    weekday_rest = insert_weekday_rest_blocks(year, occupied, holidays)
    all_rest.extend(weekday_rest)

    for interval in weekday_rest:
        occupied.update(interval.dates())

    week_rest = ensure_one_rest_per_week(year, occupied, holidays, all_rest)
    all_rest.extend(week_rest)

    return CalendarPlan(year, holidays, sorted(all_rest, key=lambda i: i.start))


def select_monthly_weekends(
    year: int, holidays: dict[date, DayType], rng: Random
) -> list[date]:
    weekends = []

    for month in range(1, 13):
        candidates = _find_valid_weekend_saturdays(year, month, holidays)
        if not candidates:
            msg = f"No valid weekend found for {year}-{month:02d}"
            raise ValueError(msg)
        weekends.append(rng.choice(candidates))

    return weekends


def _find_valid_weekend_saturdays(
    year: int, month: int, holidays: dict[date, DayType]
) -> list[date]:
    candidates = []
    _, last_day = calendar.monthrange(year, month)

    for day in range(1, last_day + 1):
        current = date(year, month, day)
        if current.weekday() != 5:
            continue

        saturday = current
        sunday = saturday + timedelta(days=1)
        friday = saturday - timedelta(days=1)
        monday = sunday + timedelta(days=1)

        if saturday in holidays or sunday in holidays:
            continue

        if friday in holidays or monday in holidays:
            continue

        candidates.append(saturday)

    return candidates


def insert_weekday_rest_blocks(
    year: int, occupied: set[date], holidays: dict[date, DayType]
) -> list[Interval]:
    weekday_rest = []
    all_dates = [
        date(year, 1, 1) + timedelta(days=i)
        for i in range(366 if calendar.isleap(year) else 365)
    ]

    work_gap_start = None
    work_gap_length = 0

    for d in all_dates:
        if d in occupied:
            if work_gap_length > 7 and work_gap_start is not None:
                rest_interval = _place_rest_in_gap(
                    work_gap_start, work_gap_length, occupied, holidays
                )
                if rest_interval:
                    weekday_rest.append(rest_interval)
                    occupied.update(rest_interval.dates())
            work_gap_start = None
            work_gap_length = 0
        else:
            if work_gap_start is None:
                work_gap_start = d
            work_gap_length += 1

    if work_gap_length > 7 and work_gap_start is not None:
        rest_interval = _place_rest_in_gap(
            work_gap_start, work_gap_length, occupied, holidays
        )
        if rest_interval:
            weekday_rest.append(rest_interval)

    return weekday_rest


def _place_rest_in_gap(
    gap_start: date, gap_length: int, occupied: set[date], holidays: dict[date, DayType]
) -> Interval | None:
    mid_point = gap_start + timedelta(days=gap_length // 2)

    for offset in range(-2, 3):
        candidate = mid_point + timedelta(days=offset)
        if _is_valid_weekday_rest_position(candidate, occupied):
            return Interval(candidate, candidate + timedelta(days=1))

    return None


def _is_valid_weekday_rest_position(start: date, occupied: set[date]) -> bool:
    if start.weekday() == 6:
        return False

    end = start + timedelta(days=1)
    if start in occupied or end in occupied:
        return False

    before = start - timedelta(days=1)
    after = end + timedelta(days=1)

    return not (before in occupied or after in occupied)


def ensure_one_rest_per_week(
    year: int,
    occupied: set[date],
    holidays: dict[date, DayType],
    existing_rest: list[Interval],
) -> list[Interval]:
    additional_rest = []
    week_numbers = get_all_iso_weeks(year)

    for week_num in week_numbers:
        week_start, _week_end = get_iso_week_dates(year, week_num)
        week_dates = [week_start + timedelta(days=i) for i in range(7)]
        week_dates = [d for d in week_dates if d.year == year]

        has_rest = any(
            any(d in interval.dates() for d in week_dates) for interval in existing_rest
        )

        if not has_rest:
            rest_interval = _find_weekday_rest_for_week(week_dates, occupied, holidays)
            if rest_interval:
                additional_rest.append(rest_interval)
                occupied.update(rest_interval.dates())
            else:
                msg = f"Cannot place rest block in week {week_num}"
                raise ValueError(msg)

    return additional_rest


def _find_weekday_rest_for_week(
    week_dates: list[date], occupied: set[date], holidays: dict[date, DayType]
) -> Interval | None:
    for i in range(len(week_dates) - 1):
        start = week_dates[i]
        end = week_dates[i + 1]

        if start.weekday() == 6:
            continue

        if start in occupied or end in occupied:
            continue

        before = start - timedelta(days=1)
        after = end + timedelta(days=1)

        if before in occupied or after in occupied:
            continue

        return Interval(start, end)

    return None
