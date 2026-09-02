# dokploy-status

Public, read-only server monitoring page. Mirrors Dokploy's own host-monitoring
view (CPU, memory, disk, block I/O, network I/O) for external visitors, without
needing a Dokploy login.

Stats use `node-os-utils` to read `/proc`, matching Dokploy's host monitoring
without Docker socket access or elevated privileges.
The Docker Disk Usage card (images/containers/volumes) is intentionally not
included since it needs Docker socket access.

## Run

```
bun install
bun run start
```

Use `bun run dev` for development with file watching.

Serves the page and its data at:

- `GET /`: the dashboard
- `GET /api/stats`: current snapshot + in-memory history, as JSON

Configurable via `PORT` (defaults to `3000`). History resets on restart;
nothing is persisted to disk.

## Deploy

Deploy as its own app via Dokploy, on the same host it monitors, using the
included `Dockerfile`. No auth, no database, no external dependencies beyond
the host it's running on.
