import type { Store } from "./db";
import { type GitHubClient, RateLimitError } from "./github";

export interface CachedGetOptions {
  key: string;
  path: string;
  maxAgeMs: number;
  now?: () => number;
  signal?: AbortSignal;
}

export interface CachedBody<T> {
  body: T;
  hasNext: boolean;
  stale: boolean;
}

interface Stored<T> {
  body: T;
  hasNext: boolean;
}

/**
 * A GET that remembers its answer. Within `maxAgeMs` it costs nothing. After
 * that it asks with If-None-Match, so an unchanged answer is a 304.
 */
export async function cachedGet<T>(
  client: GitHubClient,
  store: Store,
  options: CachedGetOptions,
): Promise<CachedBody<T>> {
  const now = options.now ?? Date.now;
  const entry = await store.loadHttp(options.key);
  const stored = entry?.body as Stored<T> | undefined;

  if (entry && stored && now() - entry.fetchedAt < options.maxAgeMs) {
    return { ...stored, stale: false };
  }

  try {
    const response = await client.rest(options.path, {
      etag: entry?.etag,
      signal: options.signal,
    });

    if (response.status === 304 && entry && stored) {
      await store.saveHttp(options.key, { ...entry, fetchedAt: now() });
      return { ...stored, stale: false };
    }

    const fresh: Stored<T> = {
      body: response.body as T,
      hasNext: response.hasNext,
    };
    if (response.etag) {
      await store.saveHttp(options.key, {
        etag: response.etag,
        body: fresh,
        fetchedAt: now(),
      });
    }
    return { ...fresh, stale: false };
  } catch (error) {
    if (error instanceof RateLimitError && stored) {
      return { ...stored, stale: true };
    }
    throw error;
  }
}
