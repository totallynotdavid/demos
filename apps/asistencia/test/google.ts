import { readFileSync } from "node:fs";

const formPage = readFileSync(
  new URL("./fixtures/form.html", import.meta.url),
  "utf8",
);

export interface FakeSheetColumn {
  label: string;
  type: "string" | "datetime" | "date" | "number";
}

// Builds the wire format Google's gviz endpoint returns for out:json.
export function gviz(
  columns: FakeSheetColumn[],
  rows: (string | number | null)[][],
) {
  const cols = columns.map((column, index) => ({
    id: String.fromCharCode(65 + index),
    ...column,
  }));
  const body = {
    version: "0.6",
    reqId: "0",
    status: "ok",
    sig: "1",
    table: {
      cols,
      rows: rows.map((row) => ({
        c: row.map((value) => (value === null ? null : { v: value })),
      })),
    },
  };
  return `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(body)});`;
}

export const FORM_COLUMNS: FakeSheetColumn[] = [
  { label: "Marca temporal", type: "datetime" },
  { label: "Nombres y apellidos", type: "string" },
  { label: "Confirma tu asistencia a la clase.", type: "string" },
];

export interface Hit {
  path: string;
  query: string;
  body: string;
}

// A local stand-in for docs.google.com. It answers the three requests the
// API makes: the form viewer page, the form submission and the gviz query.
export interface Served {
  status: number;
  // Delays the response until this promise settles.
  hold?: Promise<void>;
}

export function startFakeGoogle() {
  const sheets = new Map<string, Served & { body: string }>();
  // Viewer pages by form id, all serving the captured form. The id FORM is
  // always served; any other id answers 404 until it is set here.
  const forms = new Map<string, Served>();
  const submissions: URLSearchParams[] = [];
  const hits: Hit[] = [];
  let submitStatus = 200;

  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      hits.push({
        path: url.pathname,
        query: url.search,
        body: request.method === "POST" ? await request.clone().text() : "",
      });

      const viewer = /^\/forms\/d\/e\/([\w-]+)\/viewform$/.exec(url.pathname);
      const formId = viewer?.[1] ?? "";
      if (formId === "FORM" || forms.has(formId)) {
        const served = forms.get(formId);
        await served?.hold;
        return new Response(formPage, {
          status: served?.status ?? 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.pathname === "/short") {
        return Response.redirect(`${url.origin}/forms/d/e/FORM/viewform`, 302);
      }
      if (url.pathname === "/forms/d/e/FORM/formResponse") {
        submissions.push(new URLSearchParams(await request.text()));
        return new Response("ok", { status: submitStatus });
      }
      const sheet = /^\/spreadsheets\/d\/([\w-]+)\/gviz\/tq$/.exec(
        url.pathname,
      );
      const served = sheet?.[1] ? sheets.get(sheet[1]) : undefined;
      if (served) {
        await served.hold;
        return new Response(served.body, {
          status: served.status,
          headers: { "content-type": "application/javascript" },
        });
      }
      return new Response("<!doctype html><title>Error</title>", {
        status: 404,
        headers: { "content-type": "text/html" },
      });
    },
  });

  return {
    origin: server.url.origin,
    sheets,
    forms,
    submissions,
    hits,
    failSubmissions(status: number) {
      submitStatus = status;
    },
    stop: () => server.stop(true),
  };
}
