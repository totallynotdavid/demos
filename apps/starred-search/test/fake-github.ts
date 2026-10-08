import { createHash } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

export interface FakeStar {
  id: string;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  updatedAt: string;
  starredAt: string;
  readme: string | null;
}

export interface FakeList {
  id: string;
  name: string;
  repoIds: string[];
}

export interface LoggedRequest {
  method: string;
  path: string;
  status: number;
  resource: "core" | "graphql";
  /** True when GitHub would count it against the limit. */
  counted: boolean;
}

interface Limits {
  core: number;
  graphql: number;
}

type Resource = keyof Limits;

/**
 * Speaks the parts of the GitHub API the app uses, with GitHub's rate limit,
 * ETag and Link behaviour. Stars are ordered newest first, as GitHub does.
 */
export class FakeGitHub {
  /** The only login that exists. */
  user = "dubu";
  stars: FakeStar[] = [];
  lists: FakeList[] = [];
  events: object[] = [];
  languages = new Map<string, Record<string, number>>();
  requests: LoggedRequest[] = [];
  /** Requests allowed per hour, by whether the caller sent a token. */
  allowance = { anonymous: 60, authenticated: 5000 };
  /** Tokens GitHub answers 401 to, like a revoked or mistyped one. */
  rejectedTokens = new Set<string>();
  /** GraphQL answers 502 for pages larger than this. */
  maxFirst = 100;
  resetAt = Math.floor(Date.now() / 1000) + 3600;

  private used = new Map<string, number>();
  private server: Server | null = null;

  async start(port = 0): Promise<string> {
    const server = createServer((req, res) => void this.handle(req, res));
    this.server = server;
    await new Promise<void>((resolve) =>
      server.listen(port, "127.0.0.1", resolve),
    );
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  get counted(): LoggedRequest[] {
    return this.requests.filter((request) => request.counted);
  }

  star(entry: FakeStar) {
    this.stars = [entry, ...this.stars.filter((s) => s.id !== entry.id)];
    this.stars.sort((a, b) => b.starredAt.localeCompare(a.starredAt));
  }

  unstar(id: string) {
    this.stars = this.stars.filter((entry) => entry.id !== id);
  }

  /** Starts a new hour: every counter goes back to zero. */
  resetWindow(resetAt: number) {
    this.used.clear();
    this.resetAt = resetAt;
  }

  exhaust(resource: Resource, token: string | null) {
    this.used.set(this.bucket(resource, token), this.limitFor(token));
  }

  private limitFor(token: string | null): number {
    return token ? this.allowance.authenticated : this.allowance.anonymous;
  }

  private bucket(resource: Resource, token: string | null): string {
    return `${resource}:${token ?? "anonymous"}`;
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://fake");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "ETag, Link, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Used, Retry-After",
    );
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST");
      res.writeHead(204).end();
      return;
    }

    const token =
      req.headers.authorization?.replace(/^(Bearer|token) /, "") ?? null;
    const resource: Resource = url.pathname === "/graphql" ? "graphql" : "core";
    const bucket = this.bucket(resource, token);
    const limit = this.limitFor(token);
    const used = this.used.get(bucket) ?? 0;

    const log = (status: number, counted: boolean) =>
      this.requests.push({
        method: req.method ?? "GET",
        path: url.pathname + url.search,
        status,
        resource,
        counted,
      });

    const respond = (
      status: number,
      body: unknown,
      headers: Record<string, string> = {},
    ) => {
      // GitHub exempts a 304 from the limit only for an authorized request.
      const counted = status !== 304 || token === null;
      const nowUsed = counted ? used + 1 : used;
      if (counted) this.used.set(bucket, nowUsed);
      log(status, counted);
      res.writeHead(status, {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(Math.max(0, limit - nowUsed)),
        "X-RateLimit-Used": String(nowUsed),
        "X-RateLimit-Reset": String(this.resetAt),
        ...headers,
      });
      res.end(status === 304 ? undefined : JSON.stringify(body));
    };

    if (token !== null && this.rejectedTokens.has(token)) {
      respond(401, { message: "Bad credentials" });
      return;
    }

