import { describe, expect, it } from "vitest";
import { toCsv } from "../src/lib/csv-exporter";
import type { Repo } from "../src/lib/types";

function repo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: "R_1",
    owner: "acme",
    name: "tool",
    fullName: "acme/tool",
    url: "https://github.com/acme/tool",
    description: "A tool",
    language: "Rust",
    topics: ["cli", "fast"],
    stars: 42,
    updatedAt: "2026-01-02T00:00:00Z",
    starredAt: "2026-01-03T00:00:00Z",
    lists: ["Tools"],
    readme: "# tool",
    ...overrides,
  };
}

describe("toCsv", () => {
  it("writes a header and one row per repo, in the order of COLUMNS", () => {
    const csv = toCsv([repo()], ["url", "owner", "stars"]);

    expect(csv).toBe(
      "Owner,Stars,URL\r\nacme,42,https://github.com/acme/tool\r\n",
    );
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = toCsv(
      [repo({ description: 'say "hi", twice\nthen stop' })],
      ["description"],
    );

    expect(csv).toBe('Description\r\n"say ""hi"", twice\nthen stop"\r\n');
  });

  it("joins topics and lists with semicolons so the row keeps its columns", () => {
    const csv = toCsv([repo()], ["topics", "lists"]);

    expect(csv).toBe("Topics,Lists\r\ncli;fast,Tools\r\n");
  });

  it("writes missing values as empty cells", () => {
    const csv = toCsv(
      [repo({ description: null, language: null, readme: null })],
      ["description", "language", "readme"],
    );

    expect(csv).toBe("Description,Language,README\r\n,,\r\n");
  });

  it("defuses cells a spreadsheet would run as a formula", () => {
    const csv = toCsv(
      [repo({ description: '=HYPERLINK("http://evil")' })],
      ["description"],
    );

    expect(csv).toBe('Description\r\n"\'=HYPERLINK(""http://evil"")"\r\n');
  });

  it("ignores an unknown column id", () => {
    expect(toCsv([repo()], ["stars", "nope"])).toBe("Stars\r\n42\r\n");
  });
});
