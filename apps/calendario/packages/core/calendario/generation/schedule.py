from datetime import date, timedelta
from random import Random

from calendario.domain import Day, DayType
from calendario.generation.constraints import (
    ScheduleState,
    can_place_rest_at,
)
from calendario.generation.decisions import decide_work_block_length


def build_schedule(
    year: int, holiday_map: dict[date, DayType], rng: Random
) -> tuple[Day, ...]:
    """
    Build a complete year schedule.

    Algorithm:
    1. Start at January 1
    2. While still in the year:
       a. If current date is a holiday → place it and continue
       b. Otherwise → place work block, then rest block
    3. Return all placed days

    Args:
        year: Target year
        holiday_map: Map of holiday dates to types
        rng: Random number generator for work length selection

    Returns:
        Tuple of all days in the year

    Raises:
        ValueError: If algorithm encounters impossible constraint (bug)
    """
    state = ScheduleState(
        current_date=date(year, 1, 1),
        days_so_far=(),
        weeks_with_rest=frozenset(),
        months_with_weekend=frozenset(),
    )

    while state.current_date.year == year:
        # Handle holidays first
        if state.current_date in holiday_map:
            state = place_holiday(state, holiday_map)
            continue

        # Place work block
        state = place_work_block(state, holiday_map, rng)

        # Place rest block (if still in year)
        if state.current_date.year == year:
            state = place_rest_block(state, holiday_map)

    return state.days_so_far


def place_holiday(
    state: ScheduleState, holiday_map: dict[date, DayType]
) -> ScheduleState:
    """
    Place a single holiday day and advance state.

    Args:
        state: Current state
        holiday_map: Holiday mapping

    Returns:
        New state with holiday placed
    """
    day = Day(state.current_date, holiday_map[state.current_date])

    return ScheduleState(
        current_date=state.current_date + timedelta(days=1),
        days_so_far=(*state.days_so_far, day),
        weeks_with_rest=state.weeks_with_rest,
        months_with_weekend=state.months_with_weekend,
    )


def place_work_block(
    state: ScheduleState, holiday_map: dict[date, DayType], rng: Random
) -> ScheduleState:
    """
    Place a work block (3-7 days) and return updated state.

    First work day after rest is ORDERING, others are WORK.
    Skips over holidays (they'll be handled in main loop).

    Args:
        state: Current state
        holiday_map: Holiday mapping
        rng: Random generator

    Returns:
        New state with work block placed
    """
    work_length = decide_work_block_length(state, state.current_date, holiday_map, rng)

    new_days = []
    current = state.current_date
    work_days_placed = 0
    is_first_after_rest = state.last_day and state.last_day.is_rest_day

    while work_days_placed < work_length and current.year == state.current_date.year:
        if current in holiday_map:
            # Skip - will be handled in main loop
            current += timedelta(days=1)
            continue

        # First work day after rest is ORDERING
        if work_days_placed == 0 and is_first_after_rest:
            day_type = DayType.ORDERING
        else:
            day_type = DayType.WORK

        new_days.append(Day(current, day_type))
        current += timedelta(days=1)
        work_days_placed += 1

    return ScheduleState(
        current_date=current,
        days_so_far=state.days_so_far + tuple(new_days),
        weeks_with_rest=state.weeks_with_rest,
        months_with_weekend=state.months_with_weekend,
    )


def place_rest_block(
    state: ScheduleState, holiday_map: dict[date, DayType]
) -> ScheduleState:
    """
    Place a 2-day rest block and return updated state.

    If rest starts on Saturday, marks month as having weekend.
    Tracks which week has received rest.

    Args:
        state: Current state
        holiday_map: Holiday mapping

    Returns:
        New state with rest block placed

    Raises:
        ValueError: If rest cannot be placed (algorithm bug)
    """
    # This should always succeed if decide_work_block_length is correct
    if not can_place_rest_at(state.current_date, holiday_map):
        msg = (
            f"Cannot place rest at {state.current_date} - algorithm error! "
            f"This should never happen."
        )
        raise ValueError(msg)

    day1 = Day(state.current_date, DayType.REST)
    day2_date = state.current_date + timedelta(days=1)

    new_days = [day1]

    # Only add second rest day if still in year
    if day2_date.year == state.current_date.year:
        new_days.append(Day(day2_date, DayType.REST))

    # Track that this week has rest
    week_num = state.current_date.isocalendar()[1]
    new_weeks_with_rest = state.weeks_with_rest | {week_num}

    # Track weekend if this is Saturday-Sunday
    new_months_with_weekend = state.months_with_weekend
    if state.current_date.weekday() == 5:  # Saturday
        new_months_with_weekend = state.months_with_weekend | {state.current_date.month}

    return ScheduleState(
        current_date=day2_date + timedelta(days=1),
        days_so_far=state.days_so_far + tuple(new_days),
        weeks_with_rest=new_weeks_with_rest,
        months_with_weekend=new_months_with_weekend,
    )
