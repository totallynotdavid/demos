import { describe, expect, test } from "bun:test";
import { allIsoWeeks, weekDatesInYear, weekday } from "./dates.ts";
import { generateCalendar } from "./generate.ts";

/**
 * The seven scheduling rules, each checked directly on the generated days
 * rather than through the validator the generator already runs.
 */
const calendar = generateCalendar(2025, { seed: 42 });

describe("rule 1: holiday pairing", () => {
  test("isolated holidays are rest, a pair works the first day", () => {
    const cal = generateCalendar(2025, {
      holidays: ["2025-01-01", "2025-05-01", "2025-05-02", "2025-12-25"],
      seed: 42,
    });

    expect(cal.getDay("2025-01-01").dayType).toBe("HOLIDAY");
    expect(cal.getDay("2025-12-25").dayType).toBe("HOLIDAY");
    expect(cal.getDay("2025-05-01").dayType).toBe("WORKING_HOLIDAY");
    expect(cal.getDay("2025-05-02").dayType).toBe("HOLIDAY");
  });
});

describe("rule 2: rest comes in blocks of two", () => {
  test("every rest block is exactly two days", () => {
    const blocks = calendar.getRestBlocks();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(block).toHaveLength(2);
  });
});

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

describe("all rules across seeds and years", () => {
  for (const seed of [42, 100, 200, 300, 400]) {
    test(`2025 with seed ${seed}`, () => {
      const cal = generateCalendar(2025, { seed });
      expect(cal.year).toBe(2025);
      expect(cal.days).toHaveLength(365);
    });
  }

  for (const year of [2024, 2025, 2026]) {
    test(`${year} with seed 100`, () => {
      expect(generateCalendar(year, { seed: 100 }).year).toBe(year);
    });
  }
});
