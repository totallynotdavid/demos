# [web]: another blog template

I'm currently experimenting with SvelteKit (and Svelte 5) for a static blog and
still getting used to it. I'm loving the scoped styles.

**Features:**

- Dynamic posts from [`src/routes/blog/`](src/routes/blog/)
- Real-time search with highlighting via
  [`src/lib/state/search.svelte.ts`](src/lib/state/search.svelte.ts)
- Fully typed

<!-- prettier-ignore -->
| Home page | Search page |
| - | - |
| ![Home page showing the main layout and recent posts](static/preview-home-page.jpg) | ![Search results page displaying results for the keyword 'when', with matching terms highlighted](static/preview-search-page.jpg) |

**Getting started**

To install the dependencies:

```bash
bun install   # or npm
```

Run the server:

```bash
bun run dev
```

Open http://localhost:5173 in your browser.

**Build:**

```bash
bun run build
```

**Project structure**

```
src/
├─ app.html              # Main HTML template
├─ lib/
│  ├─ components/        # PostCard, SearchHighlight
│  ├─ state/             # search.svelte.ts
│  ├─ types/             # Post, SearchResult
│  └─ utils/             # Search helpers
└─ routes/
   ├─ +page.svelte       # Home page with post list
   ├─ +layout.svelte     # App layout
   └─ blog/              # Blog posts and routes
```
