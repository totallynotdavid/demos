/** A calendar date as `YYYY-MM-DD`. Compared and used as a map key as text. */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(year: number, month: number, day: number): number {
  // setUTCFullYear keeps years 0-99 from being read as 1900-1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
}

function parse(date: IsoDate): number {
  const match = ISO_DATE.exec(date);
  if (match) {
    const [year, month, day] = match.slice(1).map(Number);
    const ms = toUtc(year, month, day);
    if (toIso(ms) === date) return ms;
  }
  throw new Error(`Invalid date: ${date}`);
}

function toIso(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Throws unless `date` is a real `YYYY-MM-DD` date. */
export function assertIsoDate(date: string): void {
  parse(date);
}

export function isoDate(year: number, month: number, day: number): IsoDate {
  return toIso(toUtc(year, month, day));
}

export function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

export function monthOf(date: IsoDate): number {
  return Number(date.slice(5, 7));
}

/** Monday is 0 and Sunday is 6. */
export function weekday(date: IsoDate): number {
  return (new Date(parse(date)).getUTCDay() + 6) % 7;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return toIso(parse(date) + days * MS_PER_DAY);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parse(to) - parse(from)) / MS_PER_DAY);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function allDatesInYear(year: number): IsoDate[] {
  const first = isoDate(year, 1, 1);
  const count = isLeapYear(year) ? 366 : 365;
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

/** ISO 8601 week number (1-53). */
export function isoWeekNumber(date: IsoDate): number {
  const thursday = addDays(date, 3 - weekday(date));
  const jan1 = isoDate(yearOf(thursday), 1, 1);
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1;
}

/** Monday and Sunday of ISO week `week`, counted from the week holding Jan 4. */
export function isoWeekDates(
  year: number,
  week: number,
): [monday: IsoDate, sunday: IsoDate] {
  const jan4 = isoDate(year, 1, 4);
  const monday = addDays(jan4, -weekday(jan4) + (week - 1) * 7);
  return [monday, addDays(monday, 6)];
}

/**
 * The ISO weeks a year's rules apply to. A week that starts in the previous
 * year (Jan 1 in week 52 or 53) or ends in the next (Dec 31 in week 1) is
 * left out, so it is not held to the one-rest-block rule.
 */
export function allIsoWeeks(year: number): number[] {
  let first = isoWeekNumber(isoDate(year, 1, 1));
  let last = isoWeekNumber(isoDate(year, 12, 31));
  if (first > 50) first = 1;
  if (last === 1) last = isoWeekNumber(isoDate(year, 12, 28));
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** The dates of an ISO week that fall inside `year`. */
export function weekDatesInYear(year: number, week: number): IsoDate[] {
  const [monday] = isoWeekDates(year, week);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (date) => yearOf(date) === year,
  );
}
