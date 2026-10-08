import { promiseCache } from "./cache.js";
import { parseGviz, type Table } from "./gviz.js";
import { ApiError, fetchGoogle } from "./http.js";

export interface SheetRef {
  origin: string;
  id: string;
  gid: string | null;
}

export function parseSheetUrl(value: string | undefined): SheetRef {
  if (!value?.trim()) {
    throw new ApiError(
      503,
      "not_configured",
      "Falta la variable SHEET_URL con la dirección del Sheet.",
    );
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ApiError(503, "bad_config", "SHEET_URL no es una dirección.");
  }
  if (/^\/spreadsheets\/d\/e\//.test(url.pathname)) {
    throw new ApiError(
      503,
      "bad_config",
      "SHEET_URL debe ser la dirección de edición del Sheet, no la de «Publicar en la web».",
    );
  }
  const id = /^\/spreadsheets\/(?:u\/\d+\/)?d\/([\w-]+)/.exec(
    url.pathname,
  )?.[1];
  if (!id) {
    throw new ApiError(
      503,
      "bad_config",
      "SHEET_URL no tiene el formato https://docs.google.com/spreadsheets/d/…",
    );
  }
  const gid =
    url.searchParams.get("gid") ?? /gid=(\d+)/.exec(url.hash)?.[1] ?? null;
  return { origin: url.origin, id, gid };
}

const tables = promiseCache<Table>(20_000);

// Concurrent and repeated dashboard polls share one request to Google per
// TTL. A failed request is dropped so the next poll retries.
export function loadTable(ref: SheetRef): Promise<Table> {
  return tables.get(`${ref.origin}/${ref.id}/${ref.gid}`, () =>
    fetchTable(ref),
  );
}

export const clearSheetCache = tables.clear;

async function fetchTable({ origin, id, gid }: SheetRef) {
  const query = new URLSearchParams({ tqx: "out:json" });
  if (gid) query.set("gid", gid);
  const response = await fetchGoogle(
    `${origin}/spreadsheets/d/${id}/gviz/tq?${query}`,
  );
  const body = await response.text();
  return parseGviz(body);
}
