import { describe, expect, test } from "bun:test";
import { addDays } from "./dates.ts";
import { Calendar, type Day, type DayType } from "./domain.ts";
import {
  validateCalendar,
  validateHolidayPairing,
  validateNoSundayMondayRest,
  validateOrderingPlacement,
  validateRestBlocks,
  validateWorkBlockLengths,
} from "./validation.ts";

/** Days from `start` on, one per type. */
function calendarOf(start: string, ...types: DayType[]): Calendar {
  const days: Day[] = types.map((dayType, i) => ({
    date: addDays(start, i),
    dayType,
  }));
  return new Calendar(2025, days);
}

describe("work block lengths", () => {
  test("accepts a block of three", () => {
    const cal = calendarOf(
      "2025-01-01",
      "WORK",
      "WORK",
      "WORK",
      "REST",
      "REST",
    );
    expect(validateWorkBlockLengths(cal)).toEqual([]);
  });

  test("rejects a block that is too short", () => {
    const cal = calendarOf("2025-01-01", "WORK", "WORK", "REST", "REST");
    const errors = validateWorkBlockLengths(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("2 days (min: 3)");
  });

  test("rejects a block that is too long", () => {
    const cal = calendarOf("2025-01-01", ...Array<DayType>(9).fill("WORK"));
    const errors = validateWorkBlockLengths(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("9 days (max: 7)");
  });

  test("counts a working holiday as work", () => {
    const cal = calendarOf(
      "2025-01-01",
      "WORK",
      "WORK",
      "WORKING_HOLIDAY",
      "HOLIDAY",
    );
    expect(validateWorkBlockLengths(cal)).toEqual([]);
  });
});

describe("rest blocks", () => {
  test("accepts two days", () => {
    const cal = calendarOf("2025-01-01", "WORK", "REST", "REST", "WORK");
    expect(validateRestBlocks(cal)).toEqual([]);
  });

  test("rejects a single day", () => {
    const cal = calendarOf("2025-01-01", "WORK", "REST", "WORK");
    const errors = validateRestBlocks(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("1 days (must be 2)");
  });

  test("rejects three days", () => {
    const cal = calendarOf(
      "2025-01-01",
      "WORK",
      "REST",
      "REST",
      "REST",
      "WORK",
    );
    const errors = validateRestBlocks(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("3 days (must be 2)");
  });

  test("does not count a holiday next to rest", () => {
    const cal = calendarOf("2025-01-01", "WORK", "REST", "REST", "HOLIDAY");
    expect(validateRestBlocks(cal)).toEqual([]);
  });
});

describe("Sunday-Monday rest", () => {
  test("accepts Saturday-Sunday", () => {
    const cal = calendarOf("2025-01-04", "REST", "REST");
    expect(validateNoSundayMondayRest(cal)).toEqual([]);
  });

  test("rejects Sunday-Monday", () => {
    const cal = calendarOf("2025-01-05", "REST", "REST");
    const errors = validateNoSundayMondayRest(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Sunday-Monday rest block");
  });
});

describe("ordering placement", () => {
  test("accepts an ordering day after rest", () => {
    const cal = calendarOf("2025-01-01", "REST", "REST", "ORDERING", "WORK");
    expect(validateOrderingPlacement(cal)).toEqual([]);
  });

  test("rejects a plain work day after rest", () => {
    const cal = calendarOf("2025-01-01", "REST", "REST", "WORK");
    const errors = validateOrderingPlacement(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Expected ORDERING");
  });

  test("rejects a working holiday right after a holiday", () => {
    const cal = calendarOf("2025-01-01", "HOLIDAY", "WORKING_HOLIDAY");
    expect(validateOrderingPlacement(cal)).toHaveLength(1);
  });
});

describe("holiday pairing", () => {
  test("accepts an isolated holiday", () => {
    const cal = calendarOf("2025-01-01", "HOLIDAY", "WORK");
    expect(validateHolidayPairing(cal)).toEqual([]);
  });

  test("accepts a working holiday followed by a holiday", () => {
    const cal = calendarOf("2025-01-01", "WORKING_HOLIDAY", "HOLIDAY", "WORK");
    expect(validateHolidayPairing(cal)).toEqual([]);
  });

  test("rejects a pair of two holidays", () => {
    const cal = calendarOf("2025-01-01", "HOLIDAY", "HOLIDAY");
    const errors = validateHolidayPairing(cal);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("should be WORKING_HOLIDAY");
  });

  test("rejects an isolated working holiday", () => {
    const cal = calendarOf("2025-01-01", "WORKING_HOLIDAY", "WORK");
    expect(validateHolidayPairing(cal)).toHaveLength(1);
  });
});

describe("calendar construction", () => {
  test("needs at least one day", () => {
    expect(() => new Calendar(2025, [])).toThrow("at least one day");
  });

  test("rejects days from another year", () => {
    expect(
      () => new Calendar(2025, [{ date: "2024-12-31", dayType: "WORK" }]),
    ).toThrow("same year");
  });
});

describe("validateCalendar", () => {
  test("lists every failed rule in one error", () => {
    const cal = calendarOf("2025-01-05", "REST", "REST");
    expect(() => validateCalendar(cal)).toThrow("Calendar validation failed");
    expect(() => validateCalendar(cal)).toThrow("Sunday-Monday rest block");
    expect(() => validateCalendar(cal)).toThrow("free weekends");
  });
});
