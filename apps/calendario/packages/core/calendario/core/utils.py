import calendar

from datetime import date, timedelta


def all_dates_in_year(year: int) -> list[date]:
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def days_in_year(year: int) -> int:
    return 366 if calendar.isleap(year) else 365


def get_iso_week_dates(year: int, week_number: int) -> tuple[date, date]:
    jan_4 = date(year, 1, 4)
    week_start = (
        jan_4 - timedelta(days=jan_4.weekday()) + timedelta(weeks=week_number - 1)
    )
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def get_all_iso_weeks(year: int) -> list[int]:
    jan_1 = date(year, 1, 1)
    dec_31 = date(year, 12, 31)

    start_week = jan_1.isocalendar()[1]
    end_week = dec_31.isocalendar()[1]

    if start_week > 50:
        start_week = 1

    if end_week == 1:
        dec_28 = date(year, 12, 28)
        end_week = dec_28.isocalendar()[1]

    return list(range(start_week, end_week + 1))
