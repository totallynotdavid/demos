import { classifyAnswer } from "./answers.js";
import { promiseCache } from "./cache.js";
import { ApiError, fetchGoogle } from "./http.js";

export interface FormInfo {
  title: string;
  // First line of the form description, then the remaining lines.
  heading: string;
  details: string[];
  action: string;
  nameEntry: string;
  attendanceEntry: string;
  yesOption: string;
  noOption: string;
}

const SHORT_TEXT = 0;
const MULTIPLE_CHOICE = 2;
const DROPDOWN = 3;

type Json = unknown[];

const unreadable = () =>
  new ApiError(
    502,
    "form_unreadable",
    "No se pudieron leer las preguntas del formulario. Debe tener una pregunta de respuesta corta (nombre) y una de opción múltiple (Sí / No).",
  );

// The viewer page embeds the whole form as a JSON literal. Item layout:
// [id, title, help, type, [[entryId, options, required]]].
function loadData(html: string): Json {
  const literal =
    /FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/.exec(html);
  if (!literal?.[1]) throw unreadable();
  try {
    return JSON.parse(literal[1]) as Json;
  } catch {
    throw unreadable();
  }
}

export function parseFormPage(html: string, finalUrl: string): FormInfo {
  const base =
    /^(https?:\/\/[^/]+\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[\w-]+)/.exec(
      finalUrl,
    )?.[1];
  const data = loadData(html);
  const meta = data[1] as Json | undefined;
  const items = meta?.[1] as Json[] | undefined;
  if (!base || !Array.isArray(items)) throw unreadable();

  const question = (types: number[]) => {
    const item = items.find((i) => types.includes(i[3] as number));
    const field = (item?.[4] as Json[] | undefined)?.[0];
    return field ? { entry: String(field[0]), options: field[1] } : null;
  };
  const name = question([SHORT_TEXT]);
  const attendance = question([MULTIPLE_CHOICE, DROPDOWN]);
  if (!name || !attendance) throw unreadable();

  const options = ((attendance.options as Json[] | null) ?? []).map((o) =>
    String(o[0]),
  );
  const yesOption = options.find((o) => classifyAnswer(o) === "yes");
  const noOption = options.find((o) => classifyAnswer(o) === "no");
  if (!yesOption || !noOption) {
    throw new ApiError(
      502,
      "form_unreadable",
      "La pregunta de asistencia debe tener las opciones «Sí» y «No».",
    );
  }

  // meta[8] is the title shown to respondents. data[3] is the Drive file name,
  // which Google prefixes with "Copy of" for duplicated forms.
  const title = String(meta?.[8] ?? data[3] ?? "").trim();
  const lines = String(meta?.[0] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    title,
    heading: lines[0] ?? title,
    details: lines.slice(1),
    action: `${base}/formResponse`,
    nameEntry: `entry.${name.entry}`,
    attendanceEntry: `entry.${attendance.entry}`,
    yesOption,
    noOption,
  };
}

const forms = promiseCache<FormInfo>(5 * 60_000);

export function loadForm(formUrl: string | undefined): Promise<FormInfo> {
  const url = checkFormUrl(formUrl);
  return forms.get(url, () => fetchForm(url));
}

export const clearFormCache = forms.clear;

function checkFormUrl(value: string | undefined) {
  if (!value?.trim()) {
    throw new ApiError(
      503,
      "not_configured",
      "Falta la variable FORM_URL con el enlace del formulario.",
    );
  }
  try {
    return new URL(value.trim()).href;
  } catch {
    throw new ApiError(503, "bad_config", "FORM_URL no es una dirección.");
  }
}

// forms.gle links redirect to the viewer, so the final URL is what names the
// form.
async function fetchForm(url: string) {
  const response = await fetchGoogle(url, { redirect: "follow" });
  if (!response.ok) {
    throw new ApiError(
      502,
      "form_unreachable",
      "Google no abrió el formulario. Comprueba FORM_URL y que acepte respuestas.",
    );
  }
  return parseFormPage(await response.text(), response.url);
}

export async function submitAttendance(
  info: FormInfo,
  name: string,
  attended: boolean,
) {
  const body = new URLSearchParams({
    [info.nameEntry]: name,
    [info.attendanceEntry]: attended ? info.yesOption : info.noOption,
  });
  const response = await fetchGoogle(info.action, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new ApiError(
      502,
      "form_rejected",
      "Google no aceptó la respuesta. El formulario puede estar cerrado.",
    );
  }
}
