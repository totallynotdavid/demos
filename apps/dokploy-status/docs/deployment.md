# Deployment

Deploy dokploy-status as its own Dokploy application, on the host it monitors,
and build it from this app's [`Dockerfile`](../Dockerfile). The page and the API
have no authentication, so anyone who can reach the port can read them.

## Build and run with Docker

The Dockerfile copies the root `package.json` and `bun.lock`, so build from the
repository root:

```sh
docker build -t dokploy-status -f apps/dokploy-status/Dockerfile .
docker run --rm -p 3000:3000 dokploy-status
```

The image is based on `oven/bun:1.4-alpine`. It installs only this app's
production dependencies from the frozen lockfile, runs as the unprivileged `bun`
user, and needs no volumes, database or environment beyond the port.

In Dokploy, create an application on the host it monitors. Set the Dockerfile
path to `apps/dokploy-status/Dockerfile` and the build context to the repository
root.

## Configuration

| Variable | Default | Meaning                                                |
| -------- | ------- | ------------------------------------------------------ |
| `PORT`   | `3000`  | TCP port the server listens on. It binds to `0.0.0.0`. |

The `Dockerfile` sets `PORT=3000` and exposes it. To run without Docker, set the
variable in the shell, from this app's folder:

```sh
cd apps/dokploy-status
PORT=8080 bun run start
```

## What a container sees

The server reads `/proc` and the root filesystem of the environment it runs in.

- CPU, memory and block I/O come from `/proc`, which a container shares with the
  host.
- Disk space is the root filesystem of the container, `/`.
- Network I/O is the sum of the interfaces in the container's network namespace,
  excluding `lo`. A container on the default bridge network sees only its own
  `eth0`.
