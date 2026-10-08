import { describe, expect, test } from "bun:test";
import { type Answer, classifyAnswer } from "../api/_lib/answers.ts";
import { buildAttendance } from "../api/_lib/attendance.ts";
import { parseGviz } from "../api/_lib/gviz.ts";
import { ApiError } from "../api/_lib/http.ts";
import { type FakeSheetColumn, FORM_COLUMNS, gviz } from "./google.ts";

const build = (
  rows: (string | number | null)[][],
  columns: FakeSheetColumn[] = FORM_COLUMNS,
) => buildAttendance(parseGviz(gviz(columns, rows)));

describe("classifyAnswer", () => {
  test.each<[string, Answer]>([
    ["Sí", "yes"],
    ["si", "yes"],
    ["SÍ", "yes"],
    ["Sí, asistiré", "yes"],
    ["Yes", "yes"],
    ["No", "no"],
    ["no", "no"],
    ["No podré ir", "no"],
    ["Sin respuesta", "other"],
    ["Quizás", "other"],
    ["", "other"],
    ["Nosotros iremos", "other"],
  ])("%p is %p", (text, expected) => {
    expect(classifyAnswer(text)).toBe(expected);
  });
});

describe("buildAttendance", () => {
  test("counts a Google Forms sheet", () => {
    const { entries, summary } = build([
      ["Date(2026,8,2,9,0,0)", "Ana Pérez", "Sí"],
      ["Date(2026,8,2,9,5,0)", "Luis Soto", "No"],
      ["Date(2026,8,2,9,9,0)", "Rosa Díaz", "Sí"],
    ]);
    expect(summary).toEqual({
      people: 3,
      yes: 2,
      no: 1,
      other: 0,
      submissions: 3,
      replaced: 0,
    });
    expect(entries.map((e) => e.name)).toEqual([
      "Rosa Díaz",
      "Luis Soto",
      "Ana Pérez",
    ]);
    expect(entries[2]?.at).toBe("2026-09-02T09:00:00");
  });

  test("keeps the latest answer per person, whatever the row order", () => {
    const { entries, summary } = build([
      ["Date(2026,8,2,10,0,0)", "Ana Pérez", "No"],
      ["Date(2026,8,2,9,0,0)", "ana  pérez", "Sí"],
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.answer).toBe("no");
    expect(summary).toMatchObject({ people: 1, no: 1, yes: 0, replaced: 1 });
  });

  test("treats accents and case as the same person", () => {
    const { summary } = build([
      ["Date(2026,8,2,9,0,0)", "María López", "Sí"],
      ["Date(2026,8,2,9,1,0)", "MARIA LOPEZ", "Sí"],
    ]);
    expect(summary.people).toBe(1);
  });

  test("lets the later row win when no timestamp exists", () => {
    const { entries } = build(
      [
        ["Ana", "Sí"],
        ["Ana", "No"],
      ],
      [
        { label: "Nombre", type: "string" },
        { label: "Asistencia", type: "string" },
      ],
    );
    expect(entries.map((e) => e.answer)).toEqual(["no"]);
  });

  test("skips empty rows and keeps unnamed answers as separate entries", () => {
    const { entries, summary } = build([
      [null, null, null],
      ["Date(2026,8,2,9,0,0)", null, "Sí"],
      ["Date(2026,8,2,9,1,0)", null, "Sí"],
    ]);
    expect(entries).toHaveLength(2);
    expect(summary).toMatchObject({ people: 2, submissions: 2, yes: 2 });
  });

  test("reports answers that are neither yes nor no", () => {
    const { entries, summary } = build([
      ["Date(2026,8,2,9,0,0)", "Ana", "Tal vez"],
    ]);
    expect(entries[0]).toMatchObject({ answer: "other", text: "Tal vez" });
    expect(summary.other).toBe(1);
  });

  test("finds columns by type and label when the form is reordered", () => {
    const { entries } = build(
      [["Sí", "Date(2026,8,2,9,0,0)", "Ana"]],
      [
        { label: "¿Asistirás?", type: "string" },
        { label: "Timestamp", type: "datetime" },
        { label: "Your name", type: "string" },
      ],
    );
    expect(entries[0]).toMatchObject({
      name: "Ana",
      answer: "yes",
      at: "2026-09-02T09:00:00",
    });
  });

  test("falls back to column order when labels say nothing", () => {
    const { entries } = build(
      [["Date(2026,8,2,9,0,0)", "Ana", "Sí"]],
      [
        { label: "Marca temporal", type: "datetime" },
        { label: "Pregunta 1", type: "string" },
        { label: "Pregunta 2", type: "string" },
      ],
    );
    expect(entries[0]).toMatchObject({ name: "Ana", answer: "yes" });
  });

  test("ignores the blank padding columns Google appends", () => {
    const { summary } = build(
      [["Date(2026,8,2,9,0,0)", "Ana", "Sí", null, null]],
      [
        ...FORM_COLUMNS,
        { label: "", type: "string" },
        { label: "", type: "string" },
      ],
    );
    expect(summary.yes).toBe(1);
  });

  test("returns an empty result for a sheet with only headers", () => {
    const { entries, summary } = build([]);
    expect(entries).toEqual([]);
    expect(summary.people).toBe(0);
  });

  test("fails with a readable code when a name or answer column is missing", () => {
    try {
      build(
        [["Date(2026,8,2,9,0,0)", "Ana"]],
        [
          { label: "Marca temporal", type: "datetime" },
          { label: "Nombre", type: "string" },
        ],
      );
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("columns");
    }
  });
});
