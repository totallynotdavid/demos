import { useEffect, useMemo, useState } from "react";
import { useNow } from "@/hooks/use-now";
import {
  type ActivityEvent,
  type ActivityStats,
  analyze,
  type LanguageShare,
  loadEvents,
  loadLanguages,
  RANGES,
  type RangeId,
} from "@/lib/activity";
import { clock, day, until } from "@/lib/format";
import { ApiError, type GitHubClient, RateLimitError } from "@/lib/github";
import { openStore } from "@/lib/shared-store";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

interface Loaded {
  events: ActivityEvent[];
  languages: LanguageShare[];
  stale: boolean;
  at: number;
}

function message(error: unknown): { text: string; resetAt?: number } {
  if (error instanceof RateLimitError) {
    return {
      text: "GitHub's request limit is used up.",
      resetAt: error.resetAt,
    };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { text: "GitHub has no public activity for this user." };
  }
  if (error instanceof ApiError && error.status === 0) {
    return { text: "Could not reach GitHub." };
  }
  return { text: error instanceof Error ? error.message : String(error) };
}

function Bars({
  values,
  labels,
  title,
}: {
  values: number[];
  labels: (position: number) => string;
  title: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <figure className="space-y-2">
      <figcaption className="text-[13px] font-medium">{title}</figcaption>
      <div
        className="flex h-24 items-end gap-0.5"
        role="img"
        aria-label={title}
      >
        {values.map((value, position) => (
          <div
            key={position}
            className="flex-1 rounded-sm bg-accent"
            style={{
              height: `${Math.max(2, (value / max) * 100)}%`,
              opacity: value ? 1 : 0.2,
            }}
            title={`${labels(position)}: ${value}`}
          />
        ))}
      </div>
    </figure>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <p className="text-xs text-dim">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

interface Props {
  login: string;
  client: GitHubClient;
}

export function ActivityView({ login, client }: Props) {
  const [range, setRange] = useState<RangeId>("1m");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<ReturnType<typeof message> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const now = useNow(error?.resetAt !== undefined);

  const days = RANGES.find((entry) => entry.id === range)?.days ?? 30;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` retries
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setLoaded(null);

    (async () => {
      const store = await openStore();
      const since = Date.now() - days * DAY_MS;
      const { events, stale } = await loadEvents(client, store, login, {
        since,
        signal: controller.signal,
      });
      const top = analyze(events, days, Date.now()).repos.map(
        (repo) => repo.name,
      );
      const languages = await loadLanguages(client, store, top, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setLoaded({ events, languages, stale, at: Date.now() });
      }
    })().catch((failure) => {
      if (!controller.signal.aborted) setError(message(failure));
    });

    return () => controller.abort();
  }, [client, login, days, attempt]);

  const stats: ActivityStats | null = useMemo(
    () => (loaded ? analyze(loaded.events, days, loaded.at) : null),
    [loaded, days],
  );
  const oldest = loaded?.events.at(-1)?.created_at;
  const truncated =
    loaded !== null &&
    oldest !== undefined &&
    Date.parse(oldest) > loaded.at - days * DAY_MS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight">
          Public activity of {login}
        </h1>
        <fieldset className="inline-flex rounded-md border border-line bg-surface p-0.5">
          <legend className="sr-only">Range</legend>
          {RANGES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={range === entry.id}
              onClick={() => setRange(entry.id)}
              className={`h-7 rounded px-2.5 text-[13px] ${
                range === entry.id ? "bg-fg text-bg" : "text-dim hover:bg-hover"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </fieldset>
      </div>

      {error && (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger"
        >
          <p className="font-medium">{error.text}</p>
          {error.resetAt !== undefined && (
            <p>
              It resets {until(error.resetAt, now)} ({clock(error.resetAt)}).
            </p>
          )}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt(attempt + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loaded && !error && (
        <div className="space-y-3" aria-busy="true">
          <p role="status" className="sr-only">
            Loading activity
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, position) => (
              <div
                key={position}
                className="h-16 animate-pulse rounded-lg bg-hover"
              />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-lg bg-hover" />
        </div>
      )}

      {loaded && stats && (
        <>
          {loaded.stale && (
            <p className="text-[13px] text-warn">
              GitHub's limit stopped a refresh, so this is the last copy kept
              here.
            </p>
          )}
          {truncated && oldest && (
            <p className="text-[13px] text-dim">
              GitHub serves only the latest 300 public events. This view goes
              back to {day(oldest)}.
            </p>
          )}

          {stats.total === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-4 py-14 text-center">
              <p className="font-medium">No public activity in this range</p>
              <p className="text-dim">Try a longer range.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Commits" value={stats.commits} />
                <Stat
                  label="Pull requests opened"
                  value={stats.pullRequests.opened}
                />
                <Stat
                  label="Pull requests merged"
                  value={stats.pullRequests.merged}
                />
                <Stat label="Issues opened" value={stats.issues.opened} />
                <Stat label="Comments" value={stats.comments} />
                <Stat label="Reviews" value={stats.reviews} />
                <Stat label="Repos touched" value={stats.repos.length} />
                <Stat label="Collaborations" value={stats.collaborations} />
              </div>

              <div className="grid gap-6 rounded-lg border border-line bg-surface p-4 md:grid-cols-2">
                <Bars
                  title="By hour of day"
                  values={stats.hourly}
                  labels={(hour) => `${hour}:00`}
                />
                <Bars
                  title="By weekday"
                  values={stats.daily}
                  labels={(weekday) => WEEKDAYS[weekday]}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="space-y-2 rounded-lg border border-line bg-surface p-4">
                  <h2 className="text-[13px] font-medium">Most active repos</h2>
                  <ol className="space-y-1">
                    {stats.repos.slice(0, 8).map((repo) => (
                      <li
                        key={repo.name}
                        className="flex justify-between gap-3"
                      >
                        <a
                          className="truncate text-accent hover:underline"
                          href={`https://github.com/${repo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {repo.name}
                        </a>
                        <span className="tabular-nums text-dim">
                          {repo.count}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="space-y-2 rounded-lg border border-line bg-surface p-4">
                  <h2 className="text-[13px] font-medium">
                    Languages in those repos
                  </h2>
                  {loaded.languages.length === 0 ? (
                    <p className="text-dim">No language data.</p>
                  ) : (
                    <ul className="space-y-1">
                      {loaded.languages.slice(0, 8).map((entry) => (
                        <li
                          key={entry.language}
                          className="flex justify-between gap-3"
                        >
                          <span>{entry.language}</span>
                          <span className="tabular-nums text-dim">
                            {entry.percent}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
