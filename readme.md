# demos

Small demos that share one Bun workspace, one lockfile, one lint config and one
CI run. Each demo lives in `apps/<name>` and keeps its own README.

| Demo                                  | What it is                                          | Live                                               |
| ------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| [asistencia](apps/asistencia)         | Attendance form backed by a Google Form.            | https://asistencia-vert.vercel.app                 |
| [blog](apps/blog)                     | Static SvelteKit blog with search.                  | https://totallynotdavid.github.io/demos/blog/      |
| [dev3pack2](apps/dev3pack2)           | DevProof, an AI-graded skills roadmap (React).      | https://totallynotdavid.github.io/demos/dev3pack2/ |
| [dokploy-status](apps/dokploy-status) | Public server monitoring page (Bun, Docker).        |                                                    |
| [postcard](apps/postcard)             | Postcard design editor with live preview (React).   | https://totallynotdavid.github.io/demos/postcard/  |
| [tim-apple](apps/tim-apple)           | App Store front page clone with mock data (Svelte). | https://totallynotdavid.github.io/demos/tim-apple/ |

## Develop

Tools are pinned in `mise.toml` (bun, biome, node). With
[mise](https://mise.jdx.dev) installed:

```sh
mise install
bun install
mise run check     # lint, typecheck and build every app
mise run fix       # format and apply safe lint fixes
mise run pages     # build the GitHub Pages site into _site/
```

Run one app with `bun run --filter <package> dev`, or `bun run dev` inside its
folder.

## Deploy

Pushes to `master` run `ci.yml` (`mise run check`) and `pages.yml`. The Pages
site is built from the static demos (`blog`, `dev3pack2`, `postcard`,
`tim-apple`) into one artifact, each under `/demos/<app>/`. The repository's
Pages source must be **GitHub Actions**.

`asistencia` and `dokploy-status` deploy outside GitHub. Both platforms were set
up against the old single-app repositories, so each needs these changes in its
own settings:

- **Vercel (`asistencia`)**: connect the project to this repository and set
  **Root Directory** to `apps/asistencia`. Keep **Include source files outside
  of the Root Directory** enabled so Vercel finds the root `bun.lock`. The build
  (`vite build`, output `dist`) and the `api/register.js` function are
  unchanged.
- **Dokploy (`dokploy-status`)**: point the application at this repository,
  branch `master`, with build type **Dockerfile**. Set **Docker File** to
  `apps/dokploy-status/Dockerfile` and **Docker Context Path** to `.` (the
  repository root). The image needs the root `package.json` and `bun.lock`, so
  building with the app folder as the context no longer works.
