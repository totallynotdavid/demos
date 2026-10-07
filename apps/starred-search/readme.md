# starred-search

Indexes the READMEs of a GitHub user's starred repositories and searches them.
It also summarizes the user's recent public activity and exports the index as
CSV.

Everything runs in the browser against the GitHub API. The optional personal
access token stays in the page and is sent only to `api.github.com`. Without a
token GitHub allows 60 requests per hour, with one 5,000.

```sh
bun install
cd apps/starred-search
bun run dev      # start the dev server
bun run build    # build to dist/
```

## Features

- **Index**: enter a username (and optionally a token). The app lists the user's
  starred repositories, 100 per request, then downloads each README five at a
  time. It shows progress and a count of repositories whose README could not be
  fetched. Indexing can be stopped.
  ([`src/lib/github-indexer.ts`](src/lib/github-indexer.ts))
- **Search**: matches the query against name, owner, description, language and
  README text. An exact phrase scores highest, then repositories that contain
  every term. Each result shows up to three matching README lines. Sort by
  relevance, stars or last update.
  ([`src/lib/search-index.ts`](src/lib/search-index.ts))
- **Activity**: counts commits, issues, pull requests, comments and reviews from
  a user's public events over the last 3 days, 1 week, 1 month, 3 months or 6
  months, with breakdowns by hour, weekday and language. It reads at most 1,000
  events (10 pages of 100).
  ([`src/lib/github-activity.ts`](src/lib/github-activity.ts))
- **Export**: downloads every indexed repository as CSV, not only the search
  results. Owner, name and full name are always included; description, language,
  stars, last update, URL and README text are optional columns.
  ([`src/lib/csv-exporter.ts`](src/lib/csv-exporter.ts))

The index lives in memory. Reloading the page clears it.
