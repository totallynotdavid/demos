// A fake GitHub API. The only user is `dubu`, and any token is accepted.
//
//   bun test/serve.ts [--port 4010] [--stars 1694] [--anonymous 60]
//                     [--authenticated 5000] [--window <seconds to reset>]
//   VITE_GITHUB_API_URL=http://127.0.0.1:4010 bun run dev
import { parseArgs } from "node:util";
import { FakeGitHub, makeStars } from "./fake-github";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "4010" },
    stars: { type: "string", default: "1694" },
    anonymous: { type: "string", default: "60" },
    authenticated: { type: "string", default: "5000" },
    window: { type: "string", default: "3600" },
  },
});

const github = new FakeGitHub();
github.stars = makeStars(Number(values.stars));
github.allowance = {
  anonymous: Number(values.anonymous),
  authenticated: Number(values.authenticated),
};
github.lists = [
  {
    id: "L_tools",
    name: "Tools",
    repoIds: github.stars.filter((_, i) => i % 9 === 0).map((s) => s.id),
  },
  {
    id: "L_later",
    name: "Read later",
    repoIds: github.stars.filter((_, i) => i % 23 === 0).map((s) => s.id),
  },
];

const now = Date.now();
const KINDS = [
  { type: "PushEvent", payload: { commits: [{}, {}] } },
  { type: "PullRequestEvent", payload: { action: "opened" } },
  {
    type: "PullRequestEvent",
    payload: { action: "closed", pull_request: { merged: true } },
  },
  { type: "IssuesEvent", payload: { action: "opened" } },
  { type: "IssueCommentEvent", payload: {} },
  { type: "PullRequestReviewEvent", payload: {} },
  { type: "WatchEvent", payload: {} },
];
github.events = Array.from({ length: 300 }, (_, i) => {
  const kind = KINDS[(i * 5) % KINDS.length];
  const hours = i * 7 + (i % 5);
  return {
    id: String(1_000_000 - i),
    type: kind.type,
    created_at: new Date(
      now - hours * 3_600_000 - (i % 11) * 600_000,
    ).toISOString(),
    repo: { name: `owner${i % 7}/project-${i % 13}` },
    payload: kind.payload,
  };
});
for (let i = 0; i < 7; i++) {
  for (let j = 0; j < 13; j++) {
    github.languages.set(`owner${i}/project-${j}`, {
      TypeScript: 9000 + i * 100,
      CSS: 1500 + j * 50,
      ...(j % 3 === 0 ? { Rust: 4000 } : {}),
    });
  }
}

const windowMs = Number(values.window) * 1000;
function scheduleReset() {
  github.resetWindow(Math.floor((Date.now() + windowMs) / 1000));
  setTimeout(scheduleReset, windowMs).unref();
}
scheduleReset();

const base = await github.start(Number(values.port));
console.log(`fake GitHub at ${base}`);
console.log(`${github.stars.length} stars, user "dubu"`);
console.log(
  `allowance: ${values.anonymous}/h anonymous, ${values.authenticated}/h with a token`,
);
