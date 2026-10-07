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

| Folder         | Package                   | Stack                       | Entry points                                   |
| -------------- | ------------------------- | --------------------------- | ---------------------------------------------- |
| asistencia     | `asistencia-site`         | Vite, plain JavaScript      | `index.html`, `src/main.js`, `api/register.js` |
| blog           | `another-blog`            | SvelteKit, Svelte 5, mdsvex | `src/routes`                                   |
| calendario     | `calendario`              | Vite, TypeScript            | `src/main.ts` (page), `src/core` (generator)   |
| dev3pack2      | `plena-react-starter-app` | Vite, React, Tailwind       | `src/main.tsx`                                 |
| dokploy-status | `dokploy-status`          | Bun, `node-os-utils`        | `src/index.ts`                                 |
| postcard       | `a-nice-postcard`         | Vite, React, Tailwind       | `src/index.tsx` (the Vite root is `src`)       |
| starred-search | `starred-search`          | Vite, React, Tailwind       | `src/main.tsx`                                 |
| tim-apple      | `tim-apples`              | SvelteKit, Svelte 5, Sass   | `src/routes`                                   |

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
| `typecheck` | every app except `asistencia`, which has no TypeScript    |
| `test`      | `calendario` only (`bun test`)                            |
| `build`     | every app except `dokploy-status`, which runs from source |

`mise run check` runs all four tasks. `mise run fix` runs
`biome check --write .` over the repository.

## Shared configuration

- **Lint and format**: the root `biome.json` applies to every app. It reads
  `.gitignore` and skips `.agents`, `.claude`, `skills-lock.json` and SVG files.
  An app can relax rules in its own `biome.json` with `"extends": "//"`. `blog`,
  `dev3pack2` and `tim-apple` do; read their files for what they change.
- **TypeScript**: each app's `tsconfig.json` extends `tsconfig.base.json`. The
  SvelteKit apps also extend `$app/tsconfig` and typecheck with `svelte-check`.
- **Tools**: `mise.toml` pins `bun`, `biome` and `node`.
