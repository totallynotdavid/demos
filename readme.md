# demos

Eight small web demos in one Bun workspace. Each lives in `apps/<name>`, builds
on its own, and shares one lockfile, one lint config and one CI run. Most are
static front ends. `asistencia` adds a serverless function and `dokploy-status`
is a Bun server. Every package is private: nothing here is published or meant to
be imported.

## Run a demo

Install [Bun](https://bun.sh) (the workspace pins 1.4.2 in `mise.toml`), then:

```sh
bun install
cd apps/calendario
bun run dev
```

Vite prints the local URL. Every app has a `dev` script; `dokploy-status` is a
Bun server on port 3000 rather than a Vite app.

## Demos

| Demo                                  | What it is                                                      | Live                                    |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| [asistencia](apps/asistencia)         | Attendance form that records answers in a Google Form.          | https://asistencia-vert.vercel.app      |
| [blog](apps/blog)                     | Static SvelteKit blog with search.                              | https://demos-blog.vercel.app           |
| [calendario](apps/calendario)         | Work and rest calendar generator under seven rules.             | https://demos-calendario.vercel.app     |
| [dev3pack2](apps/dev3pack2)           | DevProof, a skills roadmap with challenges (React, no backend). | https://demos-dev3pack2.vercel.app      |
| [dokploy-status](apps/dokploy-status) | Public server monitoring page (Bun, Docker).                    |                                         |
| [postcard](apps/postcard)             | Postcard design editor with live preview (React).               | https://demos-postcard.vercel.app       |
| [starred-search](apps/starred-search) | Search the READMEs of your GitHub stars (React).                | https://demos-starred-search.vercel.app |
| [tim-apple](apps/tim-apple)           | App Store front page clone with mock data (SvelteKit).          | https://demos-tim-apple.vercel.app      |

## Documentation

- [Manual](docs/readme.md): the workspace layout and how the demos deploy.
- [dokploy-status manual](apps/dokploy-status/docs/readme.md): architecture, API
  and Docker deployment of the status server.
- [Contributing](.github/contributing.md): set up, check and add a demo.
