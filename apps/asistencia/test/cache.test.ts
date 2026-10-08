import { describe, expect, test } from "bun:test";
import { promiseCache } from "../api/_lib/cache.ts";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("promiseCache", () => {
  test("runs one load for concurrent and repeated reads", async () => {
    const cache = promiseCache<string>(1000);
    let loads = 0;
    const load = async () => `value ${++loads}`;

    const [a, b] = await Promise.all([
      cache.get("k", load),
      cache.get("k", load),
    ]);
    const c = await cache.get("k", load);

    expect([a, b, c]).toEqual(["value 1", "value 1", "value 1"]);
    expect(loads).toBe(1);
  });

  test("keeps keys apart", async () => {
    const cache = promiseCache<string>(1000);
    expect(await cache.get("a", async () => "A")).toBe("A");
    expect(await cache.get("b", async () => "B")).toBe("B");
  });

  test("loads again once the entry is older than the ttl", async () => {
    const cache = promiseCache<number>(10);
    let loads = 0;
    const load = async () => ++loads;

    await cache.get("k", load);
    await wait(20);

    expect(await cache.get("k", load)).toBe(2);
  });

  test("drops a failed load so the next read retries", async () => {
    const cache = promiseCache<string>(1000);
    await expect(
      cache.get("k", () => Promise.reject(new Error("down"))),
    ).rejects.toThrow("down");

    expect(await cache.get("k", async () => "back")).toBe("back");
  });

  test("a late failure does not evict the newer entry that replaced it", async () => {
    const cache = promiseCache<string>(10);
    const slow = deferred<string>();
    const stale = cache.get("k", () => slow.promise);
    const staleResult = stale.catch((error: Error) => error.message);

    await wait(20);
    expect(await cache.get("k", async () => "fresh")).toBe("fresh");

    slow.reject(new Error("late"));
    expect(await staleResult).toBe("late");

    let loads = 0;
    const again = await cache.get("k", async () => `reload ${++loads}`);
    expect(again).toBe("fresh");
    expect(loads).toBe(0);
  });

  test("clear forgets every key, and a failure from before it keeps the new entry", async () => {
    const cache = promiseCache<string>(1000);
    const slow = deferred<string>();
    const stale = cache.get("k", () => slow.promise).catch(() => "failed");

    cache.clear();
    expect(await cache.get("k", async () => "fresh")).toBe("fresh");

    slow.reject(new Error("late"));
    await stale;
    expect(await cache.get("k", async () => "reloaded")).toBe("fresh");
  });
});
