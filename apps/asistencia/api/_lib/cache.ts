interface Entry<T> {
  at: number;
  value: Promise<T>;
}

// Remembers the promise of a load, not its result, so concurrent callers share
// one request. An entry is fresh for `ttlMs` after its load started. A load
// that rejects removes its own entry and nothing else: by then the key may
// hold a newer entry that must stay.
export function promiseCache<T>(ttlMs: number) {
  const entries = new Map<string, Entry<T>>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = entries.get(key);
      if (hit && Date.now() - hit.at < ttlMs) return hit.value;

      const entry = { at: Date.now(), value: load() };
      entries.set(key, entry);
      entry.value.catch(() => {
        if (entries.get(key) === entry) entries.delete(key);
      });
      return entry.value;
    },

    clear() {
      entries.clear();
    },
  };
}
