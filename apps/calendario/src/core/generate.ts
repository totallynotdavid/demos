import { assertIsoDate, type IsoDate, yearOf } from "./dates.ts";
import { Calendar } from "./domain.ts";
import { processHolidays } from "./holidays.ts";
import { type Rng, seededRng } from "./random.ts";
import { buildSchedule } from "./schedule.ts";
import { validateCalendar } from "./validation.ts";

export interface GenerateOptions {
  holidays?: readonly IsoDate[];
  /** Makes the result repeatable. Without it each call differs. */
  seed?: number;
}

/**
 * Generates a year of work and rest days that satisfies every validation rule.
 *
 * Throws an `Error` when the year or holidays are invalid, or when no schedule
 * fits the holidays. Throws `ValidationError` only if the generator itself
 * has a bug.
 */
export function generateCalendar(
  year: number,
  { holidays = [], seed }: GenerateOptions = {},
): Calendar {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new Error(`Invalid year: ${year}`);
  }
  holidays.forEach(assertIsoDate);
  if (!holidays.every((holiday) => yearOf(holiday) === year)) {
    throw new Error("All holidays must be in the target year");
  }
  if (new Set(holidays).size !== holidays.length) {
    throw new Error("Duplicate holidays found");
  }

  const rng: Rng = seed === undefined ? Math.random : seededRng(seed);
  const days = buildSchedule(year, processHolidays(holidays), rng);
  const calendar = new Calendar(year, days);
  validateCalendar(calendar);
  return calendar;
}
