import { describe, expect, test } from "bun:test";
import type { Entry } from "../api/_lib/attendance.ts";
import { type View, visibleEntries } from "../src/entries.ts";

const entries: Entry[] = [
  { name: "María López", answer: "yes", text: "Sí", at: "2026-09-02T09:00:00" },
  { name: "Álvaro Ruiz", answer: "no", text: "No", at: "2026-09-02T10:00:00" },
  { name: "Zoila Vega", answer: "yes", text: "Sí", at: null },
];

const view = (overrides: Partial<View> = {}): View => ({
  query: "",
  filter: "all",
  sort: "at",
  descending: true,
  ...overrides,
});

const names = (result: Entry[]) => result.map((e) => e.name);

describe("visibleEntries", () => {
  test("lists newest first and leaves entries without a time last", () => {
    expect(names(visibleEntries(entries, view()))).toEqual([
      "Álvaro Ruiz",
      "María López",
      "Zoila Vega",
    ]);
  });

  test("sorts by name ignoring accents", () => {
    expect(
      names(visibleEntries(entries, view({ sort: "name", descending: false }))),
    ).toEqual(["Álvaro Ruiz", "María López", "Zoila Vega"]);
  });

  test("searches without regard to case or accents", () => {
    expect(names(visibleEntries(entries, view({ query: "MARIA" })))).toEqual([
      "María López",
    ]);
    expect(names(visibleEntries(entries, view({ query: "alvaro" })))).toEqual([
      "Álvaro Ruiz",
    ]);
  });

  test("filters by answer", () => {
    expect(names(visibleEntries(entries, view({ filter: "no" })))).toEqual([
      "Álvaro Ruiz",
    ]);
  });

  test("combines search and filter, and may match nobody", () => {
    expect(
      visibleEntries(entries, view({ query: "ruiz", filter: "yes" })),
    ).toEqual([]);
  });

  test("does not reorder the list it was given", () => {
    const before = names(entries);
    visibleEntries(entries, view({ sort: "name" }));
    expect(names(entries)).toEqual(before);
  });
});
