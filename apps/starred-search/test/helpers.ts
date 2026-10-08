import { afterEach, beforeEach } from "vitest";
import { Store } from "../src/lib/db";
import { GitHubClient } from "../src/lib/github";
import { FakeGitHub, makeStars } from "./fake-github";

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export interface Env {
  github: FakeGitHub;
  store: Store;
  baseUrl: string;
  clock: { now: number };
  client(token?: string): GitHubClient;
  /** Sync options shared by every call in a test. */
  options(client: GitHubClient): {
    client: GitHubClient;
    store: Store;
    login: string;
    now: () => number;
  };
}

let counter = 0;

/** Starts a fake GitHub and an empty IndexedDB store for each test. */
export function useEnv(starCount = 250): Env {
  const env = {} as Env;

  beforeEach(async () => {
    env.github = new FakeGitHub();
    env.github.stars = makeStars(starCount, 600);
    env.baseUrl = await env.github.start();
    env.store = await Store.open(`test-${++counter}`);
    env.clock = { now: Date.UTC(2026, 9, 1) };
    env.client = (token) =>
      new GitHubClient({
        token,
        baseUrl: env.baseUrl,
        now: () => env.clock.now,
      });
    env.options = (client) => ({
      client,
      store: env.store,
      login: "dubu",
      now: () => env.clock.now,
    });
    env.github.resetAt = Math.floor(env.clock.now / 1000) + 3600;
  });

  afterEach(async () => {
    env.store.close();
    await env.github.stop();
  });

  return env;
}
