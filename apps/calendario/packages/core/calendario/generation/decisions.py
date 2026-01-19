from datetime import date, timedelta
from random import Random

from calendario.domain import DayType
from calendario.generation.constraints import (
    ScheduleState,
    can_place_rest_at,
    max_work_days_remaining,
    needs_rest_this_week,
    needs_weekend_this_month,
)


def decide_work_block_length(
    state: ScheduleState,
    current_date: date,
    holiday_map: dict[date, DayType],
    rng: Random,
) -> int:
    """
    Decide how many work days to place.

    Strategy:
    1. Find all valid lengths (3-7 days considering constraints)
    2. If month needs weekend, prefer lengths landing on Friday
    3. Otherwise choose randomly from valid options

    Args:
        state: Current schedule state
        current_date: Current date position
        holiday_map: Holiday mapping
        rng: Random number generator

    Returns:
        Work block length (3-7)

    Raises:
        ValueError: If no valid length exists (algorithm bug)
    """
    valid_lengths = []

    max_length = min(7, max_work_days_remaining(state))

    for length in range(3, max_length + 1):
        if is_valid_work_length(state, current_date, length, holiday_map):
            valid_lengths.append(length)

    if not valid_lengths:
        msg = (
            f"No valid work length at {current_date} - algorithm error! "
            f"State: weeks_with_rest={state.weeks_with_rest}, "
            f"months_with_weekend={state.months_with_weekend}"
        )
        raise ValueError(msg)

    # STEERING: If month needs weekend, prefer landing on Friday
    if needs_weekend_this_month(state, current_date):
        friday_landing = [
            length
            for length in valid_lengths
            if lands_on_friday(current_date, length, holiday_map)
        ]
        if friday_landing:
            return rng.choice(friday_landing)

    return rng.choice(valid_lengths)


def is_valid_work_length(
    state: ScheduleState,
    start_date: date,
    length: int,
    holiday_map: dict[date, DayType],
) -> bool:
    """
    Check if placing 'length' work days from start_date is valid.

    Validates:
    - Doesn't exceed 7-day work block limit
    - Rest can be placed after this work block
    - If week needs rest, rest stays in current week

    Args:
        state: Current schedule state
        start_date: Where work block would start
        length: Proposed work block length
        holiday_map: Holiday mapping

    Returns:
        True if this length is valid
    """
    # Check work block limit
    if state.current_work_streak + length > 7:
        return False

    # Simulate placement to find where rest would start
    rest_start = simulate_work_placement(start_date, length, holiday_map)

    # Check if we're still in the same year
    if rest_start.year != start_date.year:
        return False

    # Check if we can place rest at that position
    if not can_place_rest_at(rest_start, holiday_map):
        return False

    # If this week needs rest, ensure rest stays in this week
    if needs_rest_this_week(state, start_date):
        start_week = start_date.isocalendar()[1]
        rest_week = rest_start.isocalendar()[1]
        if rest_week != start_week:
            return False

    return True


def simulate_work_placement(
    start_date: date, length: int, holiday_map: dict[date, DayType]
) -> date:
    """
    Simulate placing 'length' work days and return where rest would start.

    Skips over holidays (they don't count toward work length).

    Args:
        start_date: Starting date
        length: Number of work days
        holiday_map: Holiday mapping

    Returns:
        Date where rest block would start
    """
    current = start_date
    work_days_placed = 0

    while work_days_placed < length:
        # Skip holidays (they don't count toward work length)
        if current not in holiday_map:
            work_days_placed += 1
        current += timedelta(days=1)

    return current


def lands_on_friday(
    start_date: date, work_length: int, holiday_map: dict[date, DayType]
) -> bool:
    """
    Check if placing work_length work days lands rest start on Friday.

    Friday is ideal for Sat-Sun weekend rest.

    Args:
        start_date: Work block start
        work_length: Work block length
        holiday_map: Holiday mapping

    Returns:
        True if rest would start on Friday
    """
    rest_start = simulate_work_placement(start_date, work_length, holiday_map)
    return rest_start.weekday() == 4
