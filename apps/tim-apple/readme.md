# tim-apple

A clone of the App Store "Today" front page, built with SvelteKit and Svelte 5.
All content is mock data, and images are placeholders from
[placehold.co](https://placehold.co), so the page needs network access to show
them. Every page is prerendered.

```sh
bun install
cd apps/tim-apple
bun run dev       # start the dev server
bun run build     # prerender the site to build/
bun run preview   # serve build/ locally
```

## Pages

| Route           | Page                                          |
| --------------- | --------------------------------------------- |
| `/`             | Today: story cards and app shelves            |
| `/article/[id]` | A story with text, images and linked apps     |
| `/product/[id]` | An app page with badges, screenshots, ratings |
| `/search`       | Search box and suggested searches             |

Every page reads from [`src/lib/data/mock-data.ts`](src/lib/data/mock-data.ts).
The `[id]` segment does not select content: every article URL shows the same
story and every product URL the same app. The search box does not filter; it
echoes the query.

Components live in [`src/lib/components`](src/lib/components), grouped as
`items` (cards, badges, media), `layout` (navigation, footer) and `shared`
(grid, shelf, artwork, rating). Styles are Sass under
[`src/lib/styles`](src/lib/styles).
