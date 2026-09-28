import { describe, expect, test } from "bun:test";
import { monthOf, weekday } from "./dates.ts";
import type { Day, DayType } from "./domain.ts";
import { seededRng } from "./random.ts";
import { buildSchedule } from "./schedule.ts";

const NO_HOLIDAYS = new Map<string, DayType>();

/** Saturdays that start a free weekend: Sunday rests too, in the same month. */
function freeWeekends(days: Day[]): string[] {
  return days
    .filter(
      (day, i) =>
        weekday(day.date) === 5 &&
        day.dayType === "REST" &&
        days[i + 1]?.dayType === "REST" &&
        monthOf(days[i + 1].date) === monthOf(day.date),
    )
    .map((day) => day.date);
}

describe("buildSchedule", () => {
  test("gives every month one free weekend on a Saturday", () => {
    const days = buildSchedule(2025, NO_HOLIDAYS, seededRng(42));
    const weekends = freeWeekends(days);

    expect(weekends).toHaveLength(12);
    expect(weekends.every((date) => weekday(date) === 5)).toBe(true);
    expect(weekends.every((date) => date.startsWith("2025-"))).toBe(true);
    expect(weekends.map(monthOf).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
  });

  test("the same seed picks the same weekends", () => {
    const a = buildSchedule(2025, NO_HOLIDAYS, seededRng(42));
    const b = buildSchedule(2025, NO_HOLIDAYS, seededRng(42));
    expect(freeWeekends(a)).toEqual(freeWeekends(b));
  });

  test("a different seed picks different weekends", () => {
    const a = buildSchedule(2025, NO_HOLIDAYS, seededRng(42));
    const b = buildSchedule(2025, NO_HOLIDAYS, seededRng(99));
    expect(freeWeekends(a)).not.toEqual(freeWeekends(b));
  });

  test("never takes a weekend that holds a holiday", () => {
    // A Saturday that is a holiday cannot start the free weekend.
    const holidays = new Map<string, DayType>([["2025-03-08", "HOLIDAY"]]);
    for (let seed = 0; seed < 20; seed++) {
      const days = buildSchedule(2025, holidays, seededRng(seed));
      expect(freeWeekends(days)).not.toContain("2025-03-08");
      expect(freeWeekends(days)).toHaveLength(12);
    }
  });

  test("a Saturday that ends a month is an ordinary rest block", () => {
    // Sat May 31, 2025 is followed by Sun Jun 1, a different month. Resting
    // both days is allowed but is nobody's free weekend.
    let rested = 0;
    for (let seed = 0; seed < 50; seed++) {
      const days = buildSchedule(2025, NO_HOLIDAYS, seededRng(seed));
      expect(freeWeekends(days)).not.toContain("2025-05-31");
      expect(freeWeekends(days)).toHaveLength(12);
      if (days[150].dayType === "REST" && days[151].dayType === "REST") {
        rested++;
      }
    }
    expect(rested).toBeGreaterThan(0);
  });

  test("fails when a month has no Saturday-Sunday left", () => {
    const saturdays = new Map<string, DayType>(
      ["2025-01-04", "2025-01-11", "2025-01-18", "2025-01-25"].map(
        (date) => [date, "HOLIDAY"] as const,
      ),
    );
    expect(() => buildSchedule(2025, saturdays, seededRng(42))).toThrow(
      "No valid schedule exists for 2025",
    );
  });
});
