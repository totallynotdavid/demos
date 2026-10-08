/** 950 stays, 1234 is 1.2k, 15300 is 15k, 2400000 is 2.4M. */
export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  // 999,500 and up would round to "1000k".
  const [value, suffix] =
    count < 999_500 ? [count / 1000, "k"] : [count / 1_000_000, "M"];
  const text = value < 10 ? value.toFixed(1) : String(Math.round(value));
  return `${text.replace(/\.0$/, "")}${suffix}`;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long ago, in the largest whole unit: "just now", "5 min ago", "3 d ago". */
export function ago(then: number, now: number): string {
  const span = Math.max(0, now - then);
  if (span < MINUTE) return "just now";
  if (span < HOUR) return `${Math.floor(span / MINUTE)} min ago`;
  if (span < DAY) return `${Math.floor(span / HOUR)} h ago`;
  if (span < 60 * DAY) return `${Math.floor(span / DAY)} d ago`;
  return `${Math.floor(span / (30 * DAY))} mo ago`;
}

/** How long until, rounded up so it never reads 0 before the moment: "in 12 min". */
export function until(at: number, now: number): string {
  const span = Math.max(0, at - now);
  if (span < MINUTE) return `in ${Math.max(1, Math.ceil(span / SECOND))} s`;
  if (span < HOUR) return `in ${Math.ceil(span / MINUTE)} min`;
  return `in ${Math.ceil(span / HOUR)} h`;
}

const CLOCK = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export function clock(at: number): string {
  return CLOCK.format(at);
}

const DATE = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function day(iso: string): string {
  return DATE.format(new Date(iso));
}
