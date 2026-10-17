import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { attendance, form, register } from "../api/_lib/handlers.ts";
import { parseSheetUrl } from "../api/_lib/sheet.ts";
import { FORM_COLUMNS, gviz, startFakeGoogle } from "./google.ts";

const google = startFakeGoogle();
afterAll(() => google.stop());

const FORM_URL = () => `${google.origin}/forms/d/e/FORM/viewform`;
const sheetUrl = (id: string, suffix = "/edit?gid=0#gid=0") =>
  `${google.origin}/spreadsheets/d/${id}${suffix}`;

const get = (path = "/") => new Request(`http://app.test${path}`);
const post = (body: unknown) =>
  new Request("http://app.test/api/register", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const sheetHits = (id: string) =>
  google.hits.filter((hit) => hit.path === `/spreadsheets/d/${id}/gviz/tq`);

interface Body {
  code?: string;
  title?: string;
  heading?: string;
  details?: string[];
  updatedAt: string;
  summary: Record<string, number>;
  entries: { name: string; answer: string }[];
}

async function readJson(response: Response) {
  return (await response.json()) as Body;
}

describe("parseSheetUrl", () => {
  test.each([
    [
      "https://docs.google.com/spreadsheets/d/1AbC_d-EF/edit?gid=123#gid=123",
      { id: "1AbC_d-EF", gid: "123" },
    ],
    ["https://docs.google.com/spreadsheets/d/abc/edit#gid=77", { gid: "77" }],
    [
      "https://docs.google.com/spreadsheets/u/1/d/abc/edit",
      { id: "abc", gid: null },
    ],
  ])("accepts %p", (value, expected) => {
    expect(parseSheetUrl(value)).toMatchObject({
      origin: "https://docs.google.com",
      ...expected,
    });
  });

  test.each([
    [undefined, "not_configured"],
    ["  ", "not_configured"],
    ["not a url", "bad_config"],
    ["https://docs.google.com/document/d/abc/edit", "bad_config"],
    [
      "https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?output=csv",
      "bad_config",
    ],
  ])("rejects %p as %p", (value, code) => {
    try {
      parseSheetUrl(value);
      throw new Error("expected a throw");
    } catch (error) {
      expect((error as { code?: string }).code).toBe(code);
    }
  });
});

describe("GET /api/attendance", () => {
  test("answers 503 not_configured without SHEET_URL", async () => {
    const response = await attendance(get(), {});
    expect(response.status).toBe(503);
    expect((await readJson(response)).code).toBe("not_configured");
  });

  test("returns the summary and entries of the linked sheet", async () => {
    google.sheets.set("ok", {
      status: 200,
      body: gviz(FORM_COLUMNS, [
        ["Date(2026,8,2,9,0,0)", "Ana Pérez", "Sí"],
        ["Date(2026,8,2,9,5,0)", "Luis Soto", "No"],
      ]),
    });
    const response = await attendance(get(), { SHEET_URL: sheetUrl("ok") });
    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ people: 2, yes: 1, no: 1 });
    expect(body.entries[0]).toMatchObject({ name: "Luis Soto", answer: "no" });
    expect(Number.isNaN(Date.parse(body.updatedAt))).toBe(false);
    expect(sheetHits("ok")[0]?.query).toBe("?tqx=out%3Ajson&gid=0");
  });

  test("shares one request to Google between repeated polls", async () => {
    google.sheets.set("burst", {
      status: 200,
      body: gviz(FORM_COLUMNS, []),
    });
    const env = { SHEET_URL: sheetUrl("burst") };
    await Promise.all([attendance(get(), env), attendance(get(), env)]);
    await attendance(get(), env);
    expect(sheetHits("burst")).toHaveLength(1);
  });

  test("does not cache a failure, so the next poll retries", async () => {
    const env = { SHEET_URL: sheetUrl("flaky") };
    const failed = await attendance(get(), env);
    expect(failed.status).toBe(502);

    google.sheets.set("flaky", { status: 200, body: gviz(FORM_COLUMNS, []) });
    const recovered = await attendance(get(), env);
    expect(recovered.status).toBe(200);
  });

  test("reports a private sheet as sheet_unreachable", async () => {
    google.sheets.set("private", {
      status: 200,
      body: "<!doctype html><title>Iniciar sesión</title>",
    });
    const response = await attendance(get(), {
      SHEET_URL: sheetUrl("private"),
    });
    expect(response.status).toBe(502);
    expect((await readJson(response)).code).toBe("sheet_unreachable");
  });

  test("reports a sheet without name and answer columns", async () => {
    google.sheets.set("narrow", {
      status: 200,
      body: gviz([{ label: "Nombre", type: "string" }], [["Ana"]]),
    });
    const response = await attendance(get(), {
      SHEET_URL: sheetUrl("narrow"),
    });
    expect(response.status).toBe(422);
    expect((await readJson(response)).code).toBe("columns");
  });

  test("requires DASHBOARD_KEY as a bearer token when set", async () => {
    google.sheets.set("keyed", { status: 200, body: gviz(FORM_COLUMNS, []) });
    const env = { SHEET_URL: sheetUrl("keyed"), DASHBOARD_KEY: "s3cret" };

    expect((await attendance(get(), env)).status).toBe(401);
    const wrong = new Request("http://app.test/", {
      headers: { authorization: "Bearer nope" },
    });
    expect((await attendance(wrong, env)).status).toBe(401);
    const right = new Request("http://app.test/", {
      headers: { authorization: "Bearer s3cret" },
    });
    expect((await attendance(right, env)).status).toBe(200);
  });
});

