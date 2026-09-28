import { describe, expect, test } from "bun:test";
import { processHolidays } from "./holidays.ts";

describe("processHolidays", () => {
  test("no holidays gives an empty map", () => {
    expect(processHolidays([])).toEqual(new Map());
  });

  test("a single holiday is rest", () => {
    expect(processHolidays(["2025-01-01"])).toEqual(
      new Map([["2025-01-01", "HOLIDAY"]]),
    );
  });

  test("consecutive holidays work the first and rest the second", () => {
    expect(processHolidays(["2025-02-18", "2025-02-19"])).toEqual(
      new Map([
        ["2025-02-18", "WORKING_HOLIDAY"],
        ["2025-02-19", "HOLIDAY"],
      ]),
    );
  });

  test("several isolated holidays are all rest", () => {
    expect(processHolidays(["2025-01-01", "2025-05-01", "2025-12-25"])).toEqual(
      new Map([
        ["2025-01-01", "HOLIDAY"],
        ["2025-05-01", "HOLIDAY"],
        ["2025-12-25", "HOLIDAY"],
      ]),
    );
  });

  test("a Sunday-Monday pair is rejected", () => {
    expect(() => processHolidays(["2025-03-02", "2025-03-03"])).toThrow(
      "Sunday-Monday holiday pair not allowed",
    );
  });

  test("a Saturday-Sunday pair is allowed", () => {
    expect(processHolidays(["2025-03-01", "2025-03-02"]).size).toBe(2);
  });

  test("more than two in a row is rejected", () => {
    expect(() =>
      processHolidays(["2025-01-01", "2025-01-02", "2025-01-03"]),
    ).toThrow("Holiday block too large");
  });

  test("duplicates count once", () => {
    expect(processHolidays(["2025-01-01", "2025-01-01"])).toEqual(
      new Map([["2025-01-01", "HOLIDAY"]]),
    );
  });

  test("input order does not matter", () => {
    const result = processHolidays(["2025-05-01", "2025-01-01", "2025-12-25"]);
    expect(result.size).toBe(3);
    expect([...result.values()].every((type) => type === "HOLIDAY")).toBe(true);
  });
});
