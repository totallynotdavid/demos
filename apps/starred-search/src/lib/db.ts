import { type Repo, withoutTokenData } from "./types";

export interface SyncMeta {
  account: string;
  /** When the cache was last confirmed current. */
  syncedAt: number;
  /** When the last full sync finished. */
  fullAt: number;
  /** ETag of the star-list probe the cache was last synced against. */
  etag: string | null;
  /** Star count reported by that probe. */
  total: number;
  /** `full` carries READMEs and lists. `basic` has neither. */
  detail: "basic" | "full";
  /** Generation of the last finished full sync. */
  gen: number;
  /** Set while a full sync is unfinished. The next run continues from it. */
  resume: {
    gen: number;
    /** The kind of source that wrote `cursor`. */
    detail: "basic" | "full";
    cursor: string | null;
    etag: string | null;
    total: number;
    fetched: number;
  } | null;
}

export interface HttpEntry {
  etag: string;
  body: unknown;
  fetchedAt: number;
}

type StoredRepo = Repo & { account: string; gen: number };

const STORES = { repos: "repos", meta: "meta", http: "http" } as const;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export class Store {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(name = "starred-search"): Promise<Store> {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const repos = db.createObjectStore(STORES.repos, {
        keyPath: ["account", "id"],
      });
      repos.createIndex("account", "account");
      db.createObjectStore(STORES.meta, { keyPath: "account" });
      db.createObjectStore(STORES.http, { keyPath: "key" });
    };
    return new Store(await promisify(request));
  }

  close() {
    this.db.close();
  }

  async loadMeta(account: string): Promise<SyncMeta | null> {
    const store = this.db.transaction(STORES.meta).objectStore(STORES.meta);
    return (await promisify(store.get(account))) ?? null;
  }

  async saveMeta(meta: SyncMeta): Promise<void> {
    const transaction = this.db.transaction(STORES.meta, "readwrite");
    transaction.objectStore(STORES.meta).put(meta);
    await finished(transaction);
  }

  async loadRepos(account: string): Promise<Repo[]> {
    const index = this.db
      .transaction(STORES.repos)
      .objectStore(STORES.repos)
      .index("account");
    const stored: StoredRepo[] = await promisify(index.getAll(account));
    return stored.map(({ account: _account, gen: _gen, ...repo }) => repo);
  }

  async saveRepos(account: string, repos: Repo[], gen: number): Promise<void> {
    const transaction = this.db.transaction(STORES.repos, "readwrite");
    const store = transaction.objectStore(STORES.repos);
    for (const repo of repos) store.put({ ...repo, account, gen });
    await finished(transaction);
  }

  /** Deletes every repo of the account that a full sync of `gen` did not write. */
  async pruneBefore(account: string, gen: number): Promise<number> {
    const transaction = this.db.transaction(STORES.repos, "readwrite");
    const index = transaction.objectStore(STORES.repos).index("account");
    let removed = 0;

    const cursorRequest = index.openCursor(account);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      if ((cursor.value as StoredRepo).gen < gen) {
        cursor.delete();
        removed++;
      }
      cursor.continue();
    };

    await finished(transaction);
    return removed;
  }

  /** Empties `readme` and `lists` of every repo of the account. */
  async dropTokenData(account: string): Promise<number> {
    const transaction = this.db.transaction(STORES.repos, "readwrite");
    const index = transaction.objectStore(STORES.repos).index("account");
    let changed = 0;

    const cursorRequest = index.openCursor(account);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      const stored = cursor.value as StoredRepo;
      const basic = withoutTokenData(stored);
      if (basic !== stored) {
        cursor.update(basic);
        changed++;
      }
      cursor.continue();
    };

    await finished(transaction);
    return changed;
  }

  async clear(account: string): Promise<void> {
    const transaction = this.db.transaction(
      [STORES.repos, STORES.meta],
      "readwrite",
    );
    const index = transaction.objectStore(STORES.repos).index("account");
    const cursorRequest = index.openKeyCursor(account);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      transaction.objectStore(STORES.repos).delete(cursor.primaryKey);
      cursor.continue();
    };
    transaction.objectStore(STORES.meta).delete(account);
    await finished(transaction);
  }

  async loadHttp(key: string): Promise<HttpEntry | null> {
    const store = this.db.transaction(STORES.http).objectStore(STORES.http);
    const row = await promisify(store.get(key));
    return row
      ? { etag: row.etag, body: row.body, fetchedAt: row.fetchedAt }
      : null;
  }

  async saveHttp(key: string, entry: HttpEntry): Promise<void> {
    const transaction = this.db.transaction(STORES.http, "readwrite");
    transaction.objectStore(STORES.http).put({ key, ...entry });
    await finished(transaction);
  }
}
