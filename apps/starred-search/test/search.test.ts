import { describe, expect, it } from "vitest";
import {
  buildIndex,
  type Filters,
  highlight,
  NO_FILTERS,
  parseQuery,
  search,
  snippets,
} from "../src/lib/search";
import type { Repo } from "../src/lib/types";

function repo(over: Partial<Repo> & { name: string }): Repo {
  return {
    id: over.name,
    owner: "acme",
    fullName: `${over.owner ?? "acme"}/${over.name}`,
    url: `https://github.com/acme/${over.name}`,
    description: null,
    language: null,
    topics: [],
    stars: 0,
    updatedAt: "2026-01-01T00:00:00Z",
    starredAt: "2026-01-01T00:00:00Z",
    lists: [],
    readme: null,
    ...over,
  };
}

const repos = [
  repo({
    name: "sqlite-tools",
    description: "Tools for SQLite",
    language: "Rust",
    topics: ["database", "cli"],
    stars: 50,
    starredAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-05T00:00:00Z",
    readme:
      "# sqlite-tools\nBackup your database quickly.\nWorks with sqlite files.",
    lists: ["Data"],
  }),
  repo({
    name: "web-kit",
    description: "UI kit",
    language: "TypeScript",
    topics: ["ui"],
    stars: 900,
    starredAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z",
    readme: "Render widgets. Can also store data in sqlite.",
    lists: ["Data", "Frontend"],
  }),
  repo({
    name: "notes",
    description: "A place for database ideas",
    language: "TypeScript",
    topics: ["database"],
    stars: 5,
    starredAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-02-20T00:00:00Z",
    readme: null,
  }),
];

const index = buildIndex(repos);
const run = (
  query: string,
  filters: Filters = NO_FILTERS,
  sort = "relevance" as const,
) => search(index, query, filters, sort);
const names = (
  query: string,
  filters?: Filters,
  sort?: "relevance" | "starred" | "stars" | "updated",
) =>
  search(index, query, filters ?? NO_FILTERS, sort ?? "relevance").hits.map(
    (h) => h.repo.name,
  );

describe("parseQuery", () => {
  it("splits words and keeps quoted phrases whole", () => {
    expect(parseQuery('  Foo  "bar baz" qux ')).toEqual([
      "foo",
      "bar baz",
      "qux",
    ]);
  });

  it("drops empty quotes", () => {
    expect(parseQuery('"" a')).toEqual(["a"]);
  });
});

describe("search", () => {
  it("returns everything, newest star first, for an empty query", () => {
    expect(names("")).toEqual(["sqlite-tools", "web-kit", "notes"]);
  });

  it("requires every term to match somewhere", () => {
    expect(names("sqlite database")).toEqual(["sqlite-tools"]);
    expect(names("sqlite nothingmatchesthis")).toEqual([]);
  });

  it("searches README text", () => {
    expect(names("widgets")).toEqual(["web-kit"]);
  });

  it("ranks a name match above a README mention", () => {
    expect(names("sqlite")).toEqual(["sqlite-tools", "web-kit"]);
  });

  it("matches a quoted phrase as one term", () => {
    expect(names('"backup your database"')).toEqual(["sqlite-tools"]);
    expect(names('"database backup"')).toEqual([]);
  });

  it("matches owner/name", () => {
    expect(names("acme/notes")).toEqual(["notes"]);
  });

  it("is case-insensitive", () => {
    expect(names("SQLITE")).toEqual(names("sqlite"));
  });

  it("takes regex characters literally", () => {
    const index = buildIndex([
      repo({ name: "fast", readme: "Written in C++ (and a little C)." }),
      repo({ name: "other", readme: "Written in C." }),
    ]);
    const find = (query: string) =>
      search(index, query, NO_FILTERS, "relevance").hits.map(
        (h) => h.repo.name,
      );

    expect(find("c++")).toEqual(["fast"]);
    expect(find("(and")).toEqual(["fast"]);
    expect(find("[")).toEqual([]);
  });

  it("sorts by stars, update date and star date on request", () => {
    expect(names("", NO_FILTERS, "stars")).toEqual([
      "web-kit",
      "sqlite-tools",
      "notes",
    ]);
    expect(names("", NO_FILTERS, "updated")).toEqual([
      "sqlite-tools",
      "notes",
      "web-kit",
    ]);
    expect(names("sqlite", NO_FILTERS, "starred")).toEqual([
      "sqlite-tools",
      "web-kit",
    ]);
  });
});

