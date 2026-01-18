from datetime import date

from calendario.domain.types import DayType


def process_holidays(holidays: tuple[date, ...]) -> dict[date, DayType]:
    """
    Processes holidays according to rules:
    - Isolated holidays -> HOLIDAY (rest day)
    - Paired holidays -> First is WORKING_HOLIDAY, second is HOLIDAY

    Args:
        holidays: Tuple of holiday dates

    Returns:
        Dict mapping date to DayType

    Raises:
        ValueError: If holiday block is larger than 2 days
    """
    if not holidays:
        return {}

    blocks = _group_consecutive_holidays(holidays)

    result = {}
    for block in blocks:
        if len(block) == 1:
            result[block[0]] = DayType.HOLIDAY
        elif len(block) == 2:
            result[block[0]] = DayType.WORKING_HOLIDAY
            result[block[1]] = DayType.HOLIDAY
        else:
            msg = (
                f"Holiday block too large ({len(block)} days): "
                f"{block[0]} to {block[-1]}. Maximum is 2 consecutive holidays."
            )
            raise ValueError(msg)

    return result


def _group_consecutive_holidays(holidays: tuple[date, ...]) -> list[list[date]]:
    """
    Groups consecutive holidays into blocks.

    Args:
        holidays: Tuple of holiday dates

    Returns:
        List of blocks, where each block is a list of consecutive dates
    """
    if not holidays:
        return []

    sorted_holidays = sorted(holidays)
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
