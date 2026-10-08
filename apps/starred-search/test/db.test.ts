import { describe, expect, it } from "vitest";
import { Store } from "../src/lib/db";
import type { Repo } from "../src/lib/types";

function repo(id: string): Repo {
  return {
    id,
    owner: "o",
    name: id,
    fullName: `o/${id}`,
    url: `https://github.com/o/${id}`,
    description: null,
    language: "Go",
    topics: ["a"],
    stars: 1,
    updatedAt: "2026-01-01T00:00:00Z",
    starredAt: "2026-01-02T00:00:00Z",
    lists: [],
    readme: "text",
  };
}

describe("Store", () => {
  it("keeps repos and meta after the database is closed and opened again", async () => {
    const first = await Store.open("persist");
    await first.saveRepos("dubu", [repo("a"), repo("b")], 1);
    await first.saveMeta({
      account: "dubu",
      syncedAt: 5,
      fullAt: 5,
      etag: 'W/"x"',
      total: 2,
      detail: "full",
      gen: 1,
      resume: null,
    });
    first.close();

    const second = await Store.open("persist");

    expect((await second.loadRepos("dubu")).map((r) => r.id).sort()).toEqual([
      "a",
      "b",
    ]);
    expect(await second.loadMeta("dubu")).toMatchObject({
      etag: 'W/"x"',
      total: 2,
    });
    second.close();
  });

  it("returns repos without storage bookkeeping", async () => {
    const store = await Store.open("shape");
    await store.saveRepos("dubu", [repo("a")], 3);

    expect(await store.loadRepos("dubu")).toEqual([repo("a")]);
    store.close();
  });

  it("separates accounts", async () => {
    const store = await Store.open("accounts");
    await store.saveRepos("one", [repo("a")], 1);
    await store.saveRepos("two", [repo("a"), repo("b")], 1);

    expect(await store.loadRepos("one")).toHaveLength(1);
    expect(await store.loadRepos("two")).toHaveLength(2);

    await store.clear("two");
    expect(await store.loadRepos("two")).toEqual([]);
    expect(await store.loadRepos("one")).toHaveLength(1);
    store.close();
  });

  it("prunes only repos from older generations", async () => {
    const store = await Store.open("prune");
    await store.saveRepos("dubu", [repo("old"), repo("kept")], 1);
    await store.saveRepos("dubu", [repo("kept"), repo("new")], 2);

    const removed = await store.pruneBefore("dubu", 2);

    expect(removed).toBe(1);
    expect((await store.loadRepos("dubu")).map((r) => r.id).sort()).toEqual([
      "kept",
      "new",
    ]);
    store.close();
  });

  it("round-trips an HTTP cache entry", async () => {
    const store = await Store.open("http");

    expect(await store.loadHttp("/events")).toBeNull();
    await store.saveHttp("/events", {
      etag: "e1",
      body: [{ a: 1 }],
      fetchedAt: 9,
    });

    expect(await store.loadHttp("/events")).toEqual({
      etag: "e1",
      body: [{ a: 1 }],
      fetchedAt: 9,
    });
    store.close();
  });
});
