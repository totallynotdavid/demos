# Architecture

dokploy-status is one Bun process. It samples host metrics every 5 seconds,
keeps ten minutes of samples in memory, and serves them as JSON to a static page
that draws the charts.

```text
/proc, statfs("/")
      │
  stats.ts      read one raw snapshot of cumulative counters
      │
  monitor.ts    every 5 s: turn counters into rates, keep 10 minutes
      │
  index.ts      /api/stats returns latest + history
      │
  public/index.html   polls /api/stats every 5 s and draws
```

## Code map

### `src/index.ts`

Loads `public/index.html` once at startup, starts the monitor, and serves two
routes with `Bun.serve` on `0.0.0.0`. The port comes from `PORT`. See
[API](api.md) for the routes.

### `src/monitor.ts`

Owns the history. `startMonitor` polls once, then every 5 seconds
(`POLL_INTERVAL_MS`).

- A poll turns the difference between two raw snapshots into bytes per second.
  The first poll has no earlier snapshot, so its rates are `0`. A negative
  difference, such as a counter reset, becomes `0`.
- Samples older than ten minutes (`HISTORY_WINDOW_MS`) are dropped on each poll.
- A poll that throws is logged and skipped. No sample is added.
- History lives in a module variable. Nothing is written to disk, so a restart
  clears it.

### `src/stats.ts`

Reads one raw snapshot. CPU, memory and block I/O come from
[`node-os-utils`](https://www.npmjs.com/package/node-os-utils) with its cache
off. Disk and network are read directly.

| Metric      | Source                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| CPU         | `node-os-utils` `cpu.usage()`. A failed read gives `0`.                                                               |
| Memory      | `node-os-utils` `memory.info()`, from `/proc/meminfo`. A failed read gives zeros.                                     |
| Disk        | `statfsSync("/")`. Used is `blocks - bfree`, free is `bavail`, as `df` reports.                                       |
| Network I/O | `/proc/net/dev`: receive bytes and transmit bytes summed over all interfaces except `lo`.                             |
| Block I/O   | `node-os-utils` `disk.stats()`: read and write bytes summed over all devices except `loop*`, `ram*`, `sr*` and `fd*`. |

Network and block counters are cumulative since boot. `monitor.ts` turns them
into rates.

### `public/index.html`

A single file with inline CSS and JavaScript, no build step. It fetches
`/api/stats` every 5 seconds, draws each chart on a canvas, and shows
"Reconnecting…" when no fetch has succeeded for 15 seconds.

## Dependencies

The only runtime dependency is `node-os-utils`. In `apps/dokploy-status`,
`bun run typecheck` runs `tsc` against [`tsconfig.json`](../tsconfig.json), and
`bun run lint` runs Biome.
