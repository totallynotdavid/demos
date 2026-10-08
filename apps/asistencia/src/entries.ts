import { fold } from "../api/_lib/answers.ts";
import type { Entry } from "../api/_lib/attendance.ts";

export type Filter = "all" | "yes" | "no";
export type SortKey = "at" | "name";

export interface View {
  query: string;
  filter: Filter;
  sort: SortKey;
  descending: boolean;
}

// Entries without a time sort as the oldest, so they sit last when newest
// comes first.
export function visibleEntries(entries: Entry[], view: View): Entry[] {
  const needle = fold(view.query);
  const sign = view.descending ? -1 : 1;
  return entries
    .filter(
      (entry) =>
        (view.filter === "all" || entry.answer === view.filter) &&
        fold(entry.name).includes(needle),
    )
    .sort((a, b) => {
      const order =
        view.sort === "name"
          ? fold(a.name).localeCompare(fold(b.name), "es")
          : (a.at ?? "").localeCompare(b.at ?? "");
      return order * sign;
    });
}
