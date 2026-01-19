from datetime import date

from calendario.core.types import DayType


def process_holidays(holidays: list[date]) -> dict[date, DayType]:
    if not holidays:
        return {}

    blocks = _group_consecutive_holidays(holidays)
    result = {}

    for block in blocks:
        if len(block) == 1:
            result[block[0]] = DayType.HOLIDAY
        elif len(block) == 2:
            if block[0].weekday() == 6 and block[1].weekday() == 0:
                msg = (
                    f"Sunday-Monday holiday pair not allowed: {block[0]} and {block[1]}"
                )
                raise ValueError(msg)
            result[block[0]] = DayType.WORKING_HOLIDAY
            result[block[1]] = DayType.HOLIDAY
        else:
            msg = f"Holiday block too large ({len(block)} days): {block[0]} to {block[-1]}"
            raise ValueError(msg)

    return result


def _group_consecutive_holidays(holidays: list[date]) -> list[list[date]]:
    if not holidays:
        return []

    sorted_holidays = sorted(set(holidays))
    blocks = []
    current_block = [sorted_holidays[0]]

    for holiday in sorted_holidays[1:]:
        days_diff = (holiday - current_block[-1]).days
        if days_diff == 1:
            current_block.append(holiday)
        else:
            blocks.append(current_block)
            current_block = [holiday]

    blocks.append(current_block)
    return blocks
