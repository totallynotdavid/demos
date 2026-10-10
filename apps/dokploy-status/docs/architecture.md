# Architecture

dokploy-status is one Bun process. It samples host metrics every 5 seconds,
keeps ten minutes of samples in memory, and serves them as JSON to a static page
that draws the charts.

```text
/proc, /sys, statfs("/")
      │
  stats.ts      read one raw snapshot of cumulative counters
      │
  monitor.ts    every 5 s: turn counters into rates, keep 10 minutes
      │
  server.ts     /api/stats returns latest + history
      │
  public/index.html   polls /api/stats every 5 s and draws
```

## Code map

### `src/index.ts`

Starts the monitor and the server on the port from `PORT`, and logs the URL.

### `src/server.ts`

`createServer(port)` loads `public/index.html` and serves two routes with
`Bun.serve` on `0.0.0.0`. Each route handles `GET`, and Bun answers `HEAD` for
it. A `fetch` fallback returns `405` with `Allow: GET, HEAD` for another method
on a known path, and `404` for an unknown path. See [API](api.md) for the
routes.

### `src/monitor.ts`

Owns the history. `startMonitor` polls once, then every 5 seconds
(`POLL_INTERVAL_MS`).

- A poll turns the difference between two raw snapshots into rates
  (`computeSample`). Network and block rates are summed per device, over the
  devices present in both snapshots. The first poll has no earlier snapshot, so
  its rates are `0`. A negative difference, such as a counter reset, and a
  device that appears between polls add `0`.
- Samples older than ten minutes (`HISTORY_WINDOW_MS`) are dropped on each poll.
- A poll that throws is logged and skipped. No sample is added.
- History lives in a module variable. Nothing is written to disk, so a restart
  clears it.

### `src/stats.ts`

Reads one raw snapshot directly from `/proc`, `/sys` and the filesystem. A
failed CPU, memory, disk, block or `/proc/net/dev` read throws, and the poll
that called it is skipped. A failed read of `/sys/class/net` does not throw: the
snapshot reports the network as unavailable, with the error as `reason`.

Sysfs marks hardware with a `device` entry. Bridges, `veth` pairs, loop and
device-mapper devices, and partitions have none, so counting only entries that
have one avoids counting the same traffic twice.

| Metric      | Source                                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU         | `/proc/stat`: busy and total jiffies. `monitor.ts` takes the busy share between two snapshots.                                               |
| Memory      | `MemTotal` and `MemAvailable` from `/proc/meminfo`.                                                                                          |
| Disk        | `statfsSync("/")`. Used is `blocks - bfree`, free is `bavail`, as `df` reports.                                                              |
| Network I/O | `/proc/net/dev`: receive and transmit bytes of interfaces with a `device` entry in `/sys/class/net`. With none, the snapshot is unavailable. |
| Block I/O   | `/proc/diskstats`: sectors read and written, times 512, of whole disks with a `device` entry in `/sys/block`.                                |

CPU, network and block counters are cumulative since boot. `monitor.ts` turns
them into rates.

### `public/index.html`

A single file with inline CSS and JavaScript, no build step. It fetches
`/api/stats` every 5 seconds, draws each chart on a canvas, and shows
"Reconnecting…" when no fetch has succeeded for 15 seconds.

## Dependencies

There are no runtime dependencies.
