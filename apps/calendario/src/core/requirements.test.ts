import { describe, expect, test } from "bun:test";
import { allIsoWeeks, weekDatesInYear, weekday } from "./dates.ts";
import { generateCalendar } from "./generate.ts";

/**
 * Scheduling rules 3 to 7, each checked directly on the generated days rather
 * than through the validator the generator already runs.
 */
const calendar = generateCalendar(2025, { seed: 42 });

describe("rule 3: ordering day after rest", () => {
  test("the first work day after rest is ORDERING", () => {
    const { days } = calendar;
    for (let i = 1; i < days.length; i++) {
      const previousIsRest =
        days[i - 1].dayType === "REST" || days[i - 1].dayType === "HOLIDAY";
      const currentIsWork = ["WORK", "ORDERING", "WORKING_HOLIDAY"].includes(
        days[i].dayType,
      );
      if (previousIsRest && currentIsWork) {
        expect(days[i].dayType).toBe("ORDERING");
      }
    }
  });

  test("ordering never follows work", () => {
    const { days } = calendar;
    for (let i = 1; i < days.length; i++) {
      if (days[i].dayType === "ORDERING") {
        expect(["REST", "HOLIDAY"]).toContain(days[i - 1].dayType);
      }
    }
  });
});

describe("rule 4: work blocks of 3 to 7 days", () => {
  test("every block is 3 to 7 days and lengths vary", () => {
    const blocks = calendar.getWorkBlocks();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block.length).toBeGreaterThanOrEqual(3);
      expect(block.length).toBeLessThanOrEqual(7);
    }
    expect(new Set(blocks.map((block) => block.length)).size).toBeGreaterThan(
      1,
    );
  });
});

describe("rule 5: one free weekend per month", () => {
  test("each month has exactly one Saturday-Sunday rest", () => {
    for (let month = 1; month <= 12; month++) {
      const days = calendar.getMonthDays(month);
      const weekends = days.filter(
        (day, i) =>
          weekday(day.date) === 5 &&
          day.dayType === "REST" &&
          days[i + 1]?.dayType === "REST",
      );
      expect(weekends).toHaveLength(1);
    }
  });
});

describe("rule 6: one rest block per week", () => {
  test("each ISO week has exactly one two-day rest block", () => {
    for (const week of allIsoWeeks(calendar.year)) {
      const dates = weekDatesInYear(calendar.year, week);
      let blocks = 0;
      for (let i = 0; i < dates.length - 1; i++) {
        if (
          calendar.getDay(dates[i]).dayType === "REST" &&
          calendar.getDay(dates[i + 1]).dayType === "REST"
        ) {
          blocks++;
          i++;
        }
      }
      expect(blocks).toBe(1);
    }
  });
});

describe("rule 7: no Sunday-Monday rest", () => {
  test("Sunday and the Monday after are never both rest", () => {
    const { days } = calendar;
    for (let i = 0; i < days.length - 1; i++) {
      if (weekday(days[i].date) === 6) {
        expect(
          days[i].dayType === "REST" && days[i + 1].dayType === "REST",
        ).toBe(false);
      }
    }
  });
});
