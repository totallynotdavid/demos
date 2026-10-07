import { afterAll, describe, expect, test } from "bun:test";
import { createServer } from "../src/server";

const server = createServer(0);
const url = (path: string) => new URL(path, server.url);

afterAll(() => server.stop(true));

describe("routes", () => {
  test("GET serves the page and the stats", async () => {
    const page = await fetch(url("/"));
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");

    const stats = await fetch(url("/api/stats"));
    expect(stats.status).toBe(200);
    expect(await stats.json()).toEqual({ latest: null, history: [] });
  });

  test("HEAD is served without a body", async () => {
    const res = await fetch(url("/api/stats"), { method: "HEAD" });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  test.each(["/", "/api/stats"])("%s rejects other methods", async (path) => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const res = await fetch(url(path), { method });
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("GET, HEAD");
    }
  });

  test("an unknown path is 404 for any method", async () => {
    expect((await fetch(url("/nope"))).status).toBe(404);
    expect((await fetch(url("/nope"), { method: "POST" })).status).toBe(404);
  });
});
