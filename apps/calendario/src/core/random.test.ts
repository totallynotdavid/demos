import { expect, test } from "bun:test";
import { seededRng } from "./random.ts";

const take = (seed: number, count: number) => {
  const rng = seededRng(seed);
  return Array.from({ length: count }, rng);
};

test("the same seed gives the same sequence", () => {
  expect(take(42, 20)).toEqual(take(42, 20));
});

test("different seeds give different sequences", () => {
  expect(take(42, 20)).not.toEqual(take(99, 20));
});

test("values stay in [0, 1)", () => {
  for (const value of take(7, 1000)) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});
