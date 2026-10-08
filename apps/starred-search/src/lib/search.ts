import type { Repo } from "./types";

export type Sort = "relevance" | "starred" | "stars" | "updated";

export interface Filters {
  language: string | null;
  topics: string[];
  list: string | null;
}

export const NO_FILTERS: Filters = { language: null, topics: [], list: null };

/** A repo with its searchable fields lowercased once, not on every keystroke. */
interface Entry {
  repo: Repo;
  name: string;
  full: string;
  owner: string;
  description: string;
  language: string;
  topics: string[];
  readme: string;
}

export interface Index {
  entries: Entry[];
}

export interface Hit {
  repo: Repo;
  score: number;
}

export interface Facet {
  value: string;
  count: number;
}

export interface Facets {
  languages: Facet[];
  topics: Facet[];
  lists: Facet[];
}

export interface Result {
  hits: Hit[];
  facets: Facets;
  terms: string[];
}

export function buildIndex(repos: Repo[]): Index {
  return {
    entries: repos.map((repo) => ({
      repo,
      name: repo.name.toLowerCase(),
      full: repo.fullName.toLowerCase(),
      owner: repo.owner.toLowerCase(),
      description: (repo.description ?? "").toLowerCase(),
      language: (repo.language ?? "").toLowerCase(),
      topics: repo.topics.map((topic) => topic.toLowerCase()),
      readme: (repo.readme ?? "").toLowerCase(),
    })),
  };
}

/** Words, and phrases in double quotes, lowercased. Every term must match. */
export function parseQuery(query: string): string[] {
  const terms: string[] = [];
  for (const match of query.matchAll(/"([^"]*)"|(\S+)/g)) {
    const term = (match[1] ?? match[2]).trim().toLowerCase();
    if (term) terms.push(term);
  }
  return terms;
}

export function search(
  index: Index,
  query: string,
  filters: Filters,
  sort: Sort,
): Result {
  const terms = parseQuery(query);
  const matched: Hit[] = [];
  for (const entry of index.entries) {
    const score = scoreEntry(entry, terms);
    if (score !== null) matched.push({ repo: entry.repo, score });
  }

  const hits = matched.filter((hit) => passes(hit.repo, filters));
  hits.sort(comparator(sort, terms.length > 0));

  return { hits, facets: facetsOf(matched, filters), terms };
}

/** Null when a term is missing from every field. */
function scoreEntry(entry: Entry, terms: string[]): number | null {
  let score = 0;
  for (const term of terms) {
    const termScore = scoreTerm(entry, term);
    if (termScore === 0) return null;
    score += termScore;
  }
  return score;
}

function scoreTerm(entry: Entry, term: string): number {
  let score = 0;
  if (entry.name === term) score += 100;
  else if (entry.name.startsWith(term)) score += 60;
  else if (entry.name.includes(term)) score += 40;

  if (entry.owner.includes(term)) score += 10;
  if (term.includes("/") && entry.full.includes(term)) score += 60;
  if (entry.topics.includes(term)) score += 30;
  else if (entry.topics.some((topic) => topic.includes(term))) score += 12;
  if (entry.language === term) score += 20;
  if (entry.description.includes(term)) score += 20;

  if (entry.readme.includes(term))
    score += 2 + Math.min(countIn(entry.readme, term, 8), 8);
  return score;
}

/** Counts occurrences, stopping at `cap` so long READMEs stay cheap. */
function countIn(text: string, term: string, cap: number): number {
  let count = 0;
  let from = text.indexOf(term);
  while (from !== -1 && count < cap) {
    count++;
    from = text.indexOf(term, from + term.length);
  }
  return count;
}

function passes(repo: Repo, filters: Filters): boolean {
  return (
    matchesLanguage(repo, filters) &&
    matchesTopics(repo, filters) &&
    matchesList(repo, filters)
  );
}

const matchesLanguage = (repo: Repo, { language }: Filters) =>
  language === null || repo.language === language;

const matchesTopics = (repo: Repo, { topics }: Filters) =>
  topics.every((topic) => repo.topics.includes(topic));

const matchesList = (repo: Repo, { list }: Filters) =>
  list === null || repo.lists.includes(list);

function comparator(sort: Sort, hasQuery: boolean) {
  const byStars = (a: Hit, b: Hit) => b.repo.stars - a.repo.stars;
  const byStarredAt = (a: Hit, b: Hit) =>
    b.repo.starredAt.localeCompare(a.repo.starredAt);

  switch (sort) {
    case "relevance":
      return hasQuery
        ? (a: Hit, b: Hit) => b.score - a.score || byStars(a, b)
        : byStarredAt;
    case "starred":
      return byStarredAt;
    case "stars":
      return byStars;
    case "updated":
      return (a: Hit, b: Hit) =>
        b.repo.updatedAt.localeCompare(a.repo.updatedAt);
  }
}

/**
 * Each facet counts the query matches that pass every filter except its own,
 * so choosing a language still shows the other languages one click away.
 */
function facetsOf(matched: Hit[], filters: Filters): Facets {
  const languages = new Map<string, number>();
  const topics = new Map<string, number>();
  const lists = new Map<string, number>();
  const bump = (counts: Map<string, number>, value: string) =>
    counts.set(value, (counts.get(value) ?? 0) + 1);

  for (const { repo } of matched) {
    const topicOk = matchesTopics(repo, filters);
    const listOk = matchesList(repo, filters);
    const languageOk = matchesLanguage(repo, filters);

    if (repo.language && topicOk && listOk) bump(languages, repo.language);
    if (languageOk && listOk)
      for (const topic of repo.topics) bump(topics, topic);
    if (languageOk && topicOk) for (const list of repo.lists) bump(lists, list);
  }

  return {
    languages: ranked(languages),
    topics: ranked(topics),
    lists: ranked(lists),
  };
}

function ranked(counts: Map<string, number>): Facet[] {
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

const SNIPPET_WIDTH = 160;

/**
 * README lines that contain the most terms, cut around the first match.
 * Computed for the rows on screen only.
 */
export function snippets(repo: Repo, terms: string[], limit = 2): string[] {
  if (!repo.readme || terms.length === 0) return [];

  const scored: { line: string; hits: number; at: number }[] = [];
  for (const raw of repo.readme.split("\n")) {
    const lower = raw.toLowerCase();
    const found = terms.filter((term) => lower.includes(term));
    if (found.length === 0) continue;

    const line = raw.trim();
    if (!line) continue;
    scored.push({ line, hits: found.length, at: lower.indexOf(found[0]) });
  }

  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map(({ line, at }) => excerpt(line, at));
}

function excerpt(line: string, at: number): string {
  if (line.length <= SNIPPET_WIDTH) return line;
  const start = Math.max(0, at - SNIPPET_WIDTH / 3);
  const end = Math.min(line.length, start + SNIPPET_WIDTH);
  return `${start > 0 ? "…" : ""}${line.slice(start, end).trim()}${end < line.length ? "…" : ""}`;
}

export interface Segment {
  text: string;
  match: boolean;
}

/** Splits text so every occurrence of any term is its own matching segment. */
export function highlight(text: string, terms: string[]): Segment[] {
  const lower = text.toLowerCase();
  const spans: [number, number][] = [];
  for (const term of terms) {
    for (
      let at = lower.indexOf(term);
      at !== -1;
      at = lower.indexOf(term, at + term.length)
    ) {
      spans.push([at, at + term.length]);
    }
  }
  if (spans.length === 0) return [{ text, match: false }];

  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}
