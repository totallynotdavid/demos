from collections.abc import Callable

from calendario.domain.models import Calendar
from calendario.domain.types import ConstraintViolation, DayType


def check_rest_blocks_are_pairs(calendar: Calendar) -> list[ConstraintViolation]:
    """
    All REST days must come in consecutive pairs.

    Validates that every REST day is part of a 2-day block.
    """
    violations = []
    days = calendar.all_days

    i = 0
    while i < len(days):
        if days[i].day_type == DayType.REST:
            # Check if next day is also REST
            if i + 1 >= len(days) or days[i + 1].day_type != DayType.REST:
                violations.append(
                    ConstraintViolation(
                        constraint_name="rest_blocks_are_pairs",
                        message=f"REST day at {days[i].date} is not part of a pair",
                        context={"date": str(days[i].date)},
                    )
                )
                i += 1
            else:
                # Check if it's exactly 2 days (not 3+)
                if i + 2 < len(days) and days[i + 2].day_type == DayType.REST:
                    violations.append(
                        ConstraintViolation(
                            constraint_name="rest_blocks_are_pairs",
                            message=f"REST block starting at {days[i].date} is longer than 2 days",
                            context={"date": str(days[i].date)},
                        )
                    )
                i += 2  # Skip the pair
        else:
            i += 1

    return violations


def check_no_sunday_monday_rest(calendar: Calendar) -> list[ConstraintViolation]:
    """No REST block can span Sunday-Monday."""
    violations = []
    days = calendar.all_days

    for i in range(len(days) - 1):
        day1, day2 = days[i], days[i + 1]

        if (
            day1.day_type == DayType.REST
            and day2.day_type == DayType.REST
            and day1.date.weekday() == 6  # Sunday
            and day2.date.weekday() == 0
        ):  # Monday
            violations.append(
                ConstraintViolation(
                    constraint_name="no_sunday_monday_rest",
                    message=f"Invalid Sunday-Monday REST block at {day1.date}",
                    context={"sunday": str(day1.date), "monday": str(day2.date)},
                )
            )

    return violations


def check_one_rest_per_week(calendar: Calendar) -> list[ConstraintViolation]:
    """Each week must have exactly one 2-day rest block."""
    violations = []

    for week in calendar.weeks:
        # Count REST blocks (not individual REST days)
        rest_blocks = 0
        i = 0
        while i < len(week.days):
            if week.days[i].day_type == DayType.REST:
                rest_blocks += 1
                i += 2  # Skip the pair
            else:
                i += 1

        if rest_blocks != 1:
            violations.append(
                ConstraintViolation(
                    constraint_name="one_rest_per_week",
                    message=f"Week {week.week_number} has {rest_blocks} REST blocks, expected exactly 1",
                    context={"week": week.week_number, "rest_blocks": rest_blocks},
                )
            )

    return violations


def check_ordering_after_rest(calendar: Calendar) -> list[ConstraintViolation]:
    """First work day after rest must be ORDERING."""
    violations = []
    days = calendar.all_days

    for i in range(len(days) - 1):
        current_day = days[i]
        next_day = days[i + 1]

        # If current day is REST and next day is a work day
        if (
            current_day.day_type == DayType.REST
            and next_day.is_work_day
            and next_day.day_type != DayType.ORDERING
        ):
            violations.append(
                ConstraintViolation(
                    constraint_name="ordering_after_rest",
                    message=f"Expected ORDERING at {next_day.date} after REST, got {next_day.day_type.value if next_day.day_type else 'None'}",
                    context={
                        "date": str(next_day.date),
                        "actual_type": next_day.day_type.value
                        if next_day.day_type
                        else "None",
                    },
                )
            )

    return violations


def check_max_one_weekend_per_month(calendar: Calendar) -> list[ConstraintViolation]:
    """
    Each month has at most 1 Sat-Sun REST block.

    Note: Sat-Sun HOLIDAY blocks don't count toward this limit.
    """
    violations = []

    for month in range(1, 13):
        month_days = calendar.get_month_days(month)
        free_weekends = 0

        i = 0
        while i < len(month_days) - 1:
            day1 = month_days[i]
            day2 = month_days[i + 1]

            # Check if it's a Saturday-Sunday REST block
            if (
                day1.date.weekday() == 5  # Saturday
                and day2.date.weekday() == 6  # Sunday
                and day1.day_type == DayType.REST
                and day2.day_type == DayType.REST
            ):
                free_weekends += 1

            i += 1

        if free_weekends > 1:
            violations.append(
                ConstraintViolation(
                    constraint_name="max_one_weekend_per_month",
                    message=f"Month {month} has {free_weekends} free weekends, expected at most 1",
                    context={"month": month, "free_weekends": free_weekends},
                )
            )

    return violations


def check_holiday_pairing(calendar: Calendar) -> list[ConstraintViolation]:
    """
    Validates holiday pairing rules:
    - Isolated holidays must be HOLIDAY type
    - Paired holidays: first is WORKING_HOLIDAY, second is HOLIDAY
    """
    violations = []
    days = calendar.all_days

    # Find all holidays
    holiday_days = [
        d for d in days if d.day_type in (DayType.HOLIDAY, DayType.WORKING_HOLIDAY)
    ]

    i = 0
    while i < len(holiday_days):
        current = holiday_days[i]

        # Check if next holiday is consecutive
        if i + 1 < len(holiday_days):
            next_holiday = holiday_days[i + 1]
            days_diff = (next_holiday.date - current.date).days

            if days_diff == 1:
                # Paired holidays
                if current.day_type != DayType.WORKING_HOLIDAY:
                    violations.append(
                        ConstraintViolation(
                            constraint_name="holiday_pairing",
                            message=f"First holiday in pair at {current.date} should be WORKING_HOLIDAY",
                            context={
                                "date": str(current.date),
                                "actual": current.day_type.value
                                if current.day_type
                                else "None",
                            },
                        )
                    )

                if next_holiday.day_type != DayType.HOLIDAY:
                    violations.append(
                        ConstraintViolation(
                            constraint_name="holiday_pairing",
                            message=f"Second holiday in pair at {next_holiday.date} should be HOLIDAY",
                            context={
                                "date": str(next_holiday.date),
                                "actual": next_holiday.day_type.value
                                if next_holiday.day_type
                                else "None",
                            },
                        )
                    )

                i += 2
            else:
                # Isolated holiday
                if current.day_type != DayType.HOLIDAY:
                    violations.append(
                        ConstraintViolation(
                            constraint_name="holiday_pairing",
                            message=f"Isolated holiday at {current.date} should be HOLIDAY type",
                            context={
                                "date": str(current.date),
                                "actual": current.day_type.value
                                if current.day_type
                                else "None",
                            },
                        )
                    )
                i += 1
        else:
            # Last holiday, must be isolated
            if current.day_type != DayType.HOLIDAY:
                violations.append(
                    ConstraintViolation(
                        constraint_name="holiday_pairing",
                        message=f"Isolated holiday at {current.date} should be HOLIDAY type",
                        context={
                            "date": str(current.date),
                            "actual": current.day_type.value
                            if current.day_type
                            else "None",
                        },
                    )
                )
            i += 1

    return violations


ALL_CONSTRAINTS: list[Callable[[Calendar], list[ConstraintViolation]]] = [
    check_rest_blocks_are_pairs,
    check_no_sunday_monday_rest,
    check_one_rest_per_week,
    check_ordering_after_rest,
    check_max_one_weekend_per_month,
    check_holiday_pairing,
]
