# Architecture

The repository is a Bun workspace (`workspaces: ["apps/*"]` in `package.json`).
Each folder in `apps/` is an independent demo. The apps share tooling and
nothing else: no app imports from another, and there is no shared package.

```text
apps/<name>/          one demo: its own package.json, scripts and readme
biome.json            lint and format rules for every app
tsconfig.base.json    compiler options the TypeScript apps extend
mise.toml             pinned tools and the tasks CI runs
bun.lock              the one lockfile
.github/              CI workflow, dependabot, contributing guide
docs/                 this manual
```

## Apps

The folder name and the package name differ for some apps. `bun run --filter`
takes the package name.

| Folder         | Package                   | Stack                       | Entry points                                 |
| -------------- | ------------------------- | --------------------------- | -------------------------------------------- |
| asistencia     | `asistencia-site`         | Vite, TypeScript            | `index.html`, `panel/index.html`, `api/*.ts` |
| blog           | `another-blog`            | SvelteKit, Svelte 5, mdsvex | `src/routes`                                 |
| calendario     | `calendario`              | Vite, TypeScript            | `src/main.ts` (page), `src/core` (generator) |
| dev3pack2      | `plena-react-starter-app` | Vite, React, Tailwind       | `src/main.tsx`                               |
| dokploy-status | `dokploy-status`          | Bun, no dependencies        | `src/index.ts`                               |
| postcard       | `a-nice-postcard`         | Vite, React, Tailwind       | `src/index.tsx` (the Vite root is `src`)     |
| starred-search | `starred-search`          | Vite, React, Tailwind       | `src/main.tsx`                               |
| tim-apple      | `tim-apples`              | SvelteKit, Svelte 5, Sass   | `src/routes`                                 |

Each app's readme describes what it does and how its code is organised.
`dokploy-status` also has a [manual](../apps/dokploy-status/docs/readme.md).

## What the tooling expects of an app

`mise.toml` defines the tasks `lint`, `typecheck`, `test` and `build`. Each runs
`bun run --filter '*' <script>`, so it runs the script of that name in every app
that has one and skips the rest. An app opts in by defining the script in its
`package.json`:

| Script      | Defined by                                                |
| ----------- | --------------------------------------------------------- |
| `lint`      | every app (`biome check .`)                               |
| `typecheck` | every app                                                 |
| `test`      | `asistencia` and `calendario` (`bun test`)                |
| `build`     | every app except `dokploy-status`, which runs from source |

`mise run check` runs all four tasks. `mise run fix` runs
`biome check --write .` over the repository.

## Shared configuration

- **Lint and format**: the root `biome.json` applies to every app. It reads
  `.gitignore` and skips `.agents`, `.claude`, `skills-lock.json` and SVG files.
  An app can relax rules in its own `biome.json` with `"extends": "//"`. `blog`,
  `dev3pack2` and `tim-apple` do, and `asistencia` skips its captured test
  fixtures; read their files for what they change.
- **TypeScript**: each app's `tsconfig.json` extends `tsconfig.base.json`. The
  SvelteKit apps also extend `$app/tsconfig` and typecheck with `svelte-check`.
- **Tools**: `mise.toml` pins `bun`, `biome` and `node`.

## asistencia: Google Forms ingestion

`asistencia` collects attendance through a Google Form and reads it back from
the Form's linked Sheet. The Sheet is read on the server with the query endpoint
behind Sheets' own charts, `/spreadsheets/d/<id>/gviz/tq?tqx=out:json`. It was
chosen over the alternatives for a teacher who sets this up alone:

| Path                | Setup for the owner                       | Why not                                                        |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| gviz JSON (chosen)  | Share the Sheet as "Anyone with link"     | Undocumented but stable for years; no key, no quota to manage  |
| Sheets API v4       | Cloud project, API key or service account | More steps for the same data; 300 reads per minute per project |
| Published CSV       | "Publish to web" and copy a CSV link      | Refreshes minutes late, and dates are locale-formatted strings |
| Apps Script webhook | Paste a script, deploy it, authorise it   | Most setup, and the owner maintains code in their Sheet        |

The response types its columns and sends dates as `Date(y,m,d,h,mi,s)` literals,
so parsing does not depend on the Sheet's locale.

Registration reads the Form page, takes the question ids and option text from
the data Google embeds in it, and posts to the Form's `formResponse` address.
That removes hard-coded field ids, at the cost of depending on that embedded
data keeping its shape; `test/fixtures/form.html` is a captured copy that the
tests parse.

### Shared caches

Two module-level caches are shared by every request a function instance serves.
Both are `promiseCache` instances (`api/_lib/cache.ts`) that store the promise
of a load, so concurrent requests join one request to Google.

| Cache | Key                      | Fresh for  | Filled by                         | Read by                                  |
| ----- | ------------------------ | ---------- | --------------------------------- | ---------------------------------------- |
| Sheet | origin, Sheet id and gid | 20 seconds | `loadTable` (`api/_lib/sheet.ts`) | `GET /api/attendance`                    |
| Form  | the `FORM_URL` address   | 5 minutes  | `loadForm` (`api/_lib/form.ts`)   | `GET /api/form` and `POST /api/register` |

An entry is in one of four states, and `promiseCache.get` and the entry's own
rejection handler are the only code that moves it:

