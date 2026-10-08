import { timingSafeEqual } from "node:crypto";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      { ok: false, code: error.code, message: error.message },
      error.status,
      { "cache-control": "no-store" },
    );
  }
  console.error(error);
  return json(
    { ok: false, code: "internal", message: "Error inesperado." },
    500,
    { "cache-control": "no-store" },
  );
}

export function requireMethod(request: Request, method: "GET" | "POST") {
  if (request.method !== method) {
    throw new ApiError(405, "method", `Usa ${method}.`);
  }
}

// An unset key leaves the dashboard open. A set key must arrive as a bearer
// token. Only the key's length can leak through the length comparison.
export function requireKey(request: Request, key: string | undefined) {
  if (!key) return;
  const sent = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  const a = Buffer.from(sent ?? "");
  const b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ApiError(401, "unauthorized", "Falta la clave del panel.");
  }
}

export async function fetchGoogle(url: string, init: RequestInit = {}) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new ApiError(
      502,
      "google_unreachable",
      "No se pudo conectar con Google.",
    );
  }
}
