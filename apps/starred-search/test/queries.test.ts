import { validate } from "@octokit/graphql-schema";
import { describe, expect, it } from "vitest";
import {
  LIST_ITEMS_QUERY,
  LISTS_QUERY,
  repoFromGraphql,
  repoFromRest,
  STARRED_QUERY,
  type StarredEdge,
} from "../src/lib/queries";

describe("queries", () => {
  it.each([
    ["starred", STARRED_QUERY],
    ["lists", LISTS_QUERY],
    ["list items", LIST_ITEMS_QUERY],
  ])(
    "the %s query is valid against GitHub's GraphQL schema",
    (_name, query) => {
      expect(validate(query)).toEqual([]);
    },
  );

  it("rejects a query with a field GitHub does not have", () => {
    expect(validate('query { user(login: "x") { noSuchField } }')).not.toEqual(
      [],
    );
  });
});

function edge(readmes: Record<string, string | null>): StarredEdge {
  return {
    starredAt: "2026-02-03T00:00:00Z",
    node: {
      id: "R_1",
      name: "tool",
      nameWithOwner: "me/tool",
      url: "https://github.com/me/tool",
      description: null,
      stargazerCount: 7,
      updatedAt: "2026-02-01T00:00:00Z",
      owner: { login: "me" },
      primaryLanguage: null,
      repositoryTopics: { nodes: [{ topic: { name: "cli" } }] },
      readme0: null,
      readme1: null,
      readme2: null,
      readme3: null,
      readme4: null,
      ...Object.fromEntries(
        Object.entries(readmes).map(([key, text]) => [key, { text }]),
      ),
    },
  };
}

describe("repoFromGraphql", () => {
  it("takes the README from the first file name that exists", () => {
    const repo = repoFromGraphql(edge({ readme1: "lower", readme3: "plain" }));

    expect(repo.readme).toBe("lower");
  });

  it("has no README when no file name matched", () => {
    expect(repoFromGraphql(edge({})).readme).toBeNull();
  });

  it("caps a very large README", () => {
    const repo = repoFromGraphql(edge({ readme0: "x".repeat(300_000) }));

    expect(repo.readme).toHaveLength(100_000);
  });

  it("maps topics, language and star date", () => {
    expect(repoFromGraphql(edge({}))).toMatchObject({
      topics: ["cli"],
      language: null,
      starredAt: "2026-02-03T00:00:00Z",
      stars: 7,
      fullName: "me/tool",
    });
  });
});

describe("repoFromRest", () => {
  it("uses the node ID so a token switch keeps the same repo", () => {
    const repo = repoFromRest({
      starred_at: "2026-02-03T00:00:00Z",
      repo: {
        node_id: "R_1",
        name: "tool",
        full_name: "me/tool",
        html_url: "https://github.com/me/tool",
        description: "d",
        language: "Go",
        stargazers_count: 7,
        updated_at: "2026-02-01T00:00:00Z",
        owner: { login: "me" },
      },
    });

    expect(repo).toMatchObject({
      id: "R_1",
      topics: [],
      readme: null,
      lists: [],
    });
  });
});
