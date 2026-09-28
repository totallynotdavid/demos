import { daysBetween, type IsoDate, weekday } from "./dates.ts";
import type { DayType } from "./domain.ts";

/**
 * Types each holiday. An isolated holiday is a full rest day. Of two
 * consecutive holidays the first is worked and the second is rest.
 */
export function processHolidays(
  holidays: readonly IsoDate[],
): Map<IsoDate, DayType> {
  const result = new Map<IsoDate, DayType>();

  for (const block of groupConsecutive(holidays)) {
    if (block.length === 1) {
      result.set(block[0], "HOLIDAY");
    } else if (block.length === 2) {
      if (weekday(block[0]) === 6 && weekday(block[1]) === 0) {
        throw new Error(
          `Sunday-Monday holiday pair not allowed: ${block[0]} and ${block[1]}`,
        );
      }
      result.set(block[0], "WORKING_HOLIDAY");
      result.set(block[1], "HOLIDAY");
    } else {
      throw new Error(
        `Holiday block too large (${block.length} days): ${block[0]} to ${block[block.length - 1]}`,
      );
    }
  }

  return result;
}

function groupConsecutive(holidays: readonly IsoDate[]): IsoDate[][] {
  const blocks: IsoDate[][] = [];
  for (const holiday of [...new Set(holidays)].sort()) {
    const block = blocks[blocks.length - 1];
    if (block && daysBetween(block[block.length - 1], holiday) === 1) {
      block.push(holiday);
    } else {
      blocks.push([holiday]);
    }
  }
  return blocks;
}
