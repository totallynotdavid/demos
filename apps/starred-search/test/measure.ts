// Prints every request of one session with the limit GitHub has left.
//
//   bun test/measure.ts <login> [api-url]
//   GITHUB_TOKEN=... bun test/measure.ts <login>
//
// The clock is ours, so reopening ten minutes later takes no waiting.
import "fake-indexeddb/auto";
import { LANGUAGE_REPOS, loadEvents, loadLanguages } from "../src/lib/activity";
import { Store } from "../src/lib/db";
import { GitHubClient } from "../src/lib/github";
import { refresh } from "../src/lib/sync";

const [login, base] = process.argv.slice(2);
if (!login) {
  console.error("usage: bun test/measure.ts <login> [api-url]");
  process.exit(1);
}
const baseUrl = base ?? "https://api.github.com";
const token = process.env.GITHUB_TOKEN || undefined;

let clock = Date.now();
let sent = 0;
let statuses: number[] = [];

function makeClient(): GitHubClient {
  return new GitHubClient({
    token,
    baseUrl,
    now: () => clock,
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      sent++;
      statuses.push(response.status);
      const remaining = response.headers.get("x-ratelimit-remaining");
      console.log(
        `  #${sent} ${response.status} remaining=${remaining} ${String(input).replace(baseUrl, "")}`,
      );
      return response;
    },
  });
}

function step(label: string) {
  console.log(`\n${label}`);
  statuses = [];
}

function summary(client: GitHubClient) {
  const { counted, free, skipped } = client.getSnapshot().stats;
  console.log(
    `  sent ${statuses.length}: counted ${counted}, free ${free}, skipped ${skipped}`,
  );
}

const store = await Store.open("measure");
const cacheKey = login.toLowerCase();
console.log(
  `${login} on ${baseUrl} ${token ? "with a token" : "without a token"}`,
);

let client = makeClient();
const options = () => ({ client, store, login, now: () => clock });

step("sync 1: cold cache");
const cold = await refresh(options());
console.log(
  `  ${cold.status}`,
  (await store.loadRepos(cacheKey)).length,
  "repos",
);
summary(client);

step("sync 2: reopened 1 minute later, inside the fresh window");
clock += 60_000;
client = makeClient();
await refresh(options());
summary(client);

step("sync 3: reopened 10 minutes later, nothing changed");
clock += 10 * 60_000;
client = makeClient();
console.log(" ", (await refresh(options())).status);
summary(client);

for (const [label, wait] of [
  ["activity 1: first visit", 0],
  ["activity 2: same view again after 2 minutes", 120_000],
] as const) {
  step(label);
  clock += wait;
  client = makeClient();
  const { events } = await loadEvents(client, store, login, {
    since: clock - 30 * 86_400_000,
    now: () => clock,
  });
  const names = [...new Set(events.map((event) => event.repo.name))];
  await loadLanguages(client, store, names, { now: () => clock });
  console.log(
    `  ${events.length} events, languages for ${Math.min(names.length, LANGUAGE_REPOS)} repos`,
  );
  summary(client);
}
