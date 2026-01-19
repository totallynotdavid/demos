from datetime import timedelta

from calendario.core.domain import Calendar
from calendario.core.types import DayType
from calendario.core.utils import get_all_iso_weeks, get_iso_week_dates


def validate_work_block_lengths(calendar: Calendar) -> list[str]:
    errors = []
    for block in calendar.get_work_blocks():
        length = len(block)
        if length < 3:
            errors.append(
                f"Work block starting {block[0].date} is {length} days (min: 3)"
            )
        elif length > 7:
            errors.append(
                f"Work block starting {block[0].date} is {length} days (max: 7)"
            )
    return errors


def validate_rest_blocks(calendar: Calendar) -> list[str]:
    errors = []
    for block in calendar.get_rest_blocks():
        length = len(block)
        if length != 2:
            errors.append(
                f"Rest block starting {block[0].date} is {length} days (must be 2)"
            )
    return errors


def validate_no_sunday_monday_rest(calendar: Calendar) -> list[str]:
    errors = []
    days = calendar.days

    for i in range(len(days) - 1):
        if (
            days[i].day_type == DayType.REST
            and days[i + 1].day_type == DayType.REST
            and days[i].date.weekday() == 6
            and days[i + 1].date.weekday() == 0
        ):
            errors.append(f"Invalid Sunday-Monday rest block at {days[i].date}")

    return errors


def validate_ordering_placement(calendar: Calendar) -> list[str]:
    errors = []
    days = calendar.days

    for i in range(1, len(days)):
        current = days[i]
        previous = days[i - 1]

        if (
            previous.is_rest_day
            and current.is_work_day
            and current.day_type != DayType.ORDERING
        ):
            errors.append(
                f"Expected ORDERING at {current.date} after rest, got {current.day_type.value}"
            )

    return errors


def validate_one_rest_per_week(calendar: Calendar) -> list[str]:
    errors = []
    week_numbers = get_all_iso_weeks(calendar.year)

    for week_num in week_numbers:
        week_start, _week_end = get_iso_week_dates(calendar.year, week_num)
        week_dates = [week_start + timedelta(days=i) for i in range(7)]
        week_dates = [d for d in week_dates if d.year == calendar.year]

        rest_blocks = 0
        i = 0
        while i < len(week_dates):
            try:
                day = calendar.get_day(week_dates[i])
                if day.day_type == DayType.REST:
                    if i + 1 < len(week_dates):
                        next_day = calendar.get_day(week_dates[i + 1])
                        if next_day.day_type == DayType.REST:
                            rest_blocks += 1
                            i += 2
                            continue
                    i += 1
                else:
                    i += 1
            except KeyError:
                i += 1

        if rest_blocks != 1:
            errors.append(f"Week {week_num} has {rest_blocks} rest blocks (must be 1)")

    return errors


def validate_monthly_weekends(calendar: Calendar) -> list[str]:
    errors = []

    for month in range(1, 13):
        month_days = calendar.get_month_days(month)
        free_weekends = 0

        i = 0
        while i < len(month_days) - 1:
            day1 = month_days[i]
            day2 = month_days[i + 1]

            if (
                day1.date.weekday() == 5
                and day2.date.weekday() == 6
                and day1.day_type == DayType.REST
                and day2.day_type == DayType.REST
            ):
                free_weekends += 1

            i += 1

        if free_weekends != 1:
            errors.append(
                f"Month {month} has {free_weekends} free weekends (must be 1)"
            )

    return errors


def validate_holiday_pairing(calendar: Calendar) -> list[str]:
    errors = []
    days = calendar.days

    holiday_days = [
        d for d in days if d.day_type in (DayType.HOLIDAY, DayType.WORKING_HOLIDAY)
    ]

    i = 0
    while i < len(holiday_days):
        current = holiday_days[i]

        if i + 1 < len(holiday_days):
            next_holiday = holiday_days[i + 1]
            days_diff = (next_holiday.date - current.date).days

            if days_diff == 1:
                if current.day_type != DayType.WORKING_HOLIDAY:
                    errors.append(
                        f"First holiday in pair at {current.date} should be WORKING_HOLIDAY"
                    )

                if next_holiday.day_type != DayType.HOLIDAY:
                    errors.append(
                        f"Second holiday in pair at {next_holiday.date} should be HOLIDAY"
                    )

                i += 2
            else:
                if current.day_type != DayType.HOLIDAY:
                    errors.append(
                        f"Isolated holiday at {current.date} should be HOLIDAY"
                    )
                i += 1
        else:
            if current.day_type != DayType.HOLIDAY:
                errors.append(f"Isolated holiday at {current.date} should be HOLIDAY")
            i += 1

    return errors


ALL_RULES = [
    validate_holiday_pairing,
    validate_rest_blocks,
    validate_work_block_lengths,
    validate_no_sunday_monday_rest,
    validate_ordering_placement,
    validate_one_rest_per_week,
    validate_monthly_weekends,
]
