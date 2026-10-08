import { buildAttendance } from "./attendance.js";
import { loadForm, submitAttendance } from "./form.js";
import {
  ApiError,
  errorResponse,
  json,
  requireKey,
  requireMethod,
} from "./http.js";
import { loadTable, parseSheetUrl } from "./sheet.js";

// Reads SHEET_URL, FORM_URL and DASHBOARD_KEY.
export type Env = Record<string, string | undefined>;

type Handler = (request: Request, env: Env) => Promise<Response>;

// Turns every thrown ApiError into its JSON response and anything else into a
// 500, so a handler body only states the success path.
const guard =
  (handler: Handler): Handler =>
  async (request, env) => {
    try {
      return await handler(request, env);
    } catch (error) {
      return errorResponse(error);
    }
  };

export const attendance = guard(async (request, env) => {
  requireMethod(request, "GET");
  requireKey(request, env.DASHBOARD_KEY);
  const table = await loadTable(parseSheetUrl(env.SHEET_URL));
  return json(
    {
      ok: true,
      updatedAt: new Date().toISOString(),
      ...buildAttendance(table),
    },
    200,
    { "cache-control": "no-store" },
  );
});

export const form = guard(async (request, env) => {
  requireMethod(request, "GET");
  const info = await loadForm(env.FORM_URL);
  return json(
    {
      ok: true,
      title: info.title,
      heading: info.heading,
      details: info.details,
    },
    200,
    { "cache-control": "public, max-age=60, s-maxage=300" },
  );
});

const MAX_NAME = 120;

export const register = guard(async (request, env) => {
  requireMethod(request, "POST");
  const body = await request.json().catch(() => null);
  const name =
    typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  const answer = body?.attendance;
  if (!name || name.length > MAX_NAME) {
    throw new ApiError(400, "name", "Escribe tu nombre completo.");
  }
  if (answer !== "yes" && answer !== "no") {
    throw new ApiError(400, "attendance", "Elige una opción.");
  }
  await submitAttendance(await loadForm(env.FORM_URL), name, answer === "yes");
  return json({ ok: true }, 200, { "cache-control": "no-store" });
});
