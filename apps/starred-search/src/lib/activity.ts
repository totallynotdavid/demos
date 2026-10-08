import { cachedGet } from "./cached-get";
import type { Store } from "./db";
import { ApiError, type GitHubClient, RateLimitError } from "./github";

const DAY_MS = 86_400_000;

/** GitHub keeps 90 days of public events, so longer ranges would be empty. */
export const RANGES = [
  { id: "3d", label: "3 days", days: 3 },
  { id: "1w", label: "1 week", days: 7 },
  { id: "1m", label: "1 month", days: 30 },
  { id: "3m", label: "3 months", days: 90 },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

export const EVENTS_PER_PAGE = 100;
/** GitHub serves at most 300 events, so three pages of 100 is everything. */
const MAX_EVENT_PAGES = 3;
const EVENTS_MAX_AGE_MS = 60_000;
const LANGUAGES_MAX_AGE_MS = DAY_MS;
export const LANGUAGE_REPOS = 10;

export interface ActivityEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    action?: string;
    commits?: unknown[];
    pull_request?: { merged?: boolean };
    review?: { state?: string };
  };
}

export interface LoadedEvents {
  events: ActivityEvent[];
  /** A rate limit stopped a refresh and older pages are served. */
  stale: boolean;
}

/**
 * Newest events first, back to `since`. The next page is asked for only while
 * the previous one has a next page and its oldest event is not older than
 * `since`.
 */
export async function loadEvents(
  client: GitHubClient,
  store: Store,
  login: string,
  options: { since: number; now?: () => number; signal?: AbortSignal },
): Promise<LoadedEvents> {
  const seen = new Set<string>();
  const events: ActivityEvent[] = [];
  let stale = false;

  for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
    const result = await cachedGet<ActivityEvent[]>(client, store, {
      key: `events:${login.toLowerCase()}:${page}`,
      path: `/users/${encodeURIComponent(login)}/events/public?per_page=${EVENTS_PER_PAGE}&page=${page}`,
      maxAgeMs: EVENTS_MAX_AGE_MS,
      now: options.now,
      signal: options.signal,
    });
    stale ||= result.stale;

    for (const event of result.body) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      events.push(event);
    }

    const oldest = result.body.at(-1);
    const reachedSince =
      oldest !== undefined && Date.parse(oldest.created_at) < options.since;
    if (!result.hasNext || reachedSince) break;
  }

  return { events, stale };
}

export interface ActivityStats {
  total: number;
  commits: number;
  pullRequests: { opened: number; merged: number; closed: number };
  issues: { opened: number; closed: number };
  comments: number;
  reviews: number;
  /** Repos by number of events, most active first. */
  repos: { name: string; count: number }[];
  /** Repos with comments, reviews or issues but no push. */
  collaborations: number;
  /** Events by local hour, 0 to 23. */
  hourly: number[];
  /** Events by local weekday, 0 is Sunday. */
  daily: number[];
}

export function analyze(
  events: ActivityEvent[],
  days: number,
  now: number,
): ActivityStats {
  const since = now - days * DAY_MS;
  const stats: ActivityStats = {
    total: 0,
    commits: 0,
    pullRequests: { opened: 0, merged: 0, closed: 0 },
    issues: { opened: 0, closed: 0 },
    comments: 0,
    reviews: 0,
    repos: [],
    collaborations: 0,
    hourly: new Array<number>(24).fill(0),
    daily: new Array<number>(7).fill(0),
  };
  const perRepo = new Map<string, number>();
  const pushed = new Set<string>();

  for (const event of events) {
    const at = new Date(event.created_at);
    if (at.getTime() < since) continue;

    const { action } = event.payload;
    switch (event.type) {
      case "PushEvent":
        stats.commits += event.payload.commits?.length || 1;
        pushed.add(event.repo.name);
        break;
      case "PullRequestEvent":
        if (action === "opened") stats.pullRequests.opened++;
        else if (action === "closed") {
          if (event.payload.pull_request?.merged) stats.pullRequests.merged++;
          else stats.pullRequests.closed++;
        } else continue;
        break;
      case "IssuesEvent":
        if (action === "opened") stats.issues.opened++;
        else if (action === "closed") stats.issues.closed++;
        else continue;
        break;
      case "IssueCommentEvent":
      case "PullRequestReviewCommentEvent":
      case "CommitCommentEvent":
        stats.comments++;
        break;
      case "PullRequestReviewEvent":
        stats.reviews++;
        break;
      default:
        continue;
    }

    stats.total++;
    stats.hourly[at.getHours()]++;
    stats.daily[at.getDay()]++;
    perRepo.set(event.repo.name, (perRepo.get(event.repo.name) ?? 0) + 1);
  }

  stats.repos = [...perRepo]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  stats.collaborations = stats.repos.filter(
    (repo) => !pushed.has(repo.name),
  ).length;
  return stats;
}

export interface LanguageShare {
  language: string;
  bytes: number;
  /** Whole percent of all bytes counted. */
  percent: number;
}

/**
 * Language bytes summed over the most active repos. Each repo is one request
 * the first time and none for a day after.
 */
export async function loadLanguages(
  client: GitHubClient,
  store: Store,
  repos: string[],
  options: { now?: () => number; signal?: AbortSignal } = {},
): Promise<LanguageShare[]> {
  const bytes = new Map<string, number>();

  for (const repo of repos.slice(0, LANGUAGE_REPOS)) {
    try {
      const result = await cachedGet<Record<string, number>>(client, store, {
        key: `languages:${repo.toLowerCase()}`,
        path: `/repos/${repo}/languages`,
        maxAgeMs: LANGUAGES_MAX_AGE_MS,
        now: options.now,
        signal: options.signal,
      });
      for (const [language, count] of Object.entries(result.body)) {
        bytes.set(language, (bytes.get(language) ?? 0) + count);
      }
    } catch (error) {
      if (error instanceof RateLimitError) break;
      // A deleted or private repo has no languages. Any other failure is real.
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
  }

  const sum = [...bytes.values()].reduce((a, b) => a + b, 0);
  return [...bytes]
    .map(([language, count]) => ({
      language,
      bytes: count,
      percent: sum === 0 ? 0 : Math.round((count / sum) * 100),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 6);
}
