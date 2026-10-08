import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { ApiError, GitHubClient, RateLimitError } from "../src/lib/github";
import { useEnv } from "./helpers";

describe("GitHubClient", () => {
  const env = useEnv(5);

  it("treats a 304 to an authorized request as free", async () => {
    const client = env.client("ghp_test");
    const first = await client.rest("/users/dubu/starred?per_page=1");
    const again = await client.rest("/users/dubu/starred?per_page=1", {
      etag: first.etag,
    });

    expect(again.status).toBe(304);
    expect(client.getSnapshot().stats).toEqual({
      counted: 1,
      free: 1,
      skipped: 0,
    });
    expect(client.getSnapshot().limits.core).toMatchObject({
      limit: 5000,
      remaining: 4999,
    });
  });

  it("counts a 304 to an anonymous request, as GitHub does", async () => {
    const client = env.client();
    const first = await client.rest("/users/dubu/starred?per_page=1");
    await client.rest("/users/dubu/starred?per_page=1", { etag: first.etag });

    expect(client.getSnapshot().stats).toMatchObject({ counted: 2, free: 0 });
    expect(client.getSnapshot().limits.core).toMatchObject({ remaining: 58 });
  });

  it("reads the total star count from the last page of a one-item listing", async () => {
    const response = await env.client().rest("/users/dubu/starred?per_page=1");

    expect(response.lastPage).toBe(5);
    expect(response.hasNext).toBe(true);
  });

  it("sends the token as a bearer credential", async () => {
    let seen: string | undefined;
    const client = new GitHubClient({
      token: "ghp_abc",
      baseUrl: env.baseUrl,
      fetch: (input, init) => {
        seen = new Headers(init?.headers).get("authorization") ?? undefined;
        return fetch(input, init);
      },
    });

    await client.rest("/users/dubu/starred?per_page=1");

    expect(seen).toBe("Bearer ghp_abc");
  });

  it("maps 404 and a network failure to ApiError", async () => {
    await expect(
      env.client().rest("/users/nobody/starred"),
    ).rejects.toMatchObject({
      status: 404,
    });

    const offline = new GitHubClient({ baseUrl: "http://127.0.0.1:1" });
    await expect(offline.rest("/x")).rejects.toMatchObject({ status: 0 });
  });

  it("throws RateLimitError with the reset time once the limit is exhausted", async () => {
    env.github.allowance.anonymous = 1;
    const client = env.client();
    await client.rest("/users/dubu/starred?per_page=1");

    const error = await client
      .rest("/users/dubu/starred?per_page=1")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetAt).toBe(env.github.resetAt * 1000);
    expect(env.github.requests).toHaveLength(1);
  });

  it("sends again once the reset time has passed", async () => {
    env.github.allowance.anonymous = 1;
    const client = env.client();
    await client.rest("/users/dubu/starred?per_page=1");
    env.github.allowance.anonymous = 60;
    env.clock.now = env.github.resetAt * 1000 + 1;

    await expect(
      client.rest("/users/dubu/starred?per_page=1"),
    ).resolves.toMatchObject({ status: 200 });
  });

  it("treats a 403 with Retry-After as a limit even when requests remain", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(403, {
        "retry-after": "30",
        "x-ratelimit-remaining": "4000",
        "x-ratelimit-limit": "5000",
        "x-ratelimit-reset": "9999999999",
      });
      res.end(
        JSON.stringify({ message: "You have exceeded a secondary rate limit" }),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = new GitHubClient({
      baseUrl: base,
      now: () => env.clock.now,
    });

    const error = await client.rest("/x").catch((e: unknown) => e);

    expect((error as RateLimitError).resetAt).toBe(env.clock.now + 30_000);
    await expect(client.rest("/x")).rejects.toBeInstanceOf(RateLimitError);
    expect(client.getSnapshot().stats.skipped).toBe(1);
    server.close();
  });

  it("notifies subscribers when the state changes", async () => {
    const client = env.client();
    let calls = 0;
    client.subscribe(() => calls++);

    await client.rest("/users/dubu/starred?per_page=1");

    expect(calls).toBeGreaterThan(0);
  });

  it("refuses GraphQL without a token", async () => {
    await expect(
      env.client().graphql("query X { a }", {}),
    ).rejects.toBeInstanceOf(ApiError);
    expect(env.github.requests).toHaveLength(0);
  });
});
