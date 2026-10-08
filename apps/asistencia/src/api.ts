export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// A non-JSON body (a platform error page, a dev server without the API) is
// reported as code "network" like an unreachable server, because the user
// can do the same thing about both: try again later.
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiFailure(0, "network", "Sin conexión.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new ApiFailure(
      response.status,
      body?.code ?? "network",
      body?.message ?? "No se pudo completar la solicitud.",
    );
  }
  return body as T;
}

export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}
