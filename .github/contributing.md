# Contributing

Read the [architecture](../docs/architecture.md) first: it says which folder
holds what and what the tooling expects of an app.

## Set up

[mise](https://mise.jdx.dev) installs the pinned tools (`bun`, `biome`, `node`
in `mise.toml`):

```sh
mise install
bun install
```

## Check a change

```sh
mise run check
mise run fix
```

`mise run lint`, `typecheck`, `test` and `build` run one step each. To work on a
single app, run its scripts from its folder, for example
`cd apps/calendario && bun run test`. From the root,
`bun run --filter calendario test` does the same by package name.

CI (`.github/workflows/ci.yml`) runs `bun install --frozen-lockfile` and
`mise run check` on every pull request and on pushes to `master`. Commit
`bun.lock` with any dependency change, or the frozen install fails. Dependabot
opens grouped weekly updates for dependencies and workflow actions.

Format Markdown with:

```sh
bunx prettier --print-width 80 --prose-wrap always --write path/to/file.md
```

## Add a demo

1. Create `apps/<name>/` with a `package.json` marked `"private": true` and the
   scripts the tooling expects, listed in the
   [architecture](../docs/architecture.md#what-the-tooling-expects-of-an-app).
   TypeScript apps extend `../../tsconfig.base.json`.
2. Run `bun install` at the root to update `bun.lock`.
3. Write `apps/<name>/readme.md` and add a row to the table in the
   [root readme](../readme.md).
4. Add a row to the apps table in the
   [architecture](../docs/architecture.md#apps).
5. To publish it, follow [deployment](../docs/deployment.md).
