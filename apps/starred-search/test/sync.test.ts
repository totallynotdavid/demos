import { describe, expect, it } from "vitest";
import {
  clearCache,
  FRESH_MS,
  FULL_REFRESH_MS,
  fullResync,
  refresh,
} from "../src/lib/sync";
import { type FakeStar, makeStars } from "./fake-github";
import { DAY, HOUR, useEnv } from "./helpers";

function newStar(id: string, at: number): FakeStar {
  return {
    ...makeStars(1)[0],
    id,
    name: `fresh-${id}`,
    owner: "someone",
    starredAt: new Date(at).toISOString(),
  };
}

describe("sync without a token", () => {
  const env = useEnv(250);

  it("lists every star once: one probe and one request per 100 stars", async () => {
    const client = env.client();
    const result = await refresh(env.options(client));

    expect(result).toMatchObject({ status: "synced", fetched: 250 });
    expect(env.github.counted.map((r) => r.path)).toEqual([
      "/users/dubu/starred?per_page=1",
      "/users/dubu/starred?per_page=100&page=1",
      "/users/dubu/starred?per_page=100&page=2",
      "/users/dubu/starred?per_page=100&page=3",
    ]);
    expect(await env.store.loadRepos("dubu")).toHaveLength(250);
  });

  it("stores stars with their topics and no README", async () => {
    await refresh(env.options(env.client()));
    const repos = await env.store.loadRepos("dubu");
    const newest = repos.reduce((a, b) => (a.starredAt > b.starredAt ? a : b));

    expect(newest.id).toBe(env.github.stars[0].id);
    expect(repos.every((repo) => repo.readme === null)).toBe(true);
    expect(newest.topics).toEqual(env.github.stars[0].topics);
  });

  it("makes no request while the cache is fresh", async () => {
    await refresh(env.options(env.client()));
    env.github.requests = [];
    env.clock.now += FRESH_MS - 1;

    const result = await refresh(env.options(env.client()));

    expect(result.status).toBe("fresh");
    expect(env.github.requests).toEqual([]);
  });

  it("asks one conditional question when stale and nothing changed", async () => {
    await refresh(env.options(env.client()));
    env.github.requests = [];
    env.clock.now += FRESH_MS + 1;

    const result = await refresh(env.options(env.client()));

    expect(result.status).toBe("unchanged");
    expect(env.github.requests.map((r) => r.status)).toEqual([304]);
  });

  it("fetches only the stars newer than the newest cached one", async () => {
    await refresh(env.options(env.client()));
    env.github.star(newStar("R_new", env.clock.now));
    env.github.requests = [];
    env.clock.now += HOUR;

    const result = await refresh(env.options(env.client()));

    expect(result).toMatchObject({ status: "synced", fetched: 1, removed: 0 });
    expect(env.github.requests.map((r) => r.path)).toEqual([
      "/users/dubu/starred?per_page=1",
      "/users/dubu/starred?per_page=100&page=1",
    ]);
    const repos = await env.store.loadRepos("dubu");
    expect(repos).toHaveLength(251);
    expect(repos.some((repo) => repo.id === "R_new")).toBe(true);
  });

  it("walks a second page when more than a page of stars is new", async () => {
    await refresh(env.options(env.client()));
    for (let i = 0; i < 130; i++) {
      env.github.star(newStar(`R_bulk${i}`, env.clock.now + i * 1000));
    }
    env.github.requests = [];
    env.clock.now += HOUR;

    const result = await refresh(env.options(env.client()));

    expect(result).toMatchObject({ status: "synced", fetched: 130 });
    expect(env.github.requests.map((r) => r.path)).toEqual([
      "/users/dubu/starred?per_page=1",
      "/users/dubu/starred?per_page=100&page=1",
      "/users/dubu/starred?per_page=100&page=2",
    ]);
  });

  it("removes an unstarred repo when the star count stops adding up", async () => {
    await refresh(env.options(env.client()));
    const gone = env.github.stars[100].id;
    env.github.unstar(gone);
    env.github.star(newStar("R_new", env.clock.now));
    env.clock.now += HOUR;

    const result = await refresh(env.options(env.client()));

    expect(result).toMatchObject({ status: "synced", removed: 1 });
    const ids = (await env.store.loadRepos("dubu")).map((repo) => repo.id);
    expect(ids).not.toContain(gone);
    expect(ids).toContain("R_new");
    expect(ids).toHaveLength(250);
  });

  it("rewrites everything after a week, which drops unstarred repos", async () => {
    await refresh(env.options(env.client()));
    const gone = env.github.stars[5].id;
    env.github.unstar(gone);
    env.clock.now += FULL_REFRESH_MS + DAY;

    const result = await refresh(env.options(env.client()));

    expect(result).toMatchObject({ status: "synced", removed: 1 });
    const ids = (await env.store.loadRepos("dubu")).map((repo) => repo.id);
    expect(ids).not.toContain(gone);
  });

  it("fullResync rewrites everything on demand", async () => {
    await refresh(env.options(env.client()));
    env.github.unstar(env.github.stars[7].id);
    env.clock.now += HOUR;

    const result = await fullResync(env.options(env.client()));

    expect(result).toMatchObject({ status: "synced", removed: 1 });
    expect(await env.store.loadRepos("dubu")).toHaveLength(249);
  });

  it("stops at the rate limit, keeps what it stored, and resumes from there", async () => {
    env.github.allowance.anonymous = 3;
    const client = env.client();

    const first = await refresh(env.options(client));

    expect(first.status).toBe("rate-limited");
    expect(await env.store.loadRepos("dubu")).toHaveLength(200);
    expect(client.getSnapshot().limits.core).toMatchObject({ remaining: 0 });
    // The client saw remaining 0 and never sent the request GitHub would refuse.
    expect(env.github.requests.map((r) => r.status)).toEqual([200, 200, 200]);

    const second = await refresh(env.options(client));
    expect(second.status).toBe("rate-limited");
    expect(env.github.requests).toHaveLength(3);
    expect(client.getSnapshot().stats.skipped).toBe(2);

    env.github.allowance.anonymous = 60;
    env.clock.now += 2 * HOUR;
    env.github.requests = [];
    const third = await refresh(env.options(env.client()));

    expect(third).toMatchObject({ status: "synced" });
    expect(env.github.requests.map((r) => r.path)).toEqual([
      "/users/dubu/starred?per_page=100&page=3",
    ]);
    expect(await env.store.loadRepos("dubu")).toHaveLength(250);
  });

  it("reports a missing user as a failure, not a rate limit", async () => {
    const result = await refresh({
      ...env.options(env.client()),
      login: "nobody",
    });

    expect(result).toMatchObject({
      status: "failed",
      error: { status: 404 },
    });
  });

  it("lets only one sync of an account run at a time", async () => {
    const options = env.options(env.client());

    const [a, b] = await Promise.all([refresh(options), refresh(options)]);

    expect([a.status, b.status].sort()).toEqual(["busy", "synced"]);
  });

  it("deletes the cache of one account and starts over after", async () => {
    const options = env.options(env.client());
    await refresh(options);

    expect((await clearCache(options)).status).toBe("cleared");
    expect(await env.store.loadRepos("dubu")).toEqual([]);
    expect(await env.store.loadMeta("dubu")).toBeNull();

    env.clock.now += 1;
    expect(await refresh(options)).toMatchObject({
      status: "synced",
      fetched: 250,
    });
  });

  it("does not delete the cache under a running sync", async () => {
    const options = env.options(env.client());
    const running = refresh(options);

    const cleared = await clearCache(options);

    expect(cleared.status).toBe("busy");
    expect(await running).toMatchObject({ status: "synced", fetched: 250 });
    expect(await env.store.loadRepos("dubu")).toHaveLength(250);
  });

  it("reports pages as they are stored", async () => {
    const seen: number[] = [];

    await refresh({
      ...env.options(env.client()),
      onProgress: ({ fetched }) => seen.push(fetched),
    });

    expect(seen).toEqual([100, 200, 250]);
  });
});

