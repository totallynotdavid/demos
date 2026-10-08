import { describe, expect, it } from "vitest";
import {
  type ActivityEvent,
  analyze,
  loadEvents,
  loadLanguages,
} from "../src/lib/activity";
import { DAY, HOUR, useEnv } from "./helpers";

function event(
  id: number,
  type: string,
  at: number,
  repo = "acme/tool",
  payload: ActivityEvent["payload"] = {},
): ActivityEvent {
  return {
    id: String(id),
    type,
    created_at: new Date(at).toISOString(),
    repo: { name: repo },
    payload,
  };
}

function timeline(count: number, now: number): ActivityEvent[] {
  return Array.from({ length: count }, (_, i) =>
    event(i, "PushEvent", now - i * HOUR, `acme/repo${i % 12}`, {
      commits: [{}],
    }),
  );
}

describe("loadEvents", () => {
  const env = useEnv(0);

  it("reads every page of a 250 event history once", async () => {
    env.github.events = timeline(250, env.clock.now);

    const { events } = await loadEvents(env.client(), env.store, "dubu", {
      since: env.clock.now - 90 * DAY,
      now: () => env.clock.now,
    });

    expect(events).toHaveLength(250);
    expect(env.github.requests.map((r) => r.path)).toEqual([
      "/users/dubu/events/public?per_page=100&page=1",
      "/users/dubu/events/public?per_page=100&page=2",
      "/users/dubu/events/public?per_page=100&page=3",
    ]);
  });

  it("stops at the first page that reaches back past `since`", async () => {
    env.github.events = timeline(250, env.clock.now);

    const { events } = await loadEvents(env.client(), env.store, "dubu", {
      since: env.clock.now - 24 * HOUR,
      now: () => env.clock.now,
    });

    expect(env.github.requests).toHaveLength(1);
    expect(events).toHaveLength(100);
  });

  it("asks nothing again inside a minute", async () => {
    env.github.events = timeline(30, env.clock.now);
    const options = {
      since: env.clock.now - 90 * DAY,
      now: () => env.clock.now,
    };
    await loadEvents(env.client(), env.store, "dubu", options);
    env.github.requests = [];
    env.clock.now += 30_000;

    const again = await loadEvents(env.client(), env.store, "dubu", options);

    expect(again.events).toHaveLength(30);
    expect(env.github.requests).toHaveLength(0);
  });

  it("asks a conditional question after a minute, and a 304 keeps the pages", async () => {
    env.github.events = timeline(30, env.clock.now);
    const options = {
      since: env.clock.now - 90 * DAY,
      now: () => env.clock.now,
    };
    await loadEvents(env.client("ghp_test"), env.store, "dubu", options);
    env.github.requests = [];
    env.clock.now += 2 * 60_000;

    const again = await loadEvents(
      env.client("ghp_test"),
      env.store,
      "dubu",
      options,
    );

    expect(again.events).toHaveLength(30);
    expect(env.github.requests.map((r) => r.status)).toEqual([304]);
    expect(env.github.counted).toHaveLength(0);
  });

  it("lists an event once when new events shift the page boundary", async () => {
    env.github.events = timeline(150, env.clock.now);
    const options = {
      since: env.clock.now - 90 * DAY,
      now: () => env.clock.now,
    };
    await loadEvents(env.client(), env.store, "dubu", options);
    env.github.events = [
      event(1000, "PushEvent", env.clock.now + 1000),
      ...env.github.events,
    ] as ActivityEvent[];
    env.clock.now += 2 * 60_000;

    const { events } = await loadEvents(
      env.client(),
      env.store,
      "dubu",
      options,
    );

    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("1000");
    expect(ids).toHaveLength(151);
  });

  it("serves the stored pages when the limit is reached", async () => {
    env.github.events = timeline(30, env.clock.now);
    const options = {
      since: env.clock.now - 90 * DAY,
      now: () => env.clock.now,
    };
    await loadEvents(env.client(), env.store, "dubu", options);
    env.github.exhaust("core", null);
    env.clock.now += 2 * 60_000;

    const again = await loadEvents(env.client(), env.store, "dubu", options);

    expect(again.stale).toBe(true);
    expect(again.events).toHaveLength(30);
  });

  it("fails with the limit when nothing is stored", async () => {
    env.github.events = timeline(30, env.clock.now);
    env.github.exhaust("core", null);

    await expect(
      loadEvents(env.client(), env.store, "dubu", {
        since: 0,
        now: () => env.clock.now,
      }),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe("analyze", () => {
  const now = new Date(2026, 9, 7, 12, 0, 0).getTime();
  const at = (days: number, hour = 12) =>
    new Date(2026, 9, 7 - days, hour, 0, 0).getTime();

  it("counts each kind of activity", () => {
    const events = [
      event(1, "PushEvent", at(0), "a/one", { commits: [{}, {}, {}] }),
      event(2, "PushEvent", at(0), "a/one", {}),
      event(3, "PullRequestEvent", at(1), "a/one", { action: "opened" }),
      event(4, "PullRequestEvent", at(1), "a/one", {
        action: "closed",
        pull_request: { merged: true },
      }),
      event(5, "PullRequestEvent", at(1), "a/one", {
        action: "closed",
        pull_request: { merged: false },
      }),
      event(6, "IssuesEvent", at(1), "b/two", { action: "opened" }),
      event(7, "IssuesEvent", at(1), "b/two", { action: "closed" }),
      event(8, "IssueCommentEvent", at(1), "b/two"),
      event(9, "PullRequestReviewEvent", at(1), "c/three"),
      event(10, "WatchEvent", at(1), "d/four"),
    ];

    const stats = analyze(events, 7, now);

    expect(stats).toMatchObject({
      total: 9,
      commits: 4,
      pullRequests: { opened: 1, merged: 1, closed: 1 },
      issues: { opened: 1, closed: 1 },
      comments: 1,
      reviews: 1,
    });
  });

  it("ignores events outside the range", () => {
    const events = [
      event(1, "PushEvent", at(2)),
      event(2, "PushEvent", at(20)),
    ];

    expect(analyze(events, 3, now).total).toBe(1);
    expect(analyze(events, 30, now).total).toBe(2);
  });

  it("buckets by local hour and weekday", () => {
    const events = [
      event(1, "PushEvent", at(0, 9)),
      event(2, "PushEvent", at(0, 9)),
      event(3, "PushEvent", at(0, 22)),
    ];

    const stats = analyze(events, 3, now);

    expect(stats.hourly[9]).toBe(2);
    expect(stats.hourly[22]).toBe(1);
    expect(stats.daily[new Date(now).getDay()]).toBe(3);
  });

  it("ranks repos and separates collaboration from pushes", () => {
    const events = [
      event(1, "PushEvent", at(0), "a/one"),
      event(2, "PushEvent", at(0), "a/one"),
      event(3, "IssueCommentEvent", at(0), "b/two"),
      event(4, "PushEvent", at(0), "c/three"),
    ];

    const stats = analyze(events, 3, now);

    expect(stats.repos).toEqual([
      { name: "a/one", count: 2 },
      { name: "b/two", count: 1 },
      { name: "c/three", count: 1 },
    ]);
    expect(stats.collaborations).toBe(1);
  });
});

describe("loadLanguages", () => {
  const env = useEnv(0);

  function repoNames(count: number) {
    const names = Array.from({ length: count }, (_, i) => `acme/repo${i}`);
    for (const [i, name] of names.entries()) {
      env.github.languages.set(
        name,
        i % 2 ? { Rust: 100 } : { Go: 300, Rust: 100 },
      );
    }
    return names;
  }

  it("asks for the ten most active repos only, and sums their bytes", async () => {
    const names = repoNames(14);

    const shares = await loadLanguages(env.client(), env.store, names, {
      now: () => env.clock.now,
    });

    expect(env.github.requests).toHaveLength(10);
    expect(shares).toEqual([
      { language: "Go", bytes: 1500, percent: 60 },
      { language: "Rust", bytes: 1000, percent: 40 },
    ]);
  });

  it("asks nothing for a day after", async () => {
    const names = repoNames(3);
    const options = { now: () => env.clock.now };
    await loadLanguages(env.client(), env.store, names, options);
    env.github.requests = [];
    env.clock.now += 23 * HOUR;

    await loadLanguages(env.client(), env.store, names, options);

    expect(env.github.requests).toHaveLength(0);
  });

  it("skips a repo that is gone", async () => {
    const shares = await loadLanguages(
      env.client(),
      env.store,
      ["acme/known", "acme/unknown"],
      { now: () => env.clock.now },
    );

    expect(shares).toEqual([]);
  });
});
