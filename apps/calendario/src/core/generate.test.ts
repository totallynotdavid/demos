import { describe, expect, test } from "bun:test";
import { generateCalendar } from "./generate.ts";
import { ALL_RULES } from "./validation.ts";

const dayTypes = (cal: ReturnType<typeof generateCalendar>) =>
  cal.days.map((day) => day.dayType);

describe("generateCalendar", () => {
  test("a year without holidays", () => {
    const cal = generateCalendar(2025, { seed: 42 });

    expect(cal.year).toBe(2025);
    expect(cal.days).toHaveLength(365);
    for (const block of cal.getWorkBlocks()) {
      expect(block.length).toBeGreaterThanOrEqual(3);
      expect(block.length).toBeLessThanOrEqual(7);
    }
    for (const block of cal.getRestBlocks()) expect(block).toHaveLength(2);
  });

  test("a leap year has 366 days", () => {
    expect(generateCalendar(2024, { seed: 1 }).days).toHaveLength(366);
  });

  test("the same seed gives the same calendar", () => {
    const a = generateCalendar(2025, { seed: 42 });
    const b = generateCalendar(2025, { seed: 42 });
    expect(a.days).toEqual(b.days);
  });

  test("different seeds give different calendars", () => {
    const a = generateCalendar(2025, { seed: 42 });
    const b = generateCalendar(2025, { seed: 99 });
    expect(dayTypes(a)).not.toEqual(dayTypes(b));
  });

  test("without a seed the result is still valid", () => {
    const cal = generateCalendar(2025);
    expect(cal.days).toHaveLength(365);
  });

  test("holidays keep their type", () => {
    const cal = generateCalendar(2025, {
      holidays: ["2025-01-01", "2025-12-25"],
      seed: 42,
    });
    expect(cal.getDay("2025-01-01").dayType).toBe("HOLIDAY");
    expect(cal.getDay("2025-12-25").dayType).toBe("HOLIDAY");
  });

  test.each([0, 10_000, Number.NaN, 2025.5])("year %p is invalid", (year) => {
    expect(() => generateCalendar(year)).toThrow("Invalid year");
  });

  test("holidays from another year are rejected", () => {
    expect(() =>
      generateCalendar(2025, { holidays: ["2024-01-01"], seed: 42 }),
    ).toThrow("must be in the target year");
  });

  test("duplicate holidays are rejected", () => {
    expect(() =>
      generateCalendar(2025, {
        holidays: ["2025-01-01", "2025-01-01"],
        seed: 42,
      }),
    ).toThrow("Duplicate holidays");
  });

  test("a holiday that is not a real date is rejected", () => {
    expect(() =>
      generateCalendar(2025, { holidays: ["2025-02-30"], seed: 42 }),
    ).toThrow("Invalid date");
  });

  test("holidays that leave no valid weekend are rejected", () => {
    const saturdays = ["2025-01-04", "2025-01-11", "2025-01-18", "2025-01-25"];
    expect(() =>
      generateCalendar(2025, { holidays: saturdays, seed: 42 }),
    ).toThrow("No valid schedule");
  });

  test("a holiday pair that opens the year cannot fit a 3-day work block", () => {
    expect(() =>
      generateCalendar(2025, {
        holidays: ["2025-01-01", "2025-01-02"],
        seed: 42,
      }),
    ).toThrow("No valid schedule");
  });

  test("many holidays still satisfy every rule", () => {
    const holidays = [
      "2025-01-06",
      "2025-02-18",
      "2025-02-19",
      "2025-04-03",
      "2025-05-01",
      "2025-05-02",
      "2025-08-10",
      "2025-10-09",
      "2025-12-25",
    ];
    for (const seed of [1, 2, 3, 4, 5]) {
      const cal = generateCalendar(2025, { holidays, seed });
      expect(cal.getDay("2025-02-18").dayType).toBe("WORKING_HOLIDAY");
      expect(cal.getDay("2025-02-19").dayType).toBe("HOLIDAY");
      expect(cal.getDay("2025-08-10").dayType).toBe("HOLIDAY");
    }
  });
});

describe("every rule holds", () => {
  const years = [2024, 2025, 2026, 2027, 2028, 2032];
  const seeds = [0, 1, 7, 42, 100, 200, 300, 400, 12345];

  for (const year of years) {
    test(`${year} with ${seeds.length} seeds`, () => {
      for (const seed of seeds) {
        const cal = generateCalendar(year, { seed });
        for (const rule of ALL_RULES) expect(rule(cal)).toEqual([]);
      }
    });
  }

  test("a rest block on a Saturday that ends a month is allowed", () => {
    // Every other choice fails, so the only valid year rests Sat Feb 29 and
    // Sun Mar 1 without counting them as a free weekend.
    const holidays = [
      "2020-01-22",
      "2020-01-28",
      "2020-02-20",
      "2020-02-21",
      "2020-03-02",
      "2020-05-07",
      "2020-06-09",
      "2020-06-12",
      "2020-09-29",
      "2020-10-02",
      "2020-11-21",
      "2020-11-30",
      "2020-12-07",
    ];
    for (const seed of [0, 1, 42]) {
      const cal = generateCalendar(2020, { holidays, seed });
      for (const rule of ALL_RULES) expect(rule(cal)).toEqual([]);
      expect(cal.getDay("2020-02-29").dayType).toBe("REST");
      expect(cal.getDay("2020-03-01").dayType).toBe("REST");
    }
  });

  test("2000 to 2100", () => {
    for (let year = 2000; year <= 2100; year++) {
      generateCalendar(year, { seed: year });
    }
  });
});
