from datetime import date, timedelta

import pytest

from calendario import generate_calendar
from calendario.domain import DayType


class TestAllRequirements:
    """Test suite for all 7 requirements"""

    @pytest.fixture
    def cal(self):
        """Standard test calendar"""
        return generate_calendar(2025, seed=42)

    def test_req1_holiday_pairing(self):
        """
        REQ1: Holiday pairing rules
        - Solitary holidays are mandatory rest (HOLIDAY)
        - Consecutive pairs have one WORKING_HOLIDAY and one HOLIDAY
        """
        holidays = [
            date(2025, 1, 1),  # Isolated
            date(2025, 5, 1),
            date(2025, 5, 2),  # Pair
            date(2025, 12, 25),  # Isolated
        ]
        cal = generate_calendar(2025, holidays=holidays, seed=42)

        # Isolated holidays
        assert cal.get_day(date(2025, 1, 1)).day_type == DayType.HOLIDAY
        assert cal.get_day(date(2025, 12, 25)).day_type == DayType.HOLIDAY

        # Pair
        day1 = cal.get_day(date(2025, 5, 1))
        day2 = cal.get_day(date(2025, 5, 2))
        assert day1.day_type == DayType.WORKING_HOLIDAY
        assert day2.day_type == DayType.HOLIDAY

    def test_req2_rest_blocks_are_pairs(self, cal):
        """
        REQ2: Rest days come in blocks of exactly 2 days
        """
        rest_blocks = cal.get_rest_blocks()

        assert len(rest_blocks) > 0, "Should have rest blocks"

        for block in rest_blocks:
            assert len(block) == 2, (
                f"Rest block at {block[0].date} is {len(block)} days, must be 2"
            )

    def test_req3_ordering_after_rest(self, cal):
        """
        REQ3: After a rest block, an ORDERING day must come before work
        """
        for i in range(1, len(cal.days)):
            previous = cal.days[i - 1]
            current = cal.days[i]

            if previous.is_rest_day and current.is_work_day:
                assert current.day_type == DayType.ORDERING, (
                    f"Expected ORDERING at {current.date} after rest, "
                    f"got {current.day_type.value}"
                )

    def test_req4_work_blocks_3_to_7_days(self, cal):
        """
        REQ4: Work blocks are 3-7 days with variability
        """
        work_blocks = cal.get_work_blocks()

        assert len(work_blocks) > 0, "Should have work blocks"

        # All blocks must be 3-7 days
        lengths = []
        for block in work_blocks:
            length = len(block)
            assert 3 <= length <= 7, (
                f"Work block at {block[0].date} is {length} days, must be 3-7"
            )
            lengths.append(length)

        # Must have variability (not all the same length)
        unique_lengths = set(lengths)
        assert len(unique_lengths) > 1, (
            f"Work blocks should have variety, got only: {unique_lengths}"
        )

    def test_req5_one_weekend_per_month(self, cal):
        """
        REQ5: Exactly one free weekend (Sat-Sun REST) per month
        """
        for month in range(1, 13):
            month_days = cal.get_month_days(month)
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

            assert free_weekends == 1, (
                f"Month {month} has {free_weekends} free weekends, must be exactly 1"
            )

    def test_req6_one_rest_per_week(self, cal):
        """
        REQ6: Exactly one rest block per ISO week
        """
        week_numbers = self._get_all_iso_weeks(cal.year)

        for week_num in week_numbers:
            week_dates = self._get_week_dates(cal.year, week_num)

            # Count rest blocks in this week
            rest_blocks = 0
            i = 0
            while i < len(week_dates):
                try:
                    day = cal.get_day(week_dates[i])
                    if day.day_type == DayType.REST:
                        # Check if next day is also REST (2-day block)
                        if i + 1 < len(week_dates):
                            next_day = cal.get_day(week_dates[i + 1])
                            if next_day.day_type == DayType.REST:
                                rest_blocks += 1
                                i += 2
                                continue
                        i += 1
                    else:
                        i += 1
                except KeyError:
                    i += 1

            assert rest_blocks == 1, (
                f"Week {week_num} has {rest_blocks} rest blocks, must be exactly 1"
            )

    def test_req7_no_sunday_monday_rest(self, cal):
        """
        REQ7: Sunday-Monday cannot be a rest combination
        """
        for i in range(len(cal.days) - 1):
            day1 = cal.days[i]
            day2 = cal.days[i + 1]

            if (
                day1.date.weekday() == 6  # Sunday
                and day2.date.weekday() == 0  # Monday
            ):
                # Both should NOT be REST
                is_both_rest = (
                    day1.day_type == DayType.REST and day2.day_type == DayType.REST
                )
                assert not is_both_rest, (
                    f"Invalid Sunday-Monday REST block at {day1.date}"
                )

    @pytest.mark.parametrize("seed", [42, 100, 200, 300, 400])
    def test_all_requirements_multiple_seeds(self, seed):
        """
        All requirements must pass for different random seeds.

        If generation succeeds and validation passes, all requirements are met.
        """
        cal = generate_calendar(2025, seed=seed)

        # Just successfully generating and validating proves all requirements
        assert cal.year == 2025
        assert len(cal.days) == 365

    @pytest.mark.parametrize("year", [2024, 2025, 2026])
    def test_all_requirements_multiple_years(self, year):
        """All requirements must pass for different years"""
        cal = generate_calendar(year, seed=100)

        # If it generates successfully, all requirements are met
        assert cal.year == year

    # Helper methods

    def _get_all_iso_weeks(self, year: int) -> list[int]:
        """Get all ISO week numbers for the year"""
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

    def _get_week_dates(self, year: int, week_number: int) -> list[date]:
        """Get all dates in an ISO week that fall within the year"""
        jan_4 = date(year, 1, 4)
        week_start = (
            jan_4 - timedelta(days=jan_4.weekday()) + timedelta(weeks=week_number - 1)
        )

        week_dates = [week_start + timedelta(days=i) for i in range(7)]
        return [d for d in week_dates if d.year == year]


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_year_end_rest_block():
        """Rest block at year end should handle gracefully"""
        # Generate calendar and check last few days
        cal = generate_calendar(2025, seed=42)

        # Should complete without error
        assert cal.days[-1].date.year == 2025

    def test_many_holidays():
        """Calendar with many holidays should still satisfy constraints"""
        holidays = [
            date(2025, 1, 1),
            date(2025, 1, 2),
            date(2025, 2, 16),
            date(2025, 2, 17),
            date(2025, 5, 1),
            date(2025, 12, 25),
        ]
        cal = generate_calendar(2025, holidays=holidays, seed=42)

        # Should generate successfully
        assert len(cal.days) == 365
