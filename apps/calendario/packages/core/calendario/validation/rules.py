from datetime import timedelta

from calendario.domain import Calendar, DayType


def validate_holiday_pairing(calendar: Calendar) -> list[str]:
    """
    REQ1: Validate holiday pairing rules.

    - Isolated holidays must be HOLIDAY
    - Consecutive pairs: first is WORKING_HOLIDAY, second is HOLIDAY
    """
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
                # Consecutive pair
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
                # Isolated
                if current.day_type != DayType.HOLIDAY:
                    errors.append(
                        f"Isolated holiday at {current.date} should be HOLIDAY"
                    )
                i += 1
        else:
            # Last holiday, must be isolated
            if current.day_type != DayType.HOLIDAY:
                errors.append(f"Isolated holiday at {current.date} should be HOLIDAY")
            i += 1

    return errors


def validate_rest_blocks(calendar: Calendar) -> list[str]:
    """REQ2: All REST blocks must be exactly 2 days"""
    return [
        f"Rest block at {block[0].date} is {len(block)} days (must be 2)"
        for block in calendar.get_rest_blocks()
        if len(block) != 2
    ]


def validate_ordering_placement(calendar: Calendar) -> list[str]:
    """REQ3: First work day after rest must be ORDERING"""
    errors = []
    days = calendar.days

    for i in range(1, len(days)):
        previous = days[i - 1]
        current = days[i]

        if (
            previous.is_rest_day
            and current.is_work_day
            and current.day_type != DayType.ORDERING
        ):
            errors.append(
                f"Expected ORDERING at {current.date} after rest, "
                f"got {current.day_type.value}"
            )

    return errors


def validate_work_block_lengths(calendar: Calendar) -> list[str]:
    """REQ4: Work blocks must be 3-7 days"""
    errors = []

    for block in calendar.get_work_blocks():
        length = len(block)
        if length < 3:
            errors.append(f"Work block at {block[0].date} is {length} days (min: 3)")
        elif length > 7:
            errors.append(f"Work block at {block[0].date} is {length} days (max: 7)")

    return errors


def validate_monthly_weekends(calendar: Calendar) -> list[str]:
    """REQ5: Each month must have exactly one Saturday-Sunday REST pair"""
    errors = []

    for month in range(1, 13):
        month_days = calendar.get_month_days(month)
        free_weekends = 0

        for i in range(len(month_days) - 1):
            day1 = month_days[i]
            day2 = month_days[i + 1]

            if (
                day1.date.weekday() == 5  # Saturday
                and day2.date.weekday() == 6  # Sunday
                and day1.day_type == DayType.REST
                and day2.day_type == DayType.REST
            ):
                free_weekends += 1

        if free_weekends != 1:
            errors.append(
                f"Month {month} has {free_weekends} free weekends (must be 1)"
            )

    return errors


def validate_weekly_rest(calendar: Calendar) -> list[str]:
    """REQ6: Each ISO week must have exactly one rest block"""
    errors = []

    week_numbers = _get_all_iso_weeks(calendar.year)

    for week_num in week_numbers:
        week_dates = _get_week_dates(calendar.year, week_num)

        # Count rest blocks in this week
        rest_blocks = 0
        i = 0
        while i < len(week_dates):
            try:
                day = calendar.get_day(week_dates[i])
                if day.day_type == DayType.REST:
                    # Start of rest block
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


def validate_no_sunday_monday_rest(calendar: Calendar) -> list[str]:
    """REQ7: No Sunday-Monday REST blocks allowed"""
    errors = []
    days = calendar.days

    for i in range(len(days) - 1):
        if (
            days[i].day_type == DayType.REST
            and days[i + 1].day_type == DayType.REST
            and days[i].date.weekday() == 6  # Sunday
            and days[i + 1].date.weekday() == 0  # Monday
        ):
            errors.append(f"Invalid Sunday-Monday rest block at {days[i].date}")

    return errors


def _get_all_iso_weeks(year: int) -> list[int]:
    """Get all ISO week numbers for the year"""
    from datetime import date

    jan_1 = date(year, 1, 1)
    dec_31 = date(year, 12, 31)

    start_week = jan_1.isocalendar()[1]
    end_week = dec_31.isocalendar()[1]

    # Handle year boundary cases
    if start_week > 50:
        start_week = 1

    if end_week == 1:
        dec_28 = date(year, 12, 28)
        end_week = dec_28.isocalendar()[1]

    return list(range(start_week, end_week + 1))


def _get_week_dates(year: int, week_number: int) -> list:
    """Get all dates in an ISO week that fall within the year"""
    from datetime import date

    jan_4 = date(year, 1, 4)
    week_start = (
        jan_4 - timedelta(days=jan_4.weekday()) + timedelta(weeks=week_number - 1)
    )

    week_dates = [week_start + timedelta(days=i) for i in range(7)]
    return [d for d in week_dates if d.year == year]
