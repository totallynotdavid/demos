import type { IsoDate } from "./dates.ts";

export const ECUADOR_HOLIDAYS: Readonly<Record<number, readonly IsoDate[]>> = {
  2025: [
    "2025-01-01",
    "2025-01-02",
    "2025-02-16",
    "2025-02-17",
    "2025-04-03",
    "2025-05-01",
    "2025-05-25",
    "2025-08-10",
    "2025-10-09",
    "2025-11-02",
    "2025-11-03",
    "2025-12-25",
  ],
  2026: [
    "2026-01-01",
    "2026-01-02",
    "2026-02-16",
    "2026-02-17",
    "2026-04-03",
    "2026-05-01",
    "2026-05-25",
    "2026-08-10",
    "2026-10-09",
    "2026-11-02",
    "2026-11-03",
    "2026-12-25",
  ],
};

export function getEcuadorHolidays(year: number): readonly IsoDate[] {
  const holidays = ECUADOR_HOLIDAYS[year];
  if (!holidays) {
    throw new Error(`No Ecuador holidays preset for year ${year}`);
  }
  return holidays;
}
