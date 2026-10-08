# Deployment

## Web demos

Each web demo is its own Vercel project with Root Directory `apps/<name>`.
Vercel installs with Bun from the root `bun.lock`, builds with the app's `build`
script and serves the result. It skips a project's build when a push does not
affect it.

| Apps                                                        | `build` writes | Served as                          |
| ----------------------------------------------------------- | -------------- | ---------------------------------- |
| asistencia, calendario, dev3pack2, postcard, starred-search | `dist/`        | static files at `/`                |
| blog, tim-apple (SvelteKit with `@sveltejs/adapter-static`) | `build/`       | on Vercel, `.vercel/output/static` |

`asistencia` also deploys `api/attendance.ts`, `api/form.ts` and
`api/register.ts` as serverless functions, and builds two pages: `/` and
`/panel/`. Set these environment variables on its project; the Vite dev server
reads the same names from `apps/asistencia/.env`.

| Variable        | Required | Value                                                |
| --------------- | -------- | ---------------------------------------------------- |
| `SHEET_URL`     | yes      | Address of the Form's linked Sheet                   |
| `FORM_URL`      | yes      | The Form's link (`viewform` or `forms.gle`)          |
| `DASHBOARD_KEY` | no       | When set, `/panel/` asks for it before showing names |

The Sheet must be shared as "Anyone with the link" with Viewer access. Setup for
the Form and Sheet is in the [app readme](../apps/asistencia/readme.md).

### SvelteKit on Vercel

`adapter-static` detects Vercel through the `VERCEL` environment variable and
switches to zero-config mode. It then writes `.vercel/output` with a clean route
for each prerendered page, so `/blog/liminal-spaces` resolves without a trailing
slash. Any adapter option turns zero-config mode off, so `vite.config.ts` calls
`adapter()` with none.

To see the Vercel output locally:

```sh
cd apps/blog
VERCEL=1 bun run build
ls .vercel/output
```

## dokploy-status

`dokploy-status` is a Docker image built from the repository root, not a Vercel
project. See its [deployment guide](../apps/dokploy-status/docs/deployment.md).
