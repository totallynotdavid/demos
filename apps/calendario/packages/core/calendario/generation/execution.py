from calendario.core.domain import Calendar, Day
from calendario.core.types import DayType
from calendario.core.utils import all_dates_in_year
from calendario.generation.planning import CalendarPlan


def execute_plan(plan: CalendarPlan) -> Calendar:
    all_dates = all_dates_in_year(plan.year)
    days = []

    rest_dates = set()
    for interval in plan.rest_intervals:
        rest_dates.update(interval.dates())

    for i, current_date in enumerate(all_dates):
        if current_date in plan.holidays:
            day_type = plan.holidays[current_date]
        elif current_date in rest_dates:
            day_type = DayType.REST
        else:
            prev_date = all_dates[i - 1] if i > 0 else None
            prev_type = None

            if prev_date:
                if prev_date in plan.holidays:
                    prev_type = plan.holidays[prev_date]
                elif prev_date in rest_dates:
                    prev_type = DayType.REST
                else:
                    prev_type = DayType.WORK

            if prev_type in (DayType.REST, DayType.HOLIDAY):
                day_type = DayType.ORDERING
            else:
                day_type = DayType.WORK

        days.append(Day(current_date, day_type))

    return Calendar(plan.year, tuple(days))