describe("filters", () => {
  it("filters by language, topic and list, and they combine", () => {
    expect(names("", { ...NO_FILTERS, language: "TypeScript" })).toEqual([
      "web-kit",
      "notes",
    ]);
    expect(names("", { ...NO_FILTERS, topics: ["database"] })).toEqual([
      "sqlite-tools",
      "notes",
    ]);
    expect(names("", { ...NO_FILTERS, list: "Data" })).toEqual([
      "sqlite-tools",
      "web-kit",
    ]);
    expect(
      names("", { language: "TypeScript", topics: ["database"], list: null }),
    ).toEqual(["notes"]);
  });

  it("requires every chosen topic", () => {
    expect(names("", { ...NO_FILTERS, topics: ["database", "cli"] })).toEqual([
      "sqlite-tools",
    ]);
  });

  it("applies filters on top of the query", () => {
    expect(names("sqlite", { ...NO_FILTERS, language: "TypeScript" })).toEqual([
      "web-kit",
    ]);
  });
});

describe("facets", () => {
  it("counts the query matches", () => {
    const { facets } = run("sqlite");

    expect(facets.languages).toEqual([
      { value: "Rust", count: 1 },
      { value: "TypeScript", count: 1 },
    ]);
    expect(facets.lists).toEqual([
      { value: "Data", count: 2 },
      { value: "Frontend", count: 1 },
    ]);
  });

  it("leaves a facet's own filter out so its alternatives stay visible", () => {
    const { facets } = run("", { ...NO_FILTERS, language: "Rust" });

    expect(facets.languages.map((f) => f.value)).toEqual([
      "TypeScript",
      "Rust",
    ]);
    expect(facets.topics.map((f) => f.value).sort()).toEqual([
      "cli",
      "database",
    ]);
  });

  it("applies the other filters to a facet", () => {
    const { facets } = run("", { ...NO_FILTERS, list: "Frontend" });

    expect(facets.languages).toEqual([{ value: "TypeScript", count: 1 }]);
  });

  it("orders by count, then name", () => {
    const { facets } = run("");

    expect(facets.topics[0]).toEqual({ value: "database", count: 2 });
  });
});

describe("snippets", () => {
  it("returns the README lines with the most terms first", () => {
    const lines = snippets(repos[0], ["sqlite", "files"]);

    expect(lines).toEqual(["Works with sqlite files.", "# sqlite-tools"]);
  });

  it("returns nothing without a README or terms", () => {
    expect(snippets(repos[2], ["a"])).toEqual([]);
    expect(snippets(repos[0], [])).toEqual([]);
  });

  it("cuts a long line around the first match", () => {
    const long = repo({
      name: "x",
      readme: `${"a ".repeat(200)}needle${" b".repeat(200)}`,
    });

    const [line] = snippets(long, ["needle"]);

    expect(line).toContain("needle");
    expect(line.length).toBeLessThan(170);
    expect(line.startsWith("…")).toBe(true);
    expect(line.endsWith("…")).toBe(true);
  });
});

describe("highlight", () => {
  it("marks every occurrence and keeps the original casing", () => {
    expect(highlight("SQLite and sqlite", ["sqlite"])).toEqual([
      { text: "SQLite", match: true },
      { text: " and ", match: false },
      { text: "sqlite", match: true },
    ]);
  });

  it("merges overlapping matches", () => {
    expect(highlight("database", ["data", "taba"])).toEqual([
      { text: "databa", match: true },
      { text: "se", match: false },
    ]);
  });

  it("returns the text whole without matches", () => {
    expect(highlight("hello", ["zzz"])).toEqual([
      { text: "hello", match: false },
    ]);
    expect(highlight("hello", [])).toEqual([{ text: "hello", match: false }]);
  });
});
