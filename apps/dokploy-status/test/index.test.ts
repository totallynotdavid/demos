import { afterAll, beforeAll, expect, test } from "bun:test";

interface StatsBody {
  latest: Record<string, unknown> | null;
  history: Record<string, unknown>[];
}

let server: Bun.Subprocess<"ignore", "pipe", "inherit">;
let baseUrl: string;

// PORT=0 lets the OS pick a free port, which the process prints on startup.
beforeAll(async () => {
  server = Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, PORT: "0" },
    stdout: "pipe",
  });

  const decoder = new TextDecoder();
  let output = "";
  for await (const chunk of server.stdout) {
    output += decoder.decode(chunk);
    const match = output.match(/listening on (\S+)/);
    if (match?.[1]) {
      baseUrl = match[1];
      return;
    }
  }
  throw new Error(`server exited before it listened: ${output}`);
});

afterAll(() => {
  server.kill();
});

async function fetchStats(): Promise<StatsBody> {
  const response = await fetch(new URL("/api/stats", baseUrl));
  return (await response.json()) as StatsBody;
}

async function untilFirstPoll(): Promise<StatsBody> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const stats = await fetchStats();
    if (stats.latest) return stats;
    await Bun.sleep(20);
  }
  throw new Error("the first poll did not complete");
}

test("the process polls once at startup and serves the sample", async () => {
  const { latest, history } = await untilFirstPoll();

  expect(latest).toEqual(history.at(-1) ?? null);
  expect(history[0]).toMatchObject({
    cpuUsagePercent: 0,
    memory: { totalGB: expect.any(Number) },
    disk: { totalGB: expect.any(Number) },
    blockReadBytesPerSec: 0,
    blockWriteBytesPerSec: 0,
  });
});
