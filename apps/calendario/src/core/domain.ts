import { type IsoDate, monthOf, yearOf } from "./dates.ts";

export type DayType =
  | "WORK"
  | "REST"
  | "ORDERING"
  | "HOLIDAY"
  | "WORKING_HOLIDAY";

export interface Day {
  readonly date: IsoDate;
  readonly dayType: DayType;
}

export function isWorkDay(day: Day): boolean {
  return (
    day.dayType === "WORK" ||
    day.dayType === "ORDERING" ||
    day.dayType === "WORKING_HOLIDAY"
  );
}

export function isRestDay(day: Day): boolean {
  return day.dayType === "REST" || day.dayType === "HOLIDAY";
}

function blocksOf(days: readonly Day[], inBlock: (day: Day) => boolean) {
  const blocks: Day[][] = [];
  let current: Day[] = [];
  for (const day of days) {
    if (inBlock(day)) {
      current.push(day);
    } else if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

export class Calendar {
  readonly year: number;
  readonly days: readonly Day[];
  private readonly index: Map<IsoDate, Day>;

  constructor(year: number, days: readonly Day[]) {
    if (days.length === 0) {
      throw new Error("Calendar must have at least one day");
    }
    if (!days.every((day) => yearOf(day.date) === year)) {
      throw new Error("All days must be from the same year");
    }
    this.year = year;
    this.days = days;
    this.index = new Map(days.map((day) => [day.date, day]));
  }

  hasDay(date: IsoDate): boolean {
    return this.index.has(date);
  }

  getDay(date: IsoDate): Day {
    const day = this.index.get(date);
    if (!day) throw new Error(`No day for ${date}`);
    return day;
  }

  getMonthDays(month: number): Day[] {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(`Month must be 1-12, got ${month}`);
    }
    return this.days.filter((day) => monthOf(day.date) === month);
  }

  /** Runs of consecutive work days. Holidays end a run; working holidays do not. */
  getWorkBlocks(): Day[][] {
    return blocksOf(this.days, isWorkDay);
  }

  /** Runs of consecutive REST days. Holidays are not part of them. */
  getRestBlocks(): Day[][] {
    return blocksOf(this.days, (day) => day.dayType === "REST");
  }
}
