import type { Store, SyncMeta } from "./db";
import { type GitHubClient, RateLimitError } from "./github";
import { type StarredSource, sourceFor } from "./sources";
import type { Repo } from "./types";

/** Inside this window after a sync the cache is served without any request. */
export const FRESH_MS = 5 * 60_000;
/** A sync older than this rewrites every repo, which also catches unstars. */
export const FULL_REFRESH_MS = 7 * 24 * 60 * 60_000;

export type SyncResult =
  | { status: "fresh" | "unchanged" | "busy" | "cancelled" | "cleared" }
  | { status: "synced"; fetched: number; removed: number }
  | { status: "rate-limited"; resetAt: number }
  | { status: "failed"; error: Error };

export interface SyncProgress {
  fetched: number;
  total: number;
}

export interface SyncOptions {
  client: GitHubClient;
  store: Store;
  login: string;
  /** How old the cache may be before a request is made. */
  maxAgeMs?: number;
  now?: () => number;
  signal?: AbortSignal;
  /** Called with repos as they arrive, so search can use them before the end. */
  onPage?: (repos: Repo[]) => void;
  onProgress?: (progress: SyncProgress) => void;
}

interface Run {
  store: Store;
  account: string;
  source: StarredSource;
  now: () => number;
  signal?: AbortSignal;
  onPage?: (repos: Repo[]) => void;
  onProgress?: (progress: SyncProgress) => void;
}

type Resume = NonNullable<SyncMeta["resume"]>;

const running = new Set<string>();

/**
 * Brings the cache up to date at the lowest request cost the policy allows:
 * nothing while fresh, one conditional request when nothing changed, only the
 * pages newer than the newest cached star after a new star, and a full pass
 * when the cache is new, unfinished, poorer than the source, or a week old.
 */
export function refresh(options: SyncOptions): Promise<SyncResult> {
  return exclusive(options, async (run) => {
    const meta = await run.store.loadMeta(run.account);
    if (!meta || needsFull(meta, run)) return fullSync(run, meta);

    const age = run.now() - meta.syncedAt;
    if (age < (options.maxAgeMs ?? FRESH_MS)) return { status: "fresh" };

    return incrementalSync(run, meta);
  });
}

/** Rewrites every cached repo and drops the ones no longer starred. */
export function fullResync(options: SyncOptions): Promise<SyncResult> {
  return exclusive(options, async (run) => {
    const meta = await run.store.loadMeta(run.account);
    return fullSync(run, meta && { ...meta, resume: null });
  });
}

/**
 * Deletes the cached repos and sync state of an account. It takes the sync
 * lock: a sync that kept running would write its next page and a stale resume
 * point over the empty cache, and mark an incomplete cache as finished.
 */
export function clearCache(options: SyncOptions): Promise<SyncResult> {
  return exclusive(options, async (run) => {
    await run.store.clear(run.account);
    return { status: "cleared" };
  });
}

/**
 * A cache written by one kind of source is not valid for the other. A token
 * that arrives needs READMEs and lists the cache lacks. A token that goes away
 * must not leave behind READMEs and lists that incremental syncs would no
 * longer keep current. Either way the whole cache is rewritten.
 */
function needsFull(meta: SyncMeta, run: Run): boolean {
  if (meta.resume) return true;
  if (meta.detail !== run.source.detail) return true;
  return run.now() - meta.fullAt > FULL_REFRESH_MS;
}

async function exclusive(
  options: SyncOptions,
  work: (run: Run) => Promise<SyncResult>,
): Promise<SyncResult> {
  const account = options.login.toLowerCase();
  const run: Run = {
    store: options.store,
    account,
    source: sourceFor(options.client, options.login),
    now: options.now ?? Date.now,
    signal: options.signal,
    onPage: options.onPage,
    onProgress: options.onProgress,
  };

  const settle = async (): Promise<SyncResult> => {
    try {
      return await work(run);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return { status: "rate-limited", resetAt: error.resetAt };
      }
      if (error instanceof Error && error.name === "AbortError") {
        return { status: "cancelled" };
      }
      return {
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };

  // Other tabs share the IndexedDB cache. Web Locks keep them from syncing the
  // same account at once. Where they are missing, only this tab is guarded.
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks) {
    return locks.request(
      `starred-sync:${account}`,
      { ifAvailable: true },
      (lock): Promise<SyncResult> =>
        lock ? settle() : Promise.resolve({ status: "busy" }),
    );
  }

  if (running.has(account)) return { status: "busy" };
  running.add(account);
  try {
    return await settle();
  } finally {
    running.delete(account);
  }
}

