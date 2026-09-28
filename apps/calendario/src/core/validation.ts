import { addDays, allIsoWeeks, weekDatesInYear, weekday } from "./dates.ts";
import { type Calendar, isRestDay, isWorkDay } from "./domain.ts";

export class ValidationError extends Error {
  override name = "ValidationError";
}

export type Rule = (calendar: Calendar) => string[];

export const validateWorkBlockLengths: Rule = (calendar) => {
  const errors: string[] = [];
  for (const block of calendar.getWorkBlocks()) {
    const length = block.length;
    if (length < 3) {
      errors.push(
        `Work block starting ${block[0].date} is ${length} days (min: 3)`,
      );
    } else if (length > 7) {
      errors.push(
        `Work block starting ${block[0].date} is ${length} days (max: 7)`,
      );
    }
  }
  return errors;
};

export const validateRestBlocks: Rule = (calendar) =>
  calendar
    .getRestBlocks()
    .filter((block) => block.length !== 2)
    .map(
      (block) =>
        `Rest block starting ${block[0].date} is ${block.length} days (must be 2)`,
    );

export const validateNoSundayMondayRest: Rule = (calendar) => {
  const errors: string[] = [];
  const { days } = calendar;
  for (let i = 0; i < days.length - 1; i++) {
    if (
      days[i].dayType === "REST" &&
      days[i + 1].dayType === "REST" &&
      weekday(days[i].date) === 6 &&
      weekday(days[i + 1].date) === 0
    ) {
      errors.push(`Invalid Sunday-Monday rest block at ${days[i].date}`);
    }
  }
  return errors;
};

export const validateOrderingPlacement: Rule = (calendar) => {
  const errors: string[] = [];
  const { days } = calendar;
  for (let i = 1; i < days.length; i++) {
    const current = days[i];
    if (
      isRestDay(days[i - 1]) &&
      isWorkDay(current) &&
      current.dayType !== "ORDERING"
    ) {
      errors.push(
        `Expected ORDERING at ${current.date} after rest, got ${current.dayType.toLowerCase()}`,
      );
    }
  }
  return errors;
};

export const validateOneRestPerWeek: Rule = (calendar) => {
  const errors: string[] = [];

  for (const week of allIsoWeeks(calendar.year)) {
    const dates = weekDatesInYear(calendar.year, week).filter((date) =>
      calendar.hasDay(date),
    );
    const isRest = (index: number) =>
      index < dates.length && calendar.getDay(dates[index]).dayType === "REST";

    let restBlocks = 0;
    for (let i = 0; i < dates.length; i++) {
      if (isRest(i) && isRest(i + 1)) {
        restBlocks++;
        i++;
      }
    }

    if (restBlocks !== 1) {
      errors.push(`Week ${week} has ${restBlocks} rest blocks (must be 1)`);
    }
  }

  return errors;
};

export const validateMonthlyWeekends: Rule = (calendar) => {
  const errors: string[] = [];

  for (let month = 1; month <= 12; month++) {
    const days = calendar.getMonthDays(month);
    let freeWeekends = 0;
    for (let i = 0; i < days.length - 1; i++) {
      if (
        weekday(days[i].date) === 5 &&
        weekday(days[i + 1].date) === 6 &&
        days[i].dayType === "REST" &&
        days[i + 1].dayType === "REST"
      ) {
        freeWeekends++;
      }
    }
    if (freeWeekends !== 1) {
      errors.push(
        `Month ${month} has ${freeWeekends} free weekends (must be 1)`,
      );
    }
  }

  return errors;
};

export const validateHolidayPairing: Rule = (calendar) => {
  const errors: string[] = [];
  const holidays = calendar.days.filter(
    (day) => day.dayType === "HOLIDAY" || day.dayType === "WORKING_HOLIDAY",
  );

  for (let i = 0; i < holidays.length; i++) {
    const current = holidays[i];
    const next = holidays[i + 1];

    if (next && next.date === addDays(current.date, 1)) {
      if (current.dayType !== "WORKING_HOLIDAY") {
        errors.push(
          `First holiday in pair at ${current.date} should be WORKING_HOLIDAY`,
        );
      }
      if (next.dayType !== "HOLIDAY") {
        errors.push(`Second holiday in pair at ${next.date} should be HOLIDAY`);
      }
      i++;
    } else if (current.dayType !== "HOLIDAY") {
      errors.push(`Isolated holiday at ${current.date} should be HOLIDAY`);
    }
  }

  return errors;
};

export const ALL_RULES: readonly Rule[] = [
  validateHolidayPairing,
  validateRestBlocks,
  validateWorkBlockLengths,
  validateNoSundayMondayRest,
  validateOrderingPlacement,
  validateOneRestPerWeek,
  validateMonthlyWeekends,
];

export function validateCalendar(calendar: Calendar): void {
  const errors = ALL_RULES.flatMap((rule) => rule(calendar));
  if (errors.length > 0) {
    throw new ValidationError(
      `Calendar validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}
