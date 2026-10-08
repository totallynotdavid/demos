import { ApiError } from "./http.js";

export interface Column {
  label: string;
  type: string;
}

export interface Cell {
  value: string | number | boolean | null;
  text: string | null;
}

export interface Table {
  columns: Column[];
  rows: Cell[][];
}

interface RawCell {
  v?: unknown;
  f?: unknown;
}

interface Payload {
  status?: string;
  errors?: { reason?: string; message?: string }[];
  table?: {
    cols: { label?: string; type?: string }[];
    rows: { c: (RawCell | null)[] }[];
  };
}

// Dates arrive as "Date(2026,8,2,14,3,22)" with a zero-based month, so no
// locale-dependent day/month order is involved. The result is a wall-clock
// "YYYY-MM-DDTHH:mm:ss" with no zone, because the sheet stores none.
const DATE_LITERAL = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/;

export function dateLiteralToLocal(value: string): string | null {
  const m = DATE_LITERAL.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m
    .slice(1)
    .map((part) => Number(part ?? 0));
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function parseGviz(body: string): Table {
  const start = body.indexOf("setResponse(");
  const end = body.lastIndexOf(")");
  if (start < 0 || end < start) {
    throw new ApiError(
      502,
      "sheet_unreachable",
      "Google no devolvió datos del Sheet. Comprueba la URL y que esté compartido con «Cualquier persona con el enlace».",
    );
  }
  let payload: Payload;
  try {
    payload = JSON.parse(body.slice(start + "setResponse(".length, end));
  } catch {
    throw new ApiError(
      502,
      "sheet_unreadable",
      "La respuesta de Google no se pudo leer.",
    );
  }
  if (payload.status !== "ok" || !payload.table) {
    const reason = payload.errors?.[0]?.reason;
    throw new ApiError(
      502,
      reason === "access_denied" ? "sheet_unreachable" : "sheet_unreadable",
      payload.errors?.[0]?.message ?? "Google rechazó la consulta.",
    );
  }

  const columns = payload.table.cols.map((col) => ({
    label: col.label ?? "",
    type: col.type ?? "string",
  }));
  const rows = payload.table.rows.map(({ c }) =>
    columns.map((column, index): Cell => {
      const raw = c[index];
      if (!raw || raw.v === null || raw.v === undefined) {
        return { value: null, text: null };
      }
      const isDate = column.type === "date" || column.type === "datetime";
      const value =
        isDate && typeof raw.v === "string"
          ? (dateLiteralToLocal(raw.v) ?? raw.v)
          : (raw.v as Cell["value"]);
      return { value, text: typeof raw.f === "string" ? raw.f : String(value) };
    }),
  );
  return { columns, rows };
}