describe("sync with a token", () => {
  const env = useEnv(250);

  function withLists() {
    env.github.lists = [
      {
        id: "L_1",
        name: "Tools",
        repoIds: env.github.stars.slice(0, 3).map((s) => s.id),
      },
      {
        id: "L_2",
        name: "Read later",
        repoIds: env.github.stars.slice(2, 5).map((s) => s.id),
      },
    ];
  }

  it("reads stars, READMEs and lists in one pass of GraphQL pages", async () => {
    withLists();
    const client = env.client("ghp_test");

    const result = await refresh(env.options(client));

    expect(result).toMatchObject({ status: "synced", fetched: 250 });
    expect(env.github.counted.map((r) => `${r.resource} ${r.method}`)).toEqual([
      "core GET",
      "graphql POST",
      "graphql POST",
      "graphql POST",
      "graphql POST",
    ]);

    const repos = await env.store.loadRepos("dubu");
    expect(repos.every((repo) => repo.readme?.startsWith("# "))).toBe(true);
    const byId = new Map(repos.map((repo) => [repo.id, repo.lists]));
    expect(byId.get(env.github.stars[0].id)).toEqual(["Tools"]);
    expect(byId.get(env.github.stars[2].id)).toEqual(["Tools", "Read later"]);
    expect(byId.get(env.github.stars[10].id)).toEqual([]);
  });

  it("pages through a list with more than 100 items", async () => {
    env.github.lists = [
      {
        id: "L_big",
        name: "Everything",
        repoIds: env.github.stars.map((s) => s.id),
      },
    ];

    await refresh(env.options(env.client("ghp_test")));

    const repos = await env.store.loadRepos("dubu");
    expect(repos.every((repo) => repo.lists.includes("Everything"))).toBe(true);
  });

  it("halves the page size when the server fails on a large page", async () => {
    env.github.maxFirst = 30;

    const result = await refresh(env.options(env.client("ghp_test")));

    expect(result).toMatchObject({ status: "synced", fetched: 250 });
    expect(await env.store.loadRepos("dubu")).toHaveLength(250);
  });

  it("costs one probe, one page and one lists query for a new star", async () => {
    withLists();
    await refresh(env.options(env.client("ghp_test")));
    env.github.star(newStar("R_new", env.clock.now));
    env.github.requests = [];
    env.clock.now += HOUR;

    const result = await refresh(env.options(env.client("ghp_test")));

    expect(result).toMatchObject({ status: "synced", fetched: 1 });
    expect(env.github.requests).toHaveLength(3);
  });

  it("costs nothing against the REST limit when stale and unchanged", async () => {
    withLists();
    await refresh(env.options(env.client("ghp_test")));
    env.github.requests = [];
    env.clock.now += FRESH_MS + 1;
    const client = env.client("ghp_test");

    const result = await refresh(env.options(client));

    expect(result.status).toBe("unchanged");
    expect(env.github.requests.map((r) => `${r.resource} ${r.status}`)).toEqual(
      ["core 304", "graphql 200"],
    );
    expect(env.github.counted.map((r) => r.resource)).toEqual(["graphql"]);
    expect(client.getSnapshot().stats).toMatchObject({ counted: 1, free: 1 });
  });

  it("picks up a list change without any new star", async () => {
    withLists();
    await refresh(env.options(env.client("ghp_test")));
    env.github.lists[0].repoIds.push(env.github.stars[50].id);
    env.clock.now += FRESH_MS + 1;

    await refresh(env.options(env.client("ghp_test")));

    const repos = await env.store.loadRepos("dubu");
    expect(repos.find((r) => r.id === env.github.stars[50].id)?.lists).toEqual([
      "Tools",
    ]);
  });

  it("refetches with READMEs when a token arrives for a metadata-only cache", async () => {
    await refresh(env.options(env.client()));
    expect((await env.store.loadRepos("dubu"))[0].readme).toBeNull();
    env.clock.now += HOUR;

    const result = await refresh(env.options(env.client("ghp_test")));

    expect(result).toMatchObject({ status: "synced", fetched: 250 });
    expect((await env.store.loadRepos("dubu"))[0].readme).not.toBeNull();
  });

  it("drops READMEs and lists when the token goes away", async () => {
    withLists();
    await refresh(env.options(env.client("ghp_test")));
    env.clock.now += 1000;

    const result = await refresh(env.options(env.client()));

    expect(result).toMatchObject({ status: "synced", fetched: 250 });
    const repos = await env.store.loadRepos("dubu");
    expect(repos).toHaveLength(250);
    expect(repos.every((repo) => repo.readme === null)).toBe(true);
    expect(repos.every((repo) => repo.lists.length === 0)).toBe(true);
    expect((await env.store.loadMeta("dubu"))?.detail).toBe("basic");
  });

  it("goes back to cheap syncs once the cache matches the source", async () => {
    await refresh(env.options(env.client("ghp_test")));
    await refresh(env.options(env.client()));
    env.github.requests = [];
    env.clock.now += FRESH_MS + 1;

    const result = await refresh(env.options(env.client()));

    expect(result.status).toBe("unchanged");
    expect(env.github.requests).toHaveLength(1);
  });

  it("tracks the REST and GraphQL limits separately", async () => {
    env.github.exhaust("graphql", "ghp_test");
    const client = env.client("ghp_test");

    const result = await refresh(env.options(client));

    expect(result.status).toBe("rate-limited");
    const { limits } = client.getSnapshot();
    expect(limits.graphql).toMatchObject({ remaining: 0 });
    expect(limits.core).toMatchObject({ remaining: 4999 });
  });

  it("fails on a rejected token and leaves the cache as it was", async () => {
    await refresh(env.options(env.client("ghp_test")));
    env.clock.now += HOUR;
    env.github.rejectedTokens.add("ghp_revoked");

    const result = await refresh(env.options(env.client("ghp_revoked")));

    expect(result).toMatchObject({ status: "failed", error: { status: 401 } });
    expect(await env.store.loadRepos("dubu")).toHaveLength(250);
  });

  it("reports a missing user for a token too", async () => {
    const result = await refresh({
      ...env.options(env.client("ghp_test")),
      login: "nobody",
    });

    expect(result).toMatchObject({ status: "failed", error: { status: 404 } });
  });
});
