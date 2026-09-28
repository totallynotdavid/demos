import { expect, test } from "bun:test";
import { getEcuadorHolidays } from "./presets.ts";

test("each preset year lists twelve holidays inside that year", () => {
  for (const year of [2025, 2026]) {
    const holidays = getEcuadorHolidays(year);
    expect(holidays).toHaveLength(12);
    expect(holidays.every((date) => date.startsWith(`${year}-`))).toBe(true);
  }
});

test("a year without a preset is an error", () => {
  expect(() => getEcuadorHolidays(2030)).toThrow("No Ecuador holidays preset");
});
