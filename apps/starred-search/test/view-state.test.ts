import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIEW,
  hasFilters,
  parseView,
  type View,
  viewToSearch,
} from "../src/lib/view-state";

describe("view state", () => {
  it("writes the default view as an empty string", () => {
    expect(viewToSearch(DEFAULT_VIEW)).toBe("");
    expect(parseView("")).toEqual(DEFAULT_VIEW);
  });

  it("round-trips every field", () => {
    const view: View = {
      query: 'rust "memory safe" c++',
      filters: {
        language: "C++",
        topics: ["cli", "ui & ux"],
        list: "Read later",
      },
      sort: "stars",
    };

    expect(parseView(viewToSearch(view))).toEqual(view);
  });

  it("falls back to relevance for a sort it does not know", () => {
    expect(parseView("?sort=bogus").sort).toBe("relevance");
  });

  it("reads a link typed by hand", () => {
    expect(parseView("?q=sqlite&topic=database&topic=cli")).toEqual({
      query: "sqlite",
      filters: { language: null, topics: ["database", "cli"], list: null },
      sort: "relevance",
    });
  });

  it("says whether any filter is on", () => {
    expect(hasFilters(DEFAULT_VIEW.filters)).toBe(false);
    expect(hasFilters({ ...DEFAULT_VIEW.filters, topics: ["x"] })).toBe(true);
    expect(hasFilters({ ...DEFAULT_VIEW.filters, list: "L" })).toBe(true);
  });
});
