import { afterEach, describe, expect, it } from "vitest";
import type { Store } from "../src/lib/db";
import { type SessionState, StarredSession } from "../src/lib/session";
import { useEnv } from "./helpers";

async function until(done: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!done()) {
    if (Date.now() > deadline)
      throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const settled = (state: SessionState) => state.loaded && !state.syncing;

describe("a page's view of the cache", () => {
  const env = useEnv(250);
  const sessions: StarredSession[] = [];

  function open(openStore?: () => Promise<Store>, token?: string) {
    env.clock.now = Date.now();
    env.github.resetAt = Math.floor(Date.now() / 1000) + 3600;
    const session = new StarredSession({
      login: "dubu",
      client: env.client(token),
      openStore: openStore ?? (async () => env.store),
    });
    sessions.push(session);
    return session;
  }

  afterEach(() => {
    for (const session of sessions.splice(0)) session.dispose();
  });

  it("reads the cache, then fills it", async () => {
    const session = open();

    session.start();
    await until(() => session.getState().repos.length === 250, "the stars");
    await until(() => settled(session.getState()), "the end of the sync");

    expect(session.getState()).toMatchObject({
      loaded: true,
      problem: null,
      detail: "basic",
    });
    expect(session.getState().syncedAt).not.toBeNull();
  });

  it("can sync again after the store failed to open", async () => {
    // The first two attempts are the page reading the cache and the sync.
    let attempts = 0;
    const session = open(async () => {
      if (++attempts <= 2) throw new Error("storage is blocked");
      return env.store;
    });

    session.start();
    await until(
      () => settled(session.getState()) && session.getState().problem !== null,
      "the failure",
    );
    expect(session.getState()).toMatchObject({
      loaded: true,
      syncing: false,
      problem: { kind: "error", message: "storage is blocked" },
    });

    await session.sync("check");

    expect(session.getState()).toMatchObject({ problem: null, syncing: false });
    expect(session.getState().repos).toHaveLength(250);
  });

  it("can sync again after reading the cache failed once the sync ended", async () => {
    let metaReads = 0;
    const flaky = new Proxy(env.store, {
      get(target, property) {
        if (property === "loadMeta") {
          return async (account: string) => {
            // The first read is the sync's own. The second is the page's.
            if (++metaReads === 2) throw new Error("read failed");
            return target.loadMeta(account);
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const session = open(async () => flaky);

    await session.sync("check");

    expect(session.getState()).toMatchObject({
      syncing: false,
      problem: { kind: "error", message: "read failed" },
    });

    await session.sync("check");

    expect(session.getState()).toMatchObject({ problem: null, syncing: false });
  });

  it("does not sync on its own while rate limited, and says when it ends", async () => {
    const session = open();
    env.github.exhaust("core", null);

    await session.sync("auto");
    const sent = env.github.requests.length;

    expect(session.getState().problem).toMatchObject({ kind: "rate-limited" });
    session.resume();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(env.github.requests.length).toBe(sent);
  });

  describe("with two tabs on one account", () => {
    async function twoTabs() {
      const first = open();
      const second = open();
      first.start();
      await until(() => settled(first.getState()), "the first sync");
      second.start();
      await until(() => second.getState().repos.length === 250, "the second");
      await until(() => settled(second.getState()), "the second to settle");
      return { first, second };
    }

    it("shows another tab's sync", async () => {
      const { first, second } = await twoTabs();
      env.github.star({
        ...env.github.stars[0],
        id: "R_new",
        name: "fresh-one",
        starredAt: new Date().toISOString(),
      });

      await first.sync("check");

      await until(() => second.getState().repos.length === 251, "the new star");
    });

    it("does not refill a cache the other tab deleted", async () => {
      const { first, second } = await twoTabs();
      const before = env.github.requests.length;

      expect(await first.clear()).toBe(true);
      await until(() => second.getState().repos.length === 0, "the deletion");
      second.resume();
      first.resume();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(second.getState()).toMatchObject({ loaded: true, syncedAt: null });
      expect(first.getState()).toMatchObject({ loaded: true, syncedAt: null });
      expect(env.github.requests.length).toBe(before);
    });

    it("fills the cache again when the user asks, in either tab", async () => {
      const { first, second } = await twoTabs();
      await first.clear();
      await until(() => second.getState().repos.length === 0, "the deletion");

      await second.sync("check");

      expect(second.getState().repos).toHaveLength(250);
      await until(() => first.getState().repos.length === 250, "the refill");
      first.resume();
      expect(first.getState().problem).toBeNull();
    });

    it("refuses to delete the cache while a sync holds it", async () => {
      const { first, second } = await twoTabs();
      const syncing = first.sync("resync");

      const deleted = await second.clear();
      await syncing;

      expect(deleted).toBe(false);
      expect(second.getState().problem).toMatchObject({ kind: "error" });
      expect(first.getState().repos).toHaveLength(250);
    });
  });
});