    if (used >= limit) {
      respond(403, { message: "API rate limit exceeded" });
      return;
    }

    if (resource === "graphql") {
      await this.graphql(req, respond);
      return;
    }
    this.rest(url, req, respond);
  }

  private rest(
    url: URL,
    req: IncomingMessage,
    respond: (s: number, b: unknown, h?: Record<string, string>) => void,
  ) {
    const path = url.pathname;
    const perPage = Number(url.searchParams.get("per_page") ?? 30);
    const page = Number(url.searchParams.get("page") ?? 1);

    const owner = /^\/users\/([^/]+)\//.exec(path)?.[1];
    if (owner !== undefined && owner !== this.user) {
      return respond(404, { message: "Not Found" });
    }

    let items: unknown[] | null = null;
    if (/^\/users\/[^/]+\/starred$/.test(path)) {
      items = this.stars.map((star) => ({
        starred_at: star.starredAt,
        repo: {
          node_id: star.id,
          name: star.name,
          full_name: `${star.owner}/${star.name}`,
          html_url: `https://github.com/${star.owner}/${star.name}`,
          description: star.description,
          language: star.language,
          topics: star.topics,
          stargazers_count: star.stars,
          updated_at: star.updatedAt,
          owner: { login: star.owner },
        },
      }));
    } else if (/^\/users\/[^/]+\/events\/public$/.test(path)) {
      items = this.events;
    } else if (/^\/repos\/[^/]+\/[^/]+\/languages$/.test(path)) {
      const known = this.languages.get(path.split("/").slice(2, 4).join("/"));
      if (!known) return respond(404, { message: "Not Found" });
      this.sendEtagged(req, respond, known);
      return;
    } else if (/^\/repos\/[^/]+\/[^/]+\/readme$/.test(path)) {
      const [owner, name] = path.split("/").slice(2, 4);
      const star = this.stars.find((s) => s.owner === owner && s.name === name);
      if (!star?.readme) return respond(404, { message: "Not Found" });
      return respond(200, {
        content: Buffer.from(star.readme).toString("base64"),
      });
    } else {
      return respond(404, { message: "Not Found" });
    }

    const lastPage = Math.max(1, Math.ceil(items.length / perPage));
    const slice = items.slice((page - 1) * perPage, page * perPage);
    const links: string[] = [];
    const link = (n: number, rel: string) => {
      const next = new URL(url);
      next.searchParams.set("page", String(n));
      links.push(`<${next}>; rel="${rel}"`);
    };
    if (page < lastPage) link(page + 1, "next");
    if (lastPage > 1) link(lastPage, "last");

    this.sendEtagged(
      req,
      respond,
      slice,
      links.length ? { Link: links.join(", ") } : {},
    );
  }

  private sendEtagged(
    req: IncomingMessage,
    respond: (s: number, b: unknown, h?: Record<string, string>) => void,
    body: unknown,
    headers: Record<string, string> = {},
  ) {
    const etag = `W/"${createHash("sha1").update(JSON.stringify(body)).digest("hex")}"`;
    if (req.headers["if-none-match"] === etag) {
      respond(304, null, { ETag: etag });
      return;
    }
    respond(200, body, { ETag: etag, ...headers });
  }

  private async graphql(
    req: IncomingMessage,
    respond: (s: number, b: unknown, h?: Record<string, string>) => void,
  ) {
    const raw = await new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
    });
    const { query, variables } = JSON.parse(raw) as {
      query: string;
      variables: Record<string, unknown>;
    };
    const operation = /query (\w+)/.exec(query)?.[1];

    if (
      (operation === "Starred" || operation === "Lists") &&
      variables.login !== this.user
    ) {
      return respond(200, {
        data: { user: null },
        errors: [{ type: "NOT_FOUND", message: "Could not resolve to a User" }],
      });
    }

    if (operation === "Starred") {
      const first = Number(variables.first);
      if (first > this.maxFirst) {
        return respond(502, { message: "Server Error" });
      }
      const offset = variables.after
        ? Number(atob(String(variables.after)))
        : 0;
      const slice = this.stars.slice(offset, offset + first);
      const end = offset + slice.length;
      return respond(200, {
        data: {
          user: {
            starredRepositories: {
              pageInfo: {
                hasNextPage: end < this.stars.length,
                endCursor: btoa(String(end)),
              },
              edges: slice.map((star) => ({
                starredAt: star.starredAt,
                node: {
                  id: star.id,
                  name: star.name,
                  nameWithOwner: `${star.owner}/${star.name}`,
                  url: `https://github.com/${star.owner}/${star.name}`,
                  description: star.description,
                  stargazerCount: star.stars,
                  updatedAt: star.updatedAt,
                  owner: { login: star.owner },
                  primaryLanguage: star.language
                    ? { name: star.language }
                    : null,
                  repositoryTopics: {
                    nodes: star.topics.map((name) => ({ topic: { name } })),
                  },
                  readme0: star.readme ? { text: star.readme } : null,
                  readme1: null,
                  readme2: null,
                  readme3: null,
                  readme4: null,
                },
              })),
            },
          },
        },
      });
    }

    if (operation === "Lists") {
      return respond(200, {
        data: {
          user: {
            lists: {
              nodes: this.lists.map((list) => ({
                id: list.id,
                name: list.name,
                items: itemsOf(list.repoIds, 0),
              })),
            },
          },
        },
      });
    }

    if (operation === "ListItems") {
      const list = this.lists.find((entry) => entry.id === variables.id);
      const offset = variables.after
        ? Number(atob(String(variables.after)))
        : 0;
      return respond(200, {
        data: { node: list ? { items: itemsOf(list.repoIds, offset) } : null },
      });
    }

    respond(200, { errors: [{ type: "UNKNOWN", message: "Unknown query" }] });
  }
}

