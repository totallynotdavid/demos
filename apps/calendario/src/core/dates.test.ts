import { describe, expect, test } from "bun:test";
import {
  addDays,
  allDatesInYear,
  allIsoWeeks,
  assertIsoDate,
  daysBetween,
  isoWeekDates,
  isoWeekNumber,
  weekDatesInYear,
  weekday,
} from "./dates.ts";

describe("dates", () => {
  test("weekday counts from Monday", () => {
    expect(weekday("2025-01-06")).toBe(0);
    expect(weekday("2025-01-11")).toBe(5);
    expect(weekday("2025-01-12")).toBe(6);
  });

  test("addDays crosses month and year ends", () => {
    expect(addDays("2025-01-31", 1)).toBe("2025-02-01");
    expect(addDays("2025-01-01", -1)).toBe("2024-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  test("daysBetween is signed", () => {
    expect(daysBetween("2025-01-01", "2025-01-03")).toBe(2);
    expect(daysBetween("2025-01-03", "2025-01-01")).toBe(-2);
  });

  test("years below 100 are not read as 19xx", () => {
    expect(addDays("0050-12-31", 1)).toBe("0051-01-01");
  });

  test("allDatesInYear covers leap and common years", () => {
    expect(allDatesInYear(2025)).toHaveLength(365);
    expect(allDatesInYear(2024)).toHaveLength(366);
    expect(allDatesInYear(1900)).toHaveLength(365);
    expect(allDatesInYear(2000)).toHaveLength(366);
  });

  test("assertIsoDate rejects text that is not a real date", () => {
    expect(() => assertIsoDate("2025-02-29")).toThrow("Invalid date");
    expect(() => assertIsoDate("2025-1-1")).toThrow("Invalid date");
    expect(() => assertIsoDate("tomorrow")).toThrow("Invalid date");
    expect(() => assertIsoDate("2024-02-29")).not.toThrow();
  });
});

describe("ISO weeks", () => {
  test("isoWeekNumber follows ISO 8601", () => {
    expect(isoWeekNumber("2024-12-30")).toBe(1);
    expect(isoWeekNumber("2025-01-01")).toBe(1);
    expect(isoWeekNumber("2021-01-03")).toBe(53);
    expect(isoWeekNumber("2026-12-31")).toBe(53);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
  });

  test("isoWeekDates spans Monday to Sunday", () => {
    expect(isoWeekDates(2025, 1)).toEqual(["2024-12-30", "2025-01-05"]);
    expect(isoWeekDates(2025, 2)).toEqual(["2025-01-06", "2025-01-12"]);
  });

  test("weekDatesInYear drops days outside the year", () => {
    expect(weekDatesInYear(2025, 1)).toEqual([
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
      "2025-01-04",
      "2025-01-05",
    ]);
  });

  test("allIsoWeeks leaves out weeks that belong to another year", () => {
    const weeks = (year: number) => {
      const all = allIsoWeeks(year);
      return [all[0], all[all.length - 1]];
    };
    expect(weeks(2025)).toEqual([1, 52]);
    expect(weeks(2026)).toEqual([1, 53]);
    // Jan 1, 2027 is in week 53 of 2026, so the year's weeks start at 1.
    expect(weeks(2027)).toEqual([1, 52]);
  });
});
