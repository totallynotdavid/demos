import { Gauge } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { clock, until } from "@/lib/format";
import type { ClientSnapshot, RateLimit, Resource } from "@/lib/github";

const LABELS: Record<Resource, string> = {
  core: "REST",
  graphql: "GraphQL",
};

function Bar({ limit, now }: { limit: RateLimit; now: number }) {
  const spent = limit.limit - limit.remaining;
  const share = limit.limit === 0 ? 0 : (spent / limit.limit) * 100;
  const out = limit.remaining === 0 && limit.resetAt > now;
  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-hover">
        <div
          className={`h-full ${out ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${share}%` }}
        />
      </div>
      <p className="text-[13px] text-dim">
        {out
          ? `Used up. Resets ${until(limit.resetAt, now)} at ${clock(limit.resetAt)}.`
          : `${limit.remaining} of ${limit.limit} left, resets at ${clock(limit.resetAt)}.`}
      </p>
    </div>
  );
}

function tightest(snapshot: ClientSnapshot, now: number) {
  const known = (Object.keys(LABELS) as Resource[])
    .map((resource) => ({ resource, limit: snapshot.limits[resource] }))
    .filter(
      (entry): entry is { resource: Resource; limit: RateLimit } =>
        entry.limit !== null && entry.limit.resetAt > now,
    );
  return known.sort(
    (a, b) =>
      a.limit.remaining / a.limit.limit - b.limit.remaining / b.limit.limit,
  )[0];
}

interface Props {
  snapshot: ClientSnapshot;
  hasToken: boolean;
}

export function LimitPill({ snapshot, hasToken }: Props) {
  const now = useNow(
    Object.values(snapshot.limits).some((limit) => limit !== null),
  );
  const worst = tightest(snapshot, now);
  const { counted, free, skipped } = snapshot.stats;
  const out = worst !== undefined && worst.limit.remaining === 0;
  const low =
    worst !== undefined && worst.limit.remaining / worst.limit.limit < 0.2;

  const tone = out
    ? "border-danger/40 bg-danger-soft text-danger"
    : low
      ? "border-warn/40 bg-warn-soft text-warn"
      : "text-dim";

  return (
    <>
      <button
        type="button"
        popoverTarget="limit-popover"
        className={`btn h-7 px-2 text-xs ${tone}`}
        aria-label="GitHub request limit"
      >
        <Gauge className="size-3.5" />
        {worst
          ? out
            ? `Limit reached, resets ${until(worst.limit.resetAt, now)}`
            : `${worst.limit.remaining} left`
          : `${counted} request${counted === 1 ? "" : "s"}`}
      </button>

      <div
        id="limit-popover"
        popover="auto"
        className="fixed inset-auto right-3 top-12 m-0 w-72 max-w-[calc(100vw-1.5rem)] space-y-3 rounded-lg border border-line bg-surface p-4 text-fg shadow-lg"
      >
        <p className="font-medium">GitHub requests</p>
        {(Object.keys(LABELS) as Resource[]).map((resource) => {
          const limit = snapshot.limits[resource];
          if (!limit && resource === "graphql" && !hasToken) return null;
          return (
            <div key={resource} className="space-y-1">
              <p className="text-[13px] font-medium">{LABELS[resource]}</p>
              {limit ? (
                <Bar limit={limit} now={now} />
              ) : (
                <p className="text-[13px] text-dim">Not used yet.</p>
              )}
            </div>
          );
        })}
        <p className="border-t border-line pt-3 text-[13px] text-dim">
          This page counted {counted}, skipped {skipped} while limited
          {hasToken ? `, and got ${free} free 304 answers` : ""}.
          {!hasToken &&
            " Without a token even a 304 counts, and the limit is 60 an hour. Add a token for 5,000."}
        </p>
      </div>
    </>
  );
}
