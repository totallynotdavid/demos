import type { Store, SyncMeta } from "./db";
import { ApiError, type GitHubClient } from "./github";
import { openStore } from "./shared-store";
import {
  clearCache,
  fullResync,
  refresh,
  type SyncOptions,
  type SyncProgress,
  type SyncResult,
} from "./sync";
import { type Repo, withoutTokenData } from "./types";

export type Problem =
  | { kind: "rate-limited"; resetAt: number }
  | { kind: "not-found" }
  | { kind: "bad-token" }
  | { kind: "network" }
  | { kind: "error"; message: string };

export interface SessionState {
  repos: Repo[];
  /** The cache has been read. Until then `repos` is empty without meaning it. */
  loaded: boolean;
  syncing: boolean;
  progress: SyncProgress | null;
  /** When the cache was last confirmed current. Null before the first sync ends. */
  syncedAt: number | null;
  /** `basic` has no READMEs or lists. They need a token. */
  detail: "basic" | "full" | null;
  /** How far an unfinished full sync got. The next run continues from there. */
  incomplete: SyncProgress | null;
  problem: Problem | null;
}

/**
 * `auto` honours the fresh window and the rate-limit pause. `check` is the user
 * asking, so it always asks GitHub. `resync` rewrites everything.
 */
export type Kind = "auto" | "check" | "resync";

export interface SessionOptions {
  login: string;
  client: GitHubClient;
  openStore?: () => Promise<Store>;
}

type Announcement = { key: string; event: "synced" | "cleared" };

const CHANNEL = "starred-search";
const BUSY_RETRY_MS = 1500;
/** Added to the reset time so the retry does not land a moment early. */
const RESET_MARGIN_MS = 1000;

export const INITIAL: SessionState = {
  repos: [],
  loaded: false,
  syncing: false,
  progress: null,
  syncedAt: null,
  detail: null,
  incomplete: null,
  problem: null,
};

/**
 * Without a token the page shows a cache as basic even if a token filled it.
 * The next sync strips it, and the page does not wait for that.
 */
function fromMeta(meta: SyncMeta | null, hasToken: boolean) {
  const detail = hasToken ? meta?.detail : meta && "basic";
  return {
    syncedAt: meta?.syncedAt ? meta.syncedAt : null,
    detail: detail ?? null,
    incomplete: meta?.resume
      ? { fetched: meta.resume.fetched, total: meta.resume.total }
      : null,
  };
}

export function problemOf(result: SyncResult): Problem | null {
  if (result.status === "rate-limited") {
    return { kind: "rate-limited", resetAt: result.resetAt };
  }
  if (result.status !== "failed") return null;

  const { error } = result;
  if (error instanceof ApiError) {
    if (error.status === 404) return { kind: "not-found" };
    if (error.status === 401) return { kind: "bad-token" };
    if (error.status === 0) return { kind: "network" };
  }
  return { kind: "error", message: error.message };
}

function mergeById(current: Repo[], incoming: Repo[]): Repo[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((repo) => [repo.id, repo]));
  for (const repo of incoming) byId.set(repo.id, repo);
  return [...byId.values()];
}

/**
 * What one page shows of one account's cache, and the only place that decides
 * when to sync it. Cache writes go through `refresh`, `fullResync` and
 * `clearCache`, which hold the sync lock. Other tabs are told through a
 * BroadcastChannel when a sync finishes or the cache is deleted.
 */
export class StarredSession {
  private state: SessionState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private readonly controller = new AbortController();
  private readonly key: string;
  private readonly open: () => Promise<Store>;
  private channel: BroadcastChannel | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pausedUntil = 0;
  private running = false;
  /** The cache was deleted on purpose. Only the user fills it again. */
  private cleared = false;

  constructor(private readonly options: SessionOptions) {
    this.key = options.login.toLowerCase();
    this.open = options.openStore ?? openStore;
  }