function itemsOf(ids: string[], offset: number) {
  const slice = ids.slice(offset, offset + 100);
  const end = offset + slice.length;
  return {
    pageInfo: { hasNextPage: end < ids.length, endCursor: btoa(String(end)) },
    nodes: slice.map((id) => ({ id })),
  };
}

const LANGUAGES = [
  "TypeScript",
  "Rust",
  "Go",
  "Python",
  "Zig",
  null,
  "C",
  "Swift",
];
const TOPICS = [
  "cli",
  "web",
  "database",
  "compiler",
  "ui",
  "graphics",
  "ai",
  "devtools",
];
const WORDS = [
  "parser",
  "cache",
  "index",
  "stream",
  "render",
  "sync",
  "queue",
  "search",
  "lint",
  "bundler",
  "router",
  "socket",
  "vector",
  "tensor",
  "mesh",
  "shader",
];

/** Deterministic stars, newest first. */
export function makeStars(count: number, readmeChars = 8000): FakeStar[] {
  const start = Date.UTC(2020, 0, 1);
  const stars: FakeStar[] = [];
  for (let i = 0; i < count; i++) {
    const word = WORDS[i % WORDS.length];
    const second = WORDS[(i * 7 + 3) % WORDS.length];
    const owner = `owner${i % 97}`;
    const name = `${word}-${second}-${i}`;
    const body = Array.from(
      { length: Math.ceil(readmeChars / 60) },
      (_, line) =>
        `${WORDS[(i + line) % WORDS.length]} ${WORDS[(i * 3 + line * 5) % WORDS.length]} notes for ${name} line ${line}`,
    ).join("\n");
    stars.push({
      id: `R_${String(i).padStart(6, "0")}`,
      owner,
      name,
      description: `A ${word} for ${second} workloads`,
      language: LANGUAGES[i % LANGUAGES.length],
      topics: [TOPICS[i % TOPICS.length], TOPICS[(i * 3 + 1) % TOPICS.length]],
      stars: (i * 37) % 5000,
      updatedAt: new Date(start + i * 3_600_000 * 5).toISOString(),
      starredAt: new Date(start + i * 3_600_000 * 3).toISOString(),
      readme: `# ${name}\n\n${body}\n`,
    });
  }
  return stars.sort((a, b) => b.starredAt.localeCompare(a.starredAt));
}
