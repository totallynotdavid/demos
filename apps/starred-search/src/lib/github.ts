export type Resource = "core" | "graphql";

export interface RateLimit {
  limit: number;
  remaining: number;
  /** Epoch milliseconds. */
  resetAt: number;
}

export interface RequestStats {
  /** Requests GitHub counted against a rate limit. */
  counted: number;
  /** 304 responses to an authorized request. GitHub does not count them. */
  free: number;
  /** Requests refused locally because a limit was already exhausted. */
  skipped: number;
}

export interface ClientSnapshot {
  limits: Record<Resource, RateLimit | null>;
  stats: RequestStats;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class RateLimitError extends ApiError {
  constructor(
    readonly resource: Resource,
    readonly resetAt: number,
  ) {
    super(429, `GitHub ${resource} rate limit reached`);
    this.name = "RateLimitError";
  }
}

export interface RestResponse {
  status: 200 | 304;
  body: unknown;
  etag: string | null;
  /** Page number of `rel="last"` in the Link header, if any. */
  lastPage: number | null;
  hasNext: boolean;
}

export interface RestOptions {
  etag?: string | null;
  accept?: string;
  signal?: AbortSignal;
}

interface ClientOptions {
  token?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  now?: () => number;
}

const DEFAULT_BASE_URL = "https://api.github.com";

const RATE_LIMITED_TYPE = "RATE_LIMITED";

export class GitHubClient {
  private readonly token?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly listeners = new Set<() => void>();
  private snapshot: ClientSnapshot = {
    limits: { core: null, graphql: null },
    stats: { counted: 0, free: 0, skipped: 0 },
  };

  constructor(options: ClientOptions = {}) {
    this.token = options.token || undefined;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetch ?? ((...args) => fetch(...args));
    this.now = options.now ?? Date.now;
  }

  get hasToken(): boolean {
    return this.token !== undefined;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ClientSnapshot => this.snapshot;

  async rest(path: string, options: RestOptions = {}): Promise<RestResponse> {
    const headers: Record<string, string> = {
      Accept: options.accept ?? "application/vnd.github+json",
    };
    if (options.etag) headers["If-None-Match"] = options.etag;

    const response = await this.send(
      "core",
      `${this.baseUrl}${path}`,
      { headers, signal: options.signal },
      options.etag ? [304] : [],
    );

    if (response.status === 304) {
      return {
        status: 304,
        body: null,
        etag: options.etag ?? null,
        lastPage: null,
        hasNext: false,
      };
    }

    const link = response.headers.get("link") ?? "";
    const last = /[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(link);
    return {
      status: 200,
      body: await response.json(),
      etag: response.headers.get("etag"),
      lastPage: last ? Number(last[1]) : null,
      hasNext: /rel="next"/.test(link),
    };
  }

  async graphql<T>(
    query: string,
    variables: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (!this.token) throw new ApiError(401, "GraphQL needs a token");

    const response = await this.send("graphql", `${this.baseUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal,
    });

    const payload: {
      data?: T;
      errors?: { type?: string; message: string }[];
    } = await response.json();

    const errors = payload.errors ?? [];
    if (errors.some((error) => error.type === RATE_LIMITED_TYPE)) {
      throw new RateLimitError("graphql", this.resetOf("graphql"));
    }
    if (!payload.data) {
      const first = errors[0];
      throw new ApiError(
        first?.type === "NOT_FOUND" ? 404 : 502,
        first?.message ?? "Empty GraphQL response",
      );
    }
    return payload.data;
  }

  private async send(
    resource: Resource,
    url: string,
    init: RequestInit,
    acceptedStatuses: number[] = [],
  ): Promise<Response> {
    this.refuseWhileExhausted(resource);

    const headers = new Headers(init.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);

    let response: Response;
    try {
      response = await this.fetchImpl(url, { ...init, headers });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new ApiError(0, "Could not reach GitHub");
    }

    this.record(resource, response);

    if (response.ok || acceptedStatuses.includes(response.status)) {
      return response;
    }
    throw await this.errorFor(resource, response);
  }

  /** Throws without sending when the last response said no requests remain. */
  private refuseWhileExhausted(resource: Resource) {
    const limit = this.snapshot.limits[resource];
    if (!limit || limit.remaining > 0 || limit.resetAt <= this.now()) return;

    this.update((snapshot) => ({
      ...snapshot,
      stats: { ...snapshot.stats, skipped: snapshot.stats.skipped + 1 },
    }));
    throw new RateLimitError(resource, limit.resetAt);
  }

  private record(resource: Resource, response: Response) {
    const limit = Number(response.headers.get("x-ratelimit-limit"));
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    const known = limit > 0 && remaining !== null && reset > 0;

    this.update((snapshot) => ({
      limits: known
        ? {
            ...snapshot.limits,
            [resource]: {
              limit,
              remaining: Number(remaining),
              resetAt: reset * 1000,
            },
          }
        : snapshot.limits,
      stats: this.isFree(response)
        ? { ...snapshot.stats, free: snapshot.stats.free + 1 }
        : { ...snapshot.stats, counted: snapshot.stats.counted + 1 },
    }));
  }

  /** GitHub exempts a 304 from the limit only for an authorized request. */
  private isFree(response: Response): boolean {
    return response.status === 304 && this.token !== undefined;
  }

  private async errorFor(
    resource: Resource,
    response: Response,
  ): Promise<ApiError> {
    const body: { message?: string } = await response.json().catch(() => ({}));
    const message = body.message ?? response.statusText;

    const limited =
      (response.status === 403 || response.status === 429) &&
      (response.headers.get("x-ratelimit-remaining") === "0" ||
        response.headers.has("retry-after") ||
        /rate limit/i.test(message));
    if (limited) {
      const resetAt = this.resetOf(resource, response);
      this.exhaust(resource, resetAt);
      return new RateLimitError(resource, resetAt);
    }

    if (response.status === 401) return new ApiError(401, "Bad credentials");
    if (response.status === 404) return new ApiError(404, "Not found");
    return new ApiError(response.status, message);
  }

  /** A secondary limit carries Retry-After and leaves `remaining` above zero. */
  private exhaust(resource: Resource, resetAt: number) {
    this.update((snapshot) => {
      const current = snapshot.limits[resource];
      return {
        ...snapshot,
        limits: {
          ...snapshot.limits,
          [resource]: { limit: current?.limit ?? 0, remaining: 0, resetAt },
        },
      };
    });
  }

  private resetOf(resource: Resource, response?: Response): number {
    const retryAfter = Number(response?.headers.get("retry-after"));
    if (retryAfter > 0) return this.now() + retryAfter * 1000;
    return this.snapshot.limits[resource]?.resetAt ?? this.now() + 60_000;
  }

  private update(change: (snapshot: ClientSnapshot) => ClientSnapshot) {
    this.snapshot = change(this.snapshot);
    for (const listener of this.listeners) listener();
  }
}