function emptyMeta(account: string): SyncMeta {
  return {
    account,
    syncedAt: 0,
    fullAt: 0,
    etag: null,
    total: 0,
    detail: "basic",
    gen: 0,
    resume: null,
  };
}

async function fullSync(run: Run, meta: SyncMeta | null): Promise<SyncResult> {
  const current = await dropTokenData(run, meta ?? emptyMeta(run.account));
  const resume = await startOrResume(run, current);
  let fetched = resume.fetched;
  let cursor = resume.cursor;

  do {
    const page = await run.source.page(cursor, run.signal);
    await run.store.saveRepos(run.account, page.repos, resume.gen);
    cursor = page.next;
    fetched += page.repos.length;
    await run.store.saveMeta({
      ...current,
      resume: { ...resume, cursor, fetched },
    });
    run.onPage?.(page.repos);
    run.onProgress?.({ fetched, total: resume.total });
  } while (cursor);

  await applyLists(run, resume.gen);
  const removed = await run.store.pruneBefore(run.account, resume.gen);

  const now = run.now();
  await run.store.saveMeta({
    account: run.account,
    syncedAt: now,
    fullAt: now,
    etag: resume.etag,
    total: resume.total,
    detail: run.source.detail,
    gen: resume.gen,
    resume: null,
  });
  return { status: "synced", fetched, removed };
}

/**
 * Without a token the cache must not keep what a token fetched. A full sync
 * overwrites repos page by page, so one that stops early would leave the repos
 * it has not reached with their READMEs and lists. They go first, before any
 * request, and the meta says `basic` from then on.
 */
async function dropTokenData(run: Run, meta: SyncMeta): Promise<SyncMeta> {
  if (run.source.detail !== "basic") return meta;

  await run.store.dropTokenData(run.account);
  if (meta.detail === "basic") return meta;

  const basic: SyncMeta = { ...meta, detail: "basic" };
  await run.store.saveMeta(basic);
  return basic;
}

/** A resume written by the other kind of source would misread its cursor. */
async function startOrResume(run: Run, meta: SyncMeta): Promise<Resume> {
  if (meta.resume && meta.resume.detail === run.source.detail) {
    return meta.resume;
  }

  const probe = await run.source.probe(null, run.signal);
  const resume: Resume = {
    gen: run.now(),
    detail: run.source.detail,
    cursor: null,
    etag: probe.etag,
    total: probe.total,
    fetched: 0,
  };
  await run.store.saveMeta({ ...meta, resume });
  return resume;
}

async function incrementalSync(run: Run, meta: SyncMeta): Promise<SyncResult> {
  const probe = await run.source.probe(meta.etag, run.signal);
  if (!probe.changed) {
    await applyLists(run, meta.gen);
    await run.store.saveMeta({ ...meta, syncedAt: run.now() });
    return { status: "unchanged" };
  }

  const known = new Map(
    (await run.store.loadRepos(run.account)).map((repo) => [repo.id, repo]),
  );
  const newer: Repo[] = [];
  let newIds = 0;
  let cursor: string | null = null;
  let reachedKnown = false;

  while (!reachedKnown) {
    const page = await run.source.page(cursor, run.signal);
    const fresh: Repo[] = [];
    for (const repo of page.repos) {
      const cached = known.get(repo.id);
      if (cached?.starredAt === repo.starredAt) {
        reachedKnown = true;
        break;
      }
      if (!cached) newIds++;
      fresh.push(repo);
    }

    newer.push(...fresh);
    run.onPage?.(fresh);
    run.onProgress?.({ fetched: newer.length, total: newer.length });

    cursor = page.next;
    if (!cursor) break;
  }

  // The newer stars are stored together after the walk. Storing a page early
  // would make the next run stop at it and never fetch the pages behind it.
  await run.store.saveRepos(run.account, newer, meta.gen);

  // The count disagrees with what the cache implies, so something was
  // unstarred. Only a full pass can tell which repos.
  if (probe.total !== meta.total + newIds) return fullSync(run, meta);

  await applyLists(run, meta.gen);
  await run.store.saveMeta({
    ...meta,
    etag: probe.etag,
    total: probe.total,
    syncedAt: run.now(),
  });
  return { status: "synced", fetched: newer.length, removed: 0 };
}

async function applyLists(run: Run, gen: number): Promise<void> {
  if (run.source.detail !== "full") return;

  const membership = await run.source.lists(run.signal);
  const changed: Repo[] = [];
  for (const repo of await run.store.loadRepos(run.account)) {
    const lists = membership.get(repo.id) ?? [];
    if (lists.join("\n") !== repo.lists.join("\n")) {
      changed.push({ ...repo, lists });
    }
  }
  if (changed.length === 0) return;

  await run.store.saveRepos(run.account, changed, gen);
  run.onPage?.(changed);
}
