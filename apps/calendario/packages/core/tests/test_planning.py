from datetime import date
from random import Random

import pytest

from calendario.core.types import DayType
from calendario.generation.planning import select_monthly_weekends


def test_select_monthly_weekends_no_holidays():
    rng = Random(42)
    holidays = {}
    weekends = select_monthly_weekends(2025, holidays, rng)

    assert len(weekends) == 12
    assert all(d.weekday() == 5 for d in weekends)
    assert all(d.year == 2025 for d in weekends)

    months = [d.month for d in weekends]
    assert sorted(months) == list(range(1, 13))


def test_select_monthly_weekends_deterministic_with_seed():
    rng1 = Random(42)
    rng2 = Random(42)
    holidays = {}

    weekends1 = select_monthly_weekends(2025, holidays, rng1)
    weekends2 = select_monthly_weekends(2025, holidays, rng2)

    assert weekends1 == weekends2


def test_select_monthly_weekends_different_with_different_seed():
    rng1 = Random(42)
    rng2 = Random(99)
    holidays = {}

    weekends1 = select_monthly_weekends(2025, holidays, rng1)
    weekends2 = select_monthly_weekends(2025, holidays, rng2)

    assert weekends1 != weekends2


def test_select_monthly_weekends_avoids_adjacent_holidays():
    rng = Random(42)
    friday = date(2025, 1, 3)
    assert friday.weekday() == 4

    holidays = {friday: DayType.HOLIDAY}
    weekends = select_monthly_weekends(2025, holidays, rng)

    saturday_after_holiday = date(2025, 1, 4)
    assert saturday_after_holiday not in weekends


def test_select_monthly_weekends_raises_if_no_valid_weekend():
    rng = Random(42)

    saturdays_in_jan = [
        date(2025, 1, 4),
        date(2025, 1, 11),
        date(2025, 1, 18),
        date(2025, 1, 25),
    ]

    holidays = {}
    for sat in saturdays_in_jan:
        holidays[sat] = DayType.HOLIDAY

    with pytest.raises(ValueError, match="No valid weekend found"):
        select_monthly_weekends(2025, holidays, rng)
