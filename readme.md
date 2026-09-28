# demos

Small demos that share one Bun workspace, one lockfile, one lint config and one
CI run. Each demo lives in `apps/<name>` and keeps its own README.

| Demo                                  | What it is                                          | Live                               |
| ------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| [asistencia](apps/asistencia)         | Attendance form backed by a Google Form.            | https://asistencia-vert.vercel.app |
| [blog](apps/blog)                     | Static SvelteKit blog with search.                  | https://demos-blog.vercel.app      |
| [dev3pack2](apps/dev3pack2)           | DevProof, an AI-graded skills roadmap (React).      | https://demos-dev3pack2.vercel.app |
| [dokploy-status](apps/dokploy-status) | Public server monitoring page (Bun, Docker).        |                                    |
| [postcard](apps/postcard)             | Postcard design editor with live preview (React).   | https://demos-postcard.vercel.app  |
| [tim-apple](apps/tim-apple)           | App Store front page clone with mock data (Svelte). | https://demos-tim-apple.vercel.app |

## Develop

Tools are pinned in `mise.toml` (bun, biome, node). With
[mise](https://mise.jdx.dev) installed:

```sh
mise install
bun install
mise run check     # lint, typecheck and build every app
mise run fix       # format and apply safe lint fixes
```

Run one app with `bun run --filter <package> dev`, or `bun run dev` inside its
folder.

## Deploy

Pushes to `master` run `ci.yml` (`mise run check`).

Each web demo is its own Vercel project with Root Directory `apps/<app>`. It
installs with bun from the root `bun.lock`, builds with the app's `build` script
and serves the result. The Vite apps serve `dist` at `/`. The SvelteKit apps
(blog, tim-apple) build to `build/` locally. On Vercel, adapter-static's
zero-config mode writes `.vercel/output` with a clean route for each prerendered
page. Any adapter option turns that mode off, so call `adapter()` with none.
Vercel skips a project's build when a push does not affect it.

`dokploy-status` is a Docker image, built from the repository root with
`docker build -f apps/dokploy-status/Dockerfile .`.
