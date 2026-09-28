import {
  allDatesInYear,
  allIsoWeeks,
  monthOf,
  weekDatesInYear,
  weekday,
} from "./dates.ts";
import type { Day, DayType } from "./domain.ts";
import type { Rng } from "./random.ts";

const MIN_WORK = 3;
const MAX_WORK = 7;
const SUNDAY = 6;
const SATURDAY = 5;

// What the last placed day was. Values 1 to MAX_WORK are a work streak of that
// length; the constants below are the other states.
const YEAR_START = 0;
const REST_FIRST = 8;
const AFTER_REST = 9;
const AFTER_HOLIDAY = 10;
const LAST_STATE = AFTER_HOLIDAY;

const isStreak = (state: number) => state >= 1 && state <= MAX_WORK;

/**
 * Lays out a year day by day under the seven rules.
 *
 * Each day is either work or the first day of a two-day rest block, picked at
 * random among the choices that can still reach a valid year. Dead ends are
 * remembered by state, so the search is bounded by the number of distinct
 * states and a year no schedule fits fails at once instead of looping.
 */
export function buildSchedule(
  year: number,
  holidays: ReadonlyMap<string, DayType>,
  rng: Rng,
): Day[] {
  const dates = allDatesInYear(year);
  const count = dates.length;
  const weekdays = dates.map(weekday);
  const months = dates.map(monthOf);
  const holidayAt = dates.map((date) => holidays.get(date));

  // The one-rest-block rule covers only some weeks; days outside them are free.
  const checked = new Set<string>();
  for (const week of allIsoWeeks(year)) {
    for (const date of weekDatesInYear(year, week)) checked.add(date);
  }
  const inCheckedWeek = dates.map((date) => checked.has(date));

  const types: DayType[] = new Array(count);
  const dead = new Set<number>();

  /** Whether a rest block may start on day `i`. */
  function canStartRest(
    i: number,
    last: number,
    weekRests: number,
    weekendTaken: boolean,
  ): boolean {
    if (i + 1 >= count || holidayAt[i] || holidayAt[i + 1]) return false;
    // A block starting on Sunday would run into Monday.
    if (weekdays[i] === SUNDAY) return false;
    // Rest blocks never touch. The day after one must be an ordering day, which
    // a working holiday is not.
    if (last === AFTER_REST || holidayAt[i + 2] === "WORKING_HOLIDAY") {
      return false;
    }
    // The work block before it would be too short.
    if (isStreak(last) && last < MIN_WORK) return false;
    if (inCheckedWeek[i] && weekRests > 0) return false;
    // A second free weekend in the month is not allowed.
    return !(startsFreeWeekend(i) && weekendTaken);
  }

  /**
   * Whether a rest block on day `i` is the month's free weekend: a Saturday
   * whose Sunday is in the same month. A Saturday that ends a month is an
   * ordinary rest block.
   */
  function startsFreeWeekend(i: number): boolean {
    return weekdays[i] === SATURDAY && months[i + 1] === months[i];
  }

  /**
   * Fills `types` from day `i` on. `weekRests` counts rest blocks in the
   * current ISO week and `weekendTaken` says the month has its free weekend.
   */
  function solve(
    i: number,
    last: number,
    weekRests: number,
    weekendTaken: boolean,
  ): boolean {
    if (i === count) return !isStreak(last) || last >= MIN_WORK;

    const key =
      ((i * (LAST_STATE + 1) + last) * 2 + weekRests) * 2 + +weekendTaken;
    if (dead.has(key)) return false;

    const found = place(i, last, weekRests, weekendTaken);
    if (!found) dead.add(key);
    return found;
  }

  function place(
    i: number,
    last: number,
    weekRests: number,
    weekendTaken: boolean,
  ): boolean {
    if (last === REST_FIRST) {
      types[i] = "REST";
      return next(i, AFTER_REST, weekRests + 1, weekendTaken);
    }

    const holiday = holidayAt[i];
    if (holiday === "HOLIDAY") {
      // A holiday ends the work block before it.
      if (isStreak(last) && last < MIN_WORK) return false;
      types[i] = "HOLIDAY";
      return next(i, AFTER_HOLIDAY, weekRests, weekendTaken);
    }

    const streak = isStreak(last) ? last : 0;
    const canWork =
      streak < MAX_WORK &&
      // Only an ordering day may follow rest, and a working holiday is not one.
      !(
        holiday === "WORKING_HOLIDAY" &&
        (last === AFTER_REST || last === AFTER_HOLIDAY)
      );
    const canRest = canStartRest(i, last, weekRests, weekendTaken);

    const choices: Array<"work" | "rest"> = [];
    if (canWork) choices.push("work");
    if (canRest) choices.push("rest");
    if (choices.length === 2 && rng() < 0.5) choices.reverse();

    for (const choice of choices) {
      if (choice === "work") {
        types[i] = holiday ?? "WORK";
        if (next(i, streak + 1, weekRests, weekendTaken)) return true;
      } else {
        types[i] = "REST";
        const weekend = weekendTaken || startsFreeWeekend(i);
        if (next(i, REST_FIRST, weekRests, weekend)) return true;
      }
    }
    return false;
  }

  /** Checks the week and month that day `i` closes, then places day `i + 1`. */
  function next(
    i: number,
    last: number,
    weekRests: number,
    weekendTaken: boolean,
  ): boolean {
    const endOfYear = i === count - 1;
    const endOfWeek = weekdays[i] === SUNDAY || endOfYear;
    const endOfMonth = endOfYear || months[i + 1] !== months[i];

    if (endOfWeek && inCheckedWeek[i] && weekRests !== 1) return false;
    if (endOfMonth && !weekendTaken) return false;

    return solve(
      i + 1,
      last,
      weekdays[i] === SUNDAY ? 0 : weekRests,
      endOfMonth ? false : weekendTaken,
    );
  }

  if (!solve(0, YEAR_START, 0, false)) {
    throw new Error(`No valid schedule exists for ${year} with these holidays`);
  }

  return dates.map((date, i) => {
    const previous = types[i - 1];
    const afterRest = previous === "REST" || previous === "HOLIDAY";
    return {
      date,
      dayType: types[i] === "WORK" && afterRest ? "ORDERING" : types[i],
    };
  });
}
