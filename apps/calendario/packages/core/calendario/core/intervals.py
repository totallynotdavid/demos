from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Interval:
    start: date
    end: date

    def __post_init__(self) -> None:
        if self.end < self.start:
            msg = f"End {self.end} cannot be before start {self.start}"
            raise ValueError(msg)

    @property
    def length(self) -> int:
        return (self.end - self.start).days + 1

    def contains(self, d: date) -> bool:
        return self.start <= d <= self.end

    def overlaps(self, other: "Interval") -> bool:
        return not (self.end < other.start or other.end < self.start)

    def dates(self) -> list[date]:
        return [self.start + timedelta(days=i) for i in range(self.length)]


def find_gaps(intervals: list[Interval], year: int) -> list[Interval]:
    if not intervals:
        return [Interval(date(year, 1, 1), date(year, 12, 31))]

    sorted_intervals = sorted(intervals, key=lambda i: i.start)
    gaps = []

    year_start = date(year, 1, 1)
    if sorted_intervals[0].start > year_start:
        gaps.append(Interval(year_start, sorted_intervals[0].start - timedelta(days=1)))

    for i in range(len(sorted_intervals) - 1):
        current_end = sorted_intervals[i].end
        next_start = sorted_intervals[i + 1].start
        if next_start > current_end + timedelta(days=1):
            gaps.append(
                Interval(
                    current_end + timedelta(days=1), next_start - timedelta(days=1)
                )
            )

    year_end = date(year, 12, 31)
    if sorted_intervals[-1].end < year_end:
        gaps.append(Interval(sorted_intervals[-1].end + timedelta(days=1), year_end))

    return gaps
