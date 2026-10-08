import {
  AlertTriangle,
  Database,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNow } from "@/hooks/use-now";
import type { Starred } from "@/hooks/use-starred";
import { ago, clock, formatCount, until } from "@/lib/format";
import {
  buildIndex,
  type Filters,
  NO_FILTERS,
  type Sort,
  search,
} from "@/lib/search";
import {
  hasFilters,
  parseView,
  type View,
  viewToSearch,
} from "@/lib/view-state";
import { ExportDialog } from "./export-dialog";
import { Facets } from "./facets";
import { RepoRow } from "./repo-row";

const PAGE = 50;
const LIST_ID = "results";

const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "starred", label: "Recently starred" },
  { value: "stars", label: "Most stars" },
  { value: "updated", label: "Recently updated" },
];

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "warn" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] ${
        tone === "warn"
          ? "border-warn/30 bg-warn-soft text-warn"
          : "border-danger/30 bg-danger-soft text-danger"
      }`}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
    </div>
  );
}

interface Props {
  login: string;
  hasToken: boolean;
  starred: Starred;
  onEditAccount(): void;
}

export function StarsView({ login, hasToken, starred, onEditAccount }: Props) {
  const {
    repos,
    loaded,
    syncing,
    progress,
    syncedAt,
    detail,
    incomplete,
    problem,
  } = starred;

  const [view, setView] = useState<View>(() => parseView(location.search));
  const [active, setActive] = useState(-1);
  const [shown, setShown] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const now = useNow(true, 15_000);
  const query = useDeferredValue(view.query);
  const index = useMemo(() => buildIndex(repos), [repos]);
  const result = useMemo(
    () => search(index, query, view.filters, view.sort),
    [index, query, view.filters, view.sort],
  );
  const { hits, facets, terms } = result;
  const shownRepos = useMemo(() => hits.map((hit) => hit.repo), [hits]);

  useEffect(() => {
    const url = `${location.pathname}${viewToSearch(view)}${location.hash}`;
    history.replaceState(null, "", url);
  }, [view]);

  // A new result list starts from the top with nothing chosen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on a new list
  useEffect(() => {
    setActive(-1);
    setShown(PAGE);
  }, [query, view.filters, view.sort]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setShown((count) => count + PAGE);
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active >= shown) setShown(active + PAGE);
    document
      .getElementById(`repo-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, shown]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "/" && !isTyping(event.target) && !event.metaKey) {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const update = useCallback((patch: Partial<View>) => {
    setView((current) => ({ ...current, ...patch }));
  }, []);
  const setFilters = useCallback(
    (filters: Filters) => update({ filters }),
    [update],
  );

  const toggleTopic = useCallback((topic: string) => {
    setView((current) => {
      const { topics } = current.filters;
      return {
        ...current,
        filters: {
          ...current.filters,
          topics: topics.includes(topic)
            ? topics.filter((entry) => entry !== topic)
            : [...topics, topic],
        },
      };
    });
  }, []);
  const pickLanguage = useCallback(
    (language: string) =>
      setView((current) => ({
        ...current,
        filters: {
          ...current.filters,
          language: current.filters.language === language ? null : language,
        },
      })),
    [],
  );
  const pickList = useCallback(
    (list: string) =>
      setView((current) => ({
        ...current,
        filters: {
          ...current.filters,
          list: current.filters.list === list ? null : list,
        },
      })),
    [],
  );

  const open = (position: number) => {
    const hit = hits[position];
    if (hit) window.open(hit.repo.url, "_blank", "noopener,noreferrer");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((current) => Math.min(current + 1, hits.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((current) => Math.max(current - 1, -1));
        break;
      case "Enter":
        if (active >= 0) open(active);
        else if (view.query) open(0);
        break;
      case "Escape":
        if (view.query) update({ query: "" });
        else if (active >= 0) setActive(-1);
        else event.currentTarget.blur();
        break;
    }
  };

  const activeCount =
    view.filters.topics.length +
    (view.filters.language ? 1 : 0) +
    (view.filters.list ? 1 : 0);
  const filtered = hasFilters(view.filters);
  const firstSync = repos.length === 0 && (!loaded || syncing);
  const limited = problem?.kind === "rate-limited" ? problem : null;

  const banners = (
    <>
      {limited && (
        <Banner tone="warn">
          <p className="font-medium">GitHub's request limit is used up.</p>
          <p>
            {repos.length > 0
              ? `Your ${formatCount(repos.length)} cached repos stay searchable. `
              : ""}
            Syncing resumes by itself {until(limited.resetAt, now)} (
            {clock(limited.resetAt)}).
            {!hasToken && (
              <>
                {" "}
                A token raises the limit from 60 to 5,000 an hour.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={onEditAccount}
                >
                  Add a token
                </button>
              </>
            )}
          </p>
        </Banner>
      )}
      {problem?.kind === "not-found" && (
        <Banner tone="danger">
          <p className="font-medium">GitHub has no user named {login}.</p>
          <button type="button" className="underline" onClick={onEditAccount}>
            Change the username
          </button>
        </Banner>
      )}
      {problem?.kind === "bad-token" && (
        <Banner tone="danger">
          <p className="font-medium">GitHub rejected the token.</p>
          <p>It may be expired or mistyped.</p>
          <button type="button" className="underline" onClick={onEditAccount}>
            Replace the token
          </button>
        </Banner>
      )}
      {(problem?.kind === "network" || problem?.kind === "error") && (
        <Banner tone="danger">
          <p className="font-medium">
            {problem.kind === "network"
              ? "Could not reach GitHub."
              : problem.message}
          </p>
          <button type="button" className="underline" onClick={starred.sync}>
            Try again
          </button>
        </Banner>
      )}
      {detail === "basic" && repos.length > 0 && !problem && (
        <p className="text-[13px] text-dim">
          Searching names, descriptions and topics. README text and star lists
          need a token.{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={onEditAccount}
          >
            Add one
          </button>
        </p>
      )}
    </>
  );

  if (repos.length === 0 && problem && !syncing) {
    return <div className="space-y-3">{banners}</div>;
  }

  return (
    <div className="space-y-3">
      {banners}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-2.5 size-4 text-dim"
          />
          <input
            ref={input}
            type="search"
            aria-controls={LIST_ID}
            aria-label="Search starred repositories"
            className="field pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            placeholder={
              repos.length > 0
                ? `Search ${formatCount(repos.length)} stars`
                : "Search stars"
            }
            value={view.query}
            onChange={(event) => update({ query: event.target.value })}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {view.query ? (
            <button
              type="button"
              className="absolute right-1 top-1 grid size-7 place-items-center rounded text-dim hover:bg-hover"
              aria-label="Clear search"
              onClick={() => {
                update({ query: "" });
                input.current?.focus();
              }}
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-2.5 hidden sm:inline-flex">
              /
            </kbd>
          )}
        </div>

        <select
          aria-label="Sort"
          className="field w-32 shrink-0 sm:w-auto"
          value={view.sort}
          onChange={(event) => update({ sort: event.target.value as Sort })}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn h-9 lg:hidden"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 ? activeCount : null}
          <span className="sr-only">Filters</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-dim">
        <p aria-live="polite">
          {syncing && progress
            ? `Fetching stars: ${formatCount(progress.fetched)} of ${formatCount(progress.total)}`
            : syncing
              ? "Checking GitHub…"
              : `${formatCount(hits.length)}${
                  hits.length === repos.length
                    ? ""
                    : ` of ${formatCount(repos.length)}`
                } repos`}
          {!syncing && incomplete && (
            <span>
              {" "}
              · sync paused at {formatCount(incomplete.fetched)} of{" "}
              {formatCount(incomplete.total)}
            </span>
          )}
          {!syncing && !incomplete && syncedAt !== null && (
            <span> · synced {ago(syncedAt, now)}</span>
          )}
        </p>
        {view.filters.language && (
          <button
            type="button"
            className="chip border-accent bg-accent-soft text-accent"
            onClick={() => setFilters({ ...view.filters, language: null })}
          >
            {view.filters.language} <X className="size-3" />
          </button>
        )}
        {view.filters.list && (
          <button
            type="button"
            className="chip border-accent bg-accent-soft text-accent"
            onClick={() => setFilters({ ...view.filters, list: null })}
          >
            ☰ {view.filters.list} <X className="size-3" />
          </button>
        )}
        {view.filters.topics.map((topic) => (
          <button
            key={topic}
            type="button"
            className="chip border-accent bg-accent-soft text-accent"
            onClick={() => toggleTopic(topic)}
          >
            {topic} <X className="size-3" />
          </button>
        ))}
        {filtered && (
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setFilters(NO_FILTERS)}
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost h-7 px-2 text-[13px]"
            disabled={syncing || repos.length === 0}
            onClick={() => setExporting(true)}
          >
            <Download className="size-3.5" />
            Export
          </button>
          <button
            type="button"
            className="btn btn-ghost h-7 px-2 text-[13px]"
            disabled={syncing}
            onClick={starred.sync}
            aria-label="Check GitHub for new stars"
          >
            <RefreshCw
              className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            popoverTarget="data-popover"
            className="btn btn-ghost h-7 w-7 px-0"
            aria-label="Cache options"
          >
            <Database className="size-3.5" />
          </button>
        </span>
      </div>

      <div
        id="data-popover"
        popover="auto"
        className="fixed inset-auto right-3 top-1/3 m-0 w-72 max-w-[calc(100vw-1.5rem)] space-y-3 rounded-lg border border-line bg-surface p-4 text-fg shadow-lg"
      >
        <p className="font-medium">Cache in this browser</p>
        <p className="text-[13px] text-dim">
          {formatCount(repos.length)} repos for {login}
          {detail === "full" ? ", with READMEs and lists" : ""}.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn justify-start"
            disabled={syncing}
            onClick={starred.resync}
          >
            Fetch everything again
          </button>
          <button
            type="button"
            className="btn justify-start text-danger"
            disabled={syncing}
            onClick={() => starred.clearCache()}
          >
            Delete the cache
          </button>
        </div>
        <p className="text-[13px] text-dim">
          Refresh asks GitHub about new stars. Fetching everything again also
          drops repos you have unstarred.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
        <aside
          className={`${filtersOpen ? "block" : "hidden"} mb-3 lg:sticky lg:top-16 lg:mb-0 lg:block lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto`}
          aria-label="Filters"
        >
          <Facets
            facets={facets}
            filters={view.filters}
            onChange={setFilters}
          />
        </aside>

        <div className="min-w-0">
          {firstSync ? (
            <ul
              className="overflow-hidden rounded-lg border border-line bg-surface"
              aria-busy="true"
              aria-label="Loading stars"
            >
              {Array.from({ length: 6 }, (_, position) => (
                <li
                  key={position}
                  className="space-y-2 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <div className="h-4 w-1/3 animate-pulse rounded bg-hover" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-hover" />
                </li>
              ))}
            </ul>
          ) : repos.length === 0 && loaded && !problem && syncedAt === null ? (
            <Empty
              title="Nothing cached"
              body={`The stars of ${login} are not stored in this browser.`}
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={syncing}
                  onClick={starred.sync}
                >
                  Fetch stars
                </button>
              }
            />
          ) : repos.length === 0 && loaded && !problem ? (
            <Empty
              title="No starred repositories"
              body={`${login} has not starred anything yet, or the stars are private.`}
            />
          ) : repos.length === 0 ? null : hits.length === 0 ? (
            <Empty
              title={
                terms.length > 0
                  ? `Nothing matches “${view.query.trim()}”`
                  : "No repo has all of these filters"
              }
              body={
                terms.length > 0
                  ? "Every word must match. Try fewer words, or quote a phrase."
                  : "Remove a filter to widen the results."
              }
              action={
                filtered ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setFilters(NO_FILTERS)}
                  >
                    Clear filters
                  </button>
                ) : view.query ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => update({ query: "" })}
                  >
                    Clear search
                  </button>
                ) : null
              }
            />
          ) : (
            <ul
              id={LIST_ID}
              aria-label="Results"
              className="overflow-hidden rounded-lg border border-line bg-surface"
            >
              {hits.slice(0, shown).map(({ repo }, position) => (
                <RepoRow
                  key={repo.id}
                  id={`repo-${position}`}
                  repo={repo}
                  terms={terms}
                  active={position === active}
                  topics={view.filters.topics}
                  onTopic={toggleTopic}
                  onLanguage={pickLanguage}
                  onList={pickList}
                />
              ))}
            </ul>
          )}
          <div ref={sentinel} className="h-px" />
          {hits.length > shown && (
            <p className="py-4 text-center text-[13px] text-dim">
              Showing {shown} of {formatCount(hits.length)}
            </p>
          )}
        </div>
      </div>

      <ExportDialog
        open={exporting}
        shown={shownRepos}
        all={repos}
        onClose={() => setExporting(false)}
      />
    </div>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-line px-4 py-14 text-center">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-dim">{body}</p>
      {action}
    </div>
  );
}
