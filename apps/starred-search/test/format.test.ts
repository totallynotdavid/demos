import { describe, expect, it } from "vitest";
import { ago, formatCount, until } from "../src/lib/format";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [950, "950"],
    [999, "999"],
    [1000, "1k"],
    [1234, "1.2k"],
    [9999, "10k"],
    [15_300, "15k"],
    [999_499, "999k"],
    [999_999, "1M"],
    [1_000_000, "1M"],
    [2_400_000, "2.4M"],
  ])("writes %i as %s", (count, text) => {
    expect(formatCount(count)).toBe(text);
  });
});

describe("ago", () => {
  const now = Date.UTC(2026, 9, 7, 12);
  const min = 60_000;

  it.each([
    [0, "just now"],
    [59_000, "just now"],
    [min, "1 min ago"],
    [59 * min, "59 min ago"],
    [60 * min, "1 h ago"],
    [23 * 60 * min, "23 h ago"],
    [24 * 60 * min, "1 d ago"],
    [59 * 24 * 60 * min, "59 d ago"],
    [90 * 24 * 60 * min, "3 mo ago"],
  ])("writes %i ms as %s", (span, text) => {
    expect(ago(now - span, now)).toBe(text);
  });

  it("never reads negative when the clock is behind", () => {
    expect(ago(now + 5000, now)).toBe("just now");
  });
});

describe("until", () => {
  const now = 1_000_000;

  it.each([
    [0, "in 1 s"],
    [1, "in 1 s"],
    [1500, "in 2 s"],
    [59_000, "in 59 s"],
    [60_000, "in 1 min"],
    [61_000, "in 2 min"],
    [3_599_000, "in 60 min"],
    [3_600_000, "in 1 h"],
    [5_400_000, "in 2 h"],
  ])("writes %i ms ahead as %s", (span, text) => {
    expect(until(now + span, now)).toBe(text);
  });
});
