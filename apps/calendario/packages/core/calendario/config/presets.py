from datetime import date


ECUADOR_HOLIDAYS = {
    2025: [
        date(2025, 1, 1),
        date(2025, 1, 2),
        date(2025, 2, 16),
        date(2025, 2, 17),
        date(2025, 4, 3),
        date(2025, 5, 1),
        date(2025, 5, 25),
        date(2025, 8, 10),
        date(2025, 10, 9),
        date(2025, 11, 2),
        date(2025, 11, 3),
        date(2025, 12, 25),
    ],
    2026: [
        date(2026, 1, 1),
        date(2026, 1, 2),
        date(2026, 2, 16),
        date(2026, 2, 17),
        date(2026, 4, 3),
        date(2026, 5, 1),
        date(2026, 5, 25),
        date(2026, 8, 10),
        date(2026, 10, 9),
        date(2026, 11, 2),
        date(2026, 11, 3),
        date(2026, 12, 25),
    ],
}


def get_ecuador_holidays(year: int) -> list[date]:
    """
    Get Ecuador's official holidays for a specific year.

    Args:
        year: Year to get holidays for

    Returns:
        List of holiday dates

    Raises:
        ValueError: If no preset exists for the year
    """
    if year not in ECUADOR_HOLIDAYS:
        msg = f"No Ecuador holidays preset for year {year}"
        raise ValueError(msg)
    return ECUADOR_HOLIDAYS[year]
