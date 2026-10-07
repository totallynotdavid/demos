# Deployment

Deploy dokploy-status as its own Dokploy application, on the host it monitors,
and build it from this app's [`Dockerfile`](../Dockerfile). The page and the API
have no authentication, so anyone who can reach the port can read them.

## Build and run with Docker

The Dockerfile copies the root `package.json` and `bun.lock`, so build from the
repository root:

```sh
docker build -t dokploy-status -f apps/dokploy-status/Dockerfile .
docker run --rm --network host dokploy-status
```

The container must use host networking. Network I/O is read from the network
namespace the process runs in, and on the default bridge network that is the
container's own `eth0`. The app detects this and shows a message in the network
card instead of numbers. Host networking publishes the port on the host
directly, so `-p` has no effect. To change the port, add `-e PORT=8080`.

The image is based on `oven/bun:1.4-alpine`. It installs only this app's
production dependencies from the frozen lockfile, runs as the unprivileged `bun`
user, and needs no volumes, database or environment beyond the port.

In Dokploy, create an application on the host it monitors. Set the Dockerfile
path to `apps/dokploy-status/Dockerfile` and the build context to the repository
root. Set the application's network to `host`, then open the page: the network
card shows numbers when the host's interfaces are visible.

## Configuration

| Variable | Default | Meaning                                                                                  |
| -------- | ------- | ---------------------------------------------------------------------------------------- |
| `PORT`   | `3000`  | TCP port the server listens on. It binds to `0.0.0.0`, on the host with host networking. |

The `Dockerfile` sets `PORT=3000`. To run without Docker, set the variable in
the shell, from this app's folder:

```sh
cd apps/dokploy-status
PORT=8080 bun run start
```

## What a container sees

The server reads `/proc`, `/sys` and the root filesystem of the environment it
runs in.

- CPU and memory come from `/proc`, which a container shares with the host.
- Block I/O is the sum of the whole physical disks, so partitions and stacked
  devices such as `dm-0` are not counted twice.
- Disk space is the root filesystem of the container, `/`.
- Network I/O is the sum of the physical interfaces, those with a `device` entry
  in `/sys/class/net`. With host networking these are the host's NICs; bridges
  and `veth` pairs are skipped so traffic is not counted twice. A container on
  the default bridge network sees only `lo` and its own virtual `eth0`. No
  physical interface is visible, so the card shows that it cannot see the host's
  network and gives no numbers.
