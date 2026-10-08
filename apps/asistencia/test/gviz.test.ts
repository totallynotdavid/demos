import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dateLiteralToLocal, parseGviz } from "../api/_lib/gviz.ts";
import { ApiError } from "../api/_lib/http.ts";
import { FORM_COLUMNS, gviz } from "./google.ts";

describe("dateLiteralToLocal", () => {
  test("shifts the zero-based month and pads every field", () => {
    expect(dateLiteralToLocal("Date(2026,8,2,14,3,22)")).toBe(
      "2026-09-02T14:03:22",
    );
    expect(dateLiteralToLocal("Date(2026,0,5)")).toBe("2026-01-05T00:00:00");
  });

  test("ignores a milliseconds field", () => {
    expect(dateLiteralToLocal("Date(2026,11,31,23,59,59,120)")).toBe(
      "2026-12-31T23:59:59",
    );
  });

  test("returns null for text that is not a date literal", () => {
    expect(dateLiteralToLocal("2/09/2026")).toBeNull();
  });
});

describe("parseGviz", () => {
  test("reads a response captured from Google", () => {
    const table = parseGviz(
      readFileSync(
        new URL("./fixtures/gviz-real.txt", import.meta.url),
        "utf8",
      ),
    );
    expect(table.columns.slice(0, 2)).toEqual([
      { label: "Date", type: "date" },
      { label: "Name", type: "string" },
    ]);
    expect(table.rows[0]?.[0]).toEqual({
      value: "2021-10-01T00:00:00",
      text: "10/1/2021",
    });
    expect(table.rows[1]?.[1]?.value).toBe("አማርኛ");
  });

  test("turns missing cells into nulls", () => {
    const table = parseGviz(
      gviz(FORM_COLUMNS, [["Date(2026,8,2,9,0,0)", "Ana", null]]),
    );
    expect(table.rows[0]?.[2]).toEqual({ value: null, text: null });
  });

  test("pads a short row to the column count", () => {
    const table = parseGviz(
      `setResponse(${JSON.stringify({
        status: "ok",
        table: {
          cols: FORM_COLUMNS,
          rows: [{ c: [{ v: "Date(2026,8,2,9,0,0)" }, { v: "Ana" }] }],
        },
      })});`,
    );
    expect(table.rows[0]).toHaveLength(3);
    expect(table.rows[0]?.[2]?.value).toBeNull();
  });

  test("rejects the HTML page Google serves for a private sheet", () => {
    const fail = () => parseGviz("<!doctype html><title>Acceso</title>");
    expect(fail).toThrow(ApiError);
    try {
      fail();
    } catch (error) {
      expect((error as ApiError).code).toBe("sheet_unreachable");
    }
  });

  test("reports an access_denied status as an unreachable sheet", () => {
    const body = `google.visualization.Query.setResponse(${JSON.stringify({
      status: "error",
      errors: [{ reason: "access_denied", message: "Sin acceso" }],
    })});`;
    try {
      parseGviz(body);
      throw new Error("expected a throw");
    } catch (error) {
      expect((error as ApiError).code).toBe("sheet_unreachable");
    }
  });
});
