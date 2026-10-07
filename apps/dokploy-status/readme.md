# dokploy-status

A public, read-only status page for a server that runs
[Dokploy](https://dokploy.com). Visitors see live CPU, memory, disk space,
network I/O and block I/O without a Dokploy login. The server reads `/proc`,
`/sys` and the root filesystem. It does not use the Docker socket, so it shows
no Docker images, containers or volumes. It needs Linux and no elevated
privileges. In a container it needs host networking to see the host's network
traffic.

## Get started

The server runs on [Bun](https://bun.sh). Install the workspace at the
repository root, then start it from this folder:

```sh
bun install
cd apps/dokploy-status
bun run start
```

Open <http://localhost:3000> for the dashboard. The same data is available as
JSON:

```sh
curl -s localhost:3000/api/stats | jq .latest
```

```json
{
  "timestamp": 1791399978062,
  "cpuUsagePercent": 1.75,
  "memory": { "usedGB": 2.39, "totalGB": 7.43, "usedPercent": 32.22 },
  "disk": {
    "usedGB": 142.52,
    "totalGB": 1006.85,
    "freeGB": 813.12,
    "usedPercent": 14.15
  },
  "network": {
    "available": true,
    "rxBytesPerSec": 5141316,
    "txBytesPerSec": 178971
  },
  "blockReadBytesPerSec": 2527859,
  "blockWriteBytesPerSec": 3513781
}
```

The server returns unrounded numbers. `bun run dev` does the same as `start` and
restarts on file changes. `bun run test` runs the tests, and `bun run check`
runs the type check, lint and tests.

## Features

- CPU, memory and root-filesystem usage, each with a bar and a chart.
- Network and block I/O as bytes per second, as read and write charts. When the
  host's network interfaces are not visible, the network card says so instead of
  showing another namespace's traffic.
- Ten minutes of history, sampled every 5 seconds and kept in memory. A restart
  clears it.
- No login, no database and no configuration beyond the port. The container runs
  with host networking. The server listens on all interfaces and has no
  authentication, so everything it serves is public.
- A `Dockerfile` for deploying as its own Dokploy application.

## Documentation

- [Manual](docs/readme.md): the index of the pages below.
- [Architecture](docs/architecture.md): how the code is laid out and where each
  metric comes from.
- [API](docs/api.md): the routes and the `/api/stats` response.
- [Deployment](docs/deployment.md): build the image, run it, set the port.
