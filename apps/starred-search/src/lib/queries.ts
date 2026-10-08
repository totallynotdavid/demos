import type { Repo } from "./types";

/** READMEs are only searched when they are in the same response as the repo. */
const README_FILES = [
  "README.md",
  "readme.md",
  "Readme.md",
  "README",
  "README.rst",
];

const README_FIELDS = README_FILES.map(
  (file, index) =>
    `readme${index}: object(expression: "HEAD:${file}") { ... on Blob { text } }`,
).join("\n      ");

export const STARRED_QUERY = `
query Starred($login: String!, $first: Int!, $after: String) {
  user(login: $login) {
    starredRepositories(
      first: $first
      after: $after
      orderBy: { field: STARRED_AT, direction: DESC }
    ) {
      pageInfo { hasNextPage endCursor }
      edges {
        starredAt
        node {
          id
          name
          nameWithOwner
          url
          description
          stargazerCount
          updatedAt
          owner { login }
          primaryLanguage { name }
          repositoryTopics(first: 20) { nodes { topic { name } } }
          ${README_FIELDS}
        }
      }
    }
  }
}`;

export const LISTS_QUERY = `
query Lists($login: String!, $after: String) {
  user(login: $login) {
    lists(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        items(first: 100) {
          pageInfo { hasNextPage endCursor }
          nodes { ... on Repository { id } }
        }
      }
    }
  }
}`;

export const LIST_ITEMS_QUERY = `
query ListItems($id: ID!, $after: String) {
  node(id: $id) {
    ... on UserList {
      items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { ... on Repository { id } }
      }
    }
  }
}`;

export interface StarredEdge {
  starredAt: string;
  node: StarredNode;
}

export interface StarredData {
  user: {
    starredRepositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: StarredEdge[];
    };
  } | null;
}

interface StarredNode {
  id: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string | null;
  stargazerCount: number;
  updatedAt: string;
  owner: { login: string };
  primaryLanguage: { name: string } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  [alias: `readme${number}`]: { text?: string | null } | null;
}

export interface ListsData {
  user: {
    lists: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: { id: string; name: string; items: ListItems }[];
    };
  } | null;
}

export interface ListItemsData {
  node: { items?: ListItems } | null;
}

export interface ListItems {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: ({ id?: string } | null)[];
}

/** Keeps the search index and the cache bounded for pathological READMEs. */
export const MAX_README_CHARS = 100_000;

function readmeOf(node: StarredNode): string | null {
  for (let index = 0; index < README_FILES.length; index++) {
    const text = node[`readme${index}`]?.text;
    if (text) return text.slice(0, MAX_README_CHARS);
  }
  return null;
}

export function repoFromGraphql(edge: StarredEdge): Repo {
  const { node } = edge;
  return {
    id: node.id,
    owner: node.owner.login,
    name: node.name,
    fullName: node.nameWithOwner,
    url: node.url,
    description: node.description,
    language: node.primaryLanguage?.name ?? null,
    topics: node.repositoryTopics.nodes.map((entry) => entry.topic.name),
    stars: node.stargazerCount,
    updatedAt: node.updatedAt,
    starredAt: edge.starredAt,
    lists: [],
    readme: readmeOf(node),
  };
}

export interface RestStarred {
  starred_at: string;
  repo: {
    node_id: string;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    topics?: string[];
    stargazers_count: number;
    updated_at: string;
    owner: { login: string };
  };
}

export function repoFromRest(entry: RestStarred): Repo {
  const { repo } = entry;
  return {
    id: repo.node_id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at,
    starredAt: entry.starred_at,
    lists: [],
    readme: null,
  };
}