  readonly getState = (): SessionState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reads the cache, then brings it up to date as far as the policy allows. */
  start(): void {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (event) => this.onAnnouncement(event.data);
    }
    void this.load().then(() => this.sync("auto"));
  }

  dispose(): void {
    this.controller.abort();
    clearTimeout(this.timer);
    this.channel?.close();
  }

  /** The tab became visible again. */
  resume(): void {
    void this.sync("auto");
  }

  async sync(kind: Kind): Promise<void> {
    if (this.running || this.controller.signal.aborted) return;
    if (kind === "auto" && (this.cleared || Date.now() < this.pausedUntil)) {
      return;
    }
    if (kind !== "auto") this.cleared = false;

    this.running = true;
    this.set({ syncing: true, progress: null, problem: null });
    try {
      const result = await this.run(kind);
      if (this.controller.signal.aborted) return;
      await this.finish(result);
    } catch (error) {
      this.fail(error);
    } finally {
      this.running = false;
    }
  }

  /** Deletes the cache. False when a sync holds it. */
  async clear(): Promise<boolean> {
    try {
      const store = await this.open();
      const { client, login } = this.options;
      const result = await clearCache({ client, store, login });
      if (result.status !== "cleared") {
        this.set({
          problem: {
            kind: "error",
            message:
              "A sync is running, here or in another tab. Try again when it ends.",
          },
        });
        return false;
      }

      this.cleared = true;
      this.announce("cleared");
      this.update(() => ({ ...INITIAL, loaded: true }));
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  private async run(kind: Kind): Promise<SyncResult> {
    const store = await this.open();
    const options: SyncOptions = {
      client: this.options.client,
      store,
      login: this.options.login,
      signal: this.controller.signal,
      onPage: (page) =>
        this.update((state) => ({ repos: mergeById(state.repos, page) })),
      onProgress: (progress) => this.set({ progress }),
    };
    if (kind === "resync") return fullResync(options);
    return refresh({ ...options, maxAgeMs: kind === "check" ? 0 : undefined });
  }

  private async finish(result: SyncResult): Promise<void> {
    if (result.status === "busy") {
      // Another tab holds the lock. Look again soon and pick up its work.
      await this.read();
      this.set({ syncing: false });
      this.schedule(BUSY_RETRY_MS);
      return;
    }

    if (result.status === "rate-limited") {
      this.pausedUntil = result.resetAt;
      this.schedule(Math.max(0, result.resetAt - Date.now()) + RESET_MARGIN_MS);
    } else {
      this.pausedUntil = 0;
    }

    if (result.status === "synced" && result.removed > 0) await this.read();
    else {
      const meta = await (await this.open()).loadMeta(this.key);
      this.set(fromMeta(meta, this.options.client.hasToken));
    }

    this.set({ syncing: false, progress: null, problem: problemOf(result) });
    if (result.status === "synced") this.announce("synced");
  }

  private async read(): Promise<void> {
    const store = await this.open();
    const [repos, meta] = await Promise.all([
      store.loadRepos(this.key),
      store.loadMeta(this.key),
    ]);
    if (this.controller.signal.aborted) return;
    const { hasToken } = this.options.client;
    this.set({
      repos: hasToken ? repos : repos.map(withoutTokenData),
      loaded: true,
      ...fromMeta(meta, hasToken),
    });
  }

  /** `read` for callers with nobody above them to report a failure to. */
  private async load(): Promise<void> {
    try {
      await this.read();
    } catch (error) {
      this.fail(error);
    }
  }

  private onAnnouncement(message: Announcement): void {
    if (message?.key !== this.key || this.running) return;
    // A filled cache enables automatic syncs. A cleared cache disables them.
    this.cleared = message.event === "cleared";
    void this.load();
  }

  private announce(event: Announcement["event"]): void {
    this.channel?.postMessage({ key: this.key, event } satisfies Announcement);
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync("auto"), delay);
  }

  private fail(error: unknown): void {
    if (this.controller.signal.aborted) return;
    const failure = error instanceof Error ? error : new Error(String(error));
    this.set({
      loaded: true,
      syncing: false,
      progress: null,
      problem: problemOf({ status: "failed", error: failure }),
    });
  }

  private set(change: Partial<SessionState>): void {
    this.update(() => change);
  }

  private update(change: (state: SessionState) => Partial<SessionState>): void {
    this.state = { ...this.state, ...change(this.state) };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
