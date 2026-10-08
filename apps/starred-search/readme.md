# starred-search

Search the repositories a GitHub user has starred. Name, owner, description,
topics, language and, with a token, the README and your star lists.

Everything runs in the browser. The stars are fetched once, kept in IndexedDB,
and every search runs over that copy. The token stays in the page and is sent
only to the GitHub API.

```sh
bun install
cd apps/starred-search
bun run dev      # start the dev server
bun run build    # build to dist/
bun run test     # behavior tests for the cache, sync and search
```

## Features

- **Search** is instant and local. Every word must match. Quote a phrase to
  match it exactly. Name and owner count for more than topics, description and
  README text. Results show the matching lines of the README.
- **Filters** by language, topic and star list. Each count shows what is left if
  you pick it, and the filter you changed does not hide its own alternatives.
  Sort by relevance, star date, stars or last update.
- **Link to a search**: the query, filters and sort are in the address bar.
- **Keyboard**: `/` focuses the search box. `↑` and `↓` move through the
  results. `Enter` opens the highlighted repository, or the first result while
  you type. `Esc` clears the query, then the highlight, then leaves the box.
- **Rate limit** state is shown next to the search box: what is left, when it
  resets, and what the app used. When GitHub refuses a request the app keeps
  searching the cache and resumes by itself at the reset time.
- **Activity** counts commits, issues, pull requests, comments and reviews from
  the public events of a user over 3 days, 1 week, 1 month or 3 months, with
  breakdowns by hour, weekday and language. GitHub keeps at most 300 events.
- **Export** downloads the repositories as CSV with the columns you choose.

## Token

Without a token GitHub allows 60 requests per hour from your address and gives
no READMEs or lists. With a token the app uses GraphQL, which returns 100 repos
with their READMEs and topics per request, and the list names.

A token needs no scopes for public stars. Tokens are kept for the tab by
default. Tick "Keep the token on this device" to store it in `localStorage`.

## Sync and cache

One cache per account, in IndexedDB. Only three functions in
[`src/lib/sync.ts`](src/lib/sync.ts) write it: `refresh`, `fullResync` and
`clearCache`. Each takes the Web Lock `starred-sync:<login>` without waiting, so
two tabs never write at once. The loser reports `busy`, and the page reads what
the winner stored.

The states of the cache, and who may move each transition, are in
[Shared state in starred-search](../../docs/architecture.md#shared-state-in-starred-search).
In short:

- A cache less than 5 minutes old is served with no request.
- An older one costs one conditional request, and then only the newer stars.
- A new, unfinished, or week-old cache is rewritten in full. So is one written
  with a different kind of access: a token that arrives brings READMEs and
  lists, and a token that goes away drops them.
- Opening the page and showing the tab again sync by themselves. Refresh, Fetch
  everything again and Delete the cache are the user's. A deleted cache stays
  empty until you ask for it.

How a stale cache is brought up to date:

1. A conditional request for one star carries the stored ETag. With a token, a
   `304 Not Modified` does not count against the limit. Without one, it does.
2. When the list changed, pages are read newest first and stop at the first star
   already stored. Only the newer stars are stored, and only after the walk, so
   an interrupted walk leaves the cache as it was.
3. If the total no longer equals the stored total plus the new stars, something
   was unstarred. The app then does a full sync, which drops every repo it did
   not see.

Unstars of old repos are not seen by step 2. They are caught by the total in
step 3, by the weekly full sync, or by **Fetch everything again**.

A rate limit stops a sync with the cache intact. The page shows the reset time,
keeps the search working, and starts again at the reset. The primary limit comes
from `x-ratelimit-*` headers and the secondary limit from `retry-after`. When no
requests remain, the app does not send more.

Other tabs on the same account hear about a finished sync or a cleared cache
through a `BroadcastChannel` and read the cache again. They do not sync because
of it.

## Development

`bun run mock` starts a fake GitHub on port 4010 with REST, GraphQL, ETags, rate
limits and 1,694 stars (`--stars` changes it). Point the app at it:

```sh
VITE_GITHUB_API_URL=http://127.0.0.1:4010 bun run dev
```

The tests run the real cache against `fake-indexeddb` and the real sync against
the same fake GitHub, so they check requests, counts and stored data.

`bun test/measure.ts <login> [api-url]` prints every request of a session with
the remaining limit GitHub reported: a cold open, a reopen inside the fresh
window, a reopen after ten minutes, and two loads of the activity view. Set
`GITHUB_TOKEN` to measure the token path.