| From              | To      | Moved by                                                                                |
| ----------------- | ------- | --------------------------------------------------------------------------------------- |
| absent or expired | pending | `get`, when no entry is younger than the TTL: it starts the load and stores the promise |
| pending           | fresh   | the load resolving; nothing is written, the stored promise just settles                 |
| pending           | absent  | the entry's own rejection handler, only if the key still holds that same entry          |
| fresh             | expired | time: `get` treats an entry older than the TTL as absent and replaces it                |
| any               | absent  | `clear`, called by `clearSheetCache` and `clearFormCache` (tests only)                  |

The TTL runs from the moment the load starts, not from when it settles. A failed
load is never served twice: the next request after the failure starts a new one.
The rejection handler compares entries rather than keys because a failure can
arrive after the key has been refilled (the entry expired or was cleared while
the load was in flight). Deleting by key would then evict the newer, good entry
and cost one extra request to Google. Nothing is shared between function
instances or survives a cold start, so each instance makes its own request per
TTL.

## Shared state in starred-search

`starred-search` keeps one IndexedDB database per browser. Every tab on the same
origin reads and writes it, so its states and who moves them are fixed here. The
code is in `apps/starred-search/src/lib`.

### The cache of one account

The `repos` and `meta` stores hold the stars of one login. The `meta` row
decides the state. A state is derived from the row and the clock, never stored
as a word.

| State   | Meaning                                                                                |
| ------- | -------------------------------------------------------------------------------------- |
| absent  | No `meta` row. The account has never been synced, or the cache was deleted.            |
| partial | `meta.resume` is set. A full sync stopped and keeps its cursor and generation.         |
| fresh   | Complete, and `syncedAt` is less than 5 minutes old.                                   |
| stale   | Complete, `syncedAt` is older, and `meta.detail` matches the source in use.            |
| due     | Complete, but `meta.detail` differs from the source in use, or `fullAt` is 7 days old. |

`meta.detail` is `full` when the cache was written with a token (READMEs and
lists) and `basic` when it was written without one. A cache is only valid for
the source that wrote it: adding a token and removing one both make it due.
Removing one also has a first step. Before the first request, the full sync
empties `readme` and `lists` of every repo and sets `meta.detail` to `basic`, in
that order. A sync that then stops at a rate limit or an error leaves a
`partial` cache with no token data, and `meta.detail` never says `full` over
basic data. The tab applies the same rule to what it shows, so a page without a
token never displays a cache's READMEs and lists.

Only three functions write these stores: `refresh`, `fullResync` and
`clearCache` in `src/lib/sync.ts`. Each holds the Web Lock
`starred-sync:<login>` for its whole run and asks for it with `ifAvailable`. A
second tab that cannot get it receives `busy` and writes nothing. The browser
releases the lock when a tab closes, so a crashed tab leaves a `partial` cache
and never a held lock.

| Transition              | Function     | Who asks, and when                                                                 |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------- |
| absent to partial       | `refresh`    | The page opening, the tab becoming visible, the rate-limit reset, Fetch stars.     |
| partial to partial      | `refresh`    | The same triggers. It stopped again at a rate limit or an error.                   |
| partial to fresh        | `refresh`    | The same triggers. The full sync reached the last page and pruned unstarred repos. |
| due to partial or fresh | `refresh`    | The same triggers, without asking the user.                                        |
| stale to fresh          | `refresh`    | The same triggers. One conditional request, then only the newer stars.             |
| stale to partial        | `refresh`    | The star total no longer adds up, so something was unstarred.                      |
| fresh to stale          | none         | Time passing. Nothing writes.                                                      |
| fresh or stale to fresh | `refresh`    | The Refresh button, which ignores the fresh window.                                |
| any complete to partial | `fullResync` | The user, with Fetch everything again. Never started automatically.                |
| any state to absent     | `clearCache` | The user, with Delete the cache. Never started automatically.                      |

The automatic triggers are `auto` syncs. They do nothing inside the fresh
window, nothing while the rate limit pauses them, and nothing after the user
deleted the cache. Only a user action (Refresh, Fetch stars, Fetch everything
again) makes a deleted cache `absent` to `partial` again.

### One tab's view

`StarredSession` (`src/lib/session.ts`) is the only caller of the three
functions. A tab is in one of these states:

| State   | Meaning                                                            | Leaves when                                       |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| loading | The cache has not been read yet.                                   | The read ends, or fails and shows the failure.    |
| idle    | Showing the cache. No sync runs.                                   | A sync starts.                                    |
| syncing | One of the three functions runs for this tab.                      | It returns. A failure also ends it, never sticks. |
| paused  | A rate limit stopped a sync. `auto` syncs wait for the reset time. | The reset timer fires, or the user asks.          |
| emptied | The user deleted the cache here or in another tab. `auto` is off.  | The user asks, or another tab fills the cache.    |

When a sync finishes or the cache is deleted, the tab announces it on the
BroadcastChannel `starred-search`. The other tabs of that account only read the
cache again. An announcement never starts a sync, so one tab deleting the cache
cannot make another tab download it again.

### The HTTP cache

The `http` store holds one record per GET: the body, its ETag and `fetchedAt`.
Activity requests use it through `cachedGet`. It has two states, absent and
stored, and no lock. Two tabs may revalidate the same record at once. Each
writes a whole valid record and the last write wins. "Delete the cache" does not
touch it.