describe("GET /api/form", () => {
  test("describes the event from the form description", async () => {
    const response = await form(get(), { FORM_URL: FORM_URL() });
    const body = await readJson(response);
    expect(response.status).toBe(200);
    expect(body.title).toBe("Registro de asistencia");
    expect(body.heading).toStartWith("Humanización, tecnología y ética");
    expect(body.details).toEqual([
      "02 de setiembre de 2026",
      "Auditorio Cayetano Heredia",
    ]);
  });

  test("follows a short link to the form", async () => {
    const response = await form(get(), { FORM_URL: `${google.origin}/short` });
    expect(response.status).toBe(200);
  });

  test("answers 503 not_configured without FORM_URL", async () => {
    const response = await form(get(), {});
    expect((await readJson(response)).code).toBe("not_configured");
  });

  test("reports a form Google cannot open", async () => {
    const response = await form(get(), {
      FORM_URL: `${google.origin}/forms/d/e/GONE/viewform`,
    });
    expect(response.status).toBe(502);
    expect((await readJson(response)).code).toBe("form_unreachable");
  });
});

describe("POST /api/register", () => {
  beforeAll(() => {
    google.submissions.length = 0;
  });

  test("submits the discovered entries with the form's own option text", async () => {
    const env = { FORM_URL: FORM_URL() };
    const yes = await register(
      post({ name: "Ana Pérez", attendance: "yes" }),
      env,
    );
    const no = await register(
      post({ name: "Luis Soto", attendance: "no" }),
      env,
    );
    expect(yes.status).toBe(200);
    expect(no.status).toBe(200);
    expect(google.submissions.map((s) => Object.fromEntries(s))).toEqual([
      { "entry.856162853": "Ana Pérez", "entry.51289651": "Sí" },
      { "entry.856162853": "Luis Soto", "entry.51289651": "No" },
    ]);
  });

  test("trims and collapses the name", async () => {
    google.submissions.length = 0;
    await register(post({ name: "  Ana   Pérez ", attendance: "yes" }), {
      FORM_URL: FORM_URL(),
    });
    expect(google.submissions[0]?.get("entry.856162853")).toBe("Ana Pérez");
  });

  test.each([
    [{ attendance: "yes" }, "name"],
    [{ name: "   ", attendance: "yes" }, "name"],
    [{ name: "x".repeat(121), attendance: "yes" }, "name"],
    [{ name: "Ana", attendance: "Sí" }, "attendance"],
    [{ name: "Ana" }, "attendance"],
    ["not json", "name"],
  ])("rejects %p with code %p and sends nothing", async (body, code) => {
    google.submissions.length = 0;
    const response = await register(post(body), { FORM_URL: FORM_URL() });
    expect(response.status).toBe(400);
    expect((await readJson(response)).code).toBe(code);
    expect(google.submissions).toHaveLength(0);
  });

  test("reports 502 form_rejected when Google refuses the answer", async () => {
    google.failSubmissions(400);
    const response = await register(post({ name: "Ana", attendance: "yes" }), {
      FORM_URL: FORM_URL(),
    });
    google.failSubmissions(200);
    expect(response.status).toBe(502);
    expect((await readJson(response)).code).toBe("form_rejected");
  });
});

describe("a request with the wrong method", () => {
  test.each([
    ["POST to /api/attendance", attendance, post({})],
    ["POST to /api/form", form, post({})],
    ["GET to /api/register", register, get()],
  ])("%s answers 405", async (_route, handler, request) => {
    const response = await handler(request, { FORM_URL: FORM_URL() });
    expect(response.status).toBe(405);
  });
});
