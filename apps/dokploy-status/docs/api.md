# API

The server answers two routes with `GET` and `HEAD`. Any other method on them
returns `405 Method Not Allowed` with `Allow: GET, HEAD`. Every other path
returns `404 Not Found`, whatever the method.

| Route        | Response                                                    |
| ------------ | ----------------------------------------------------------- |
| `/`          | The dashboard, [`public/index.html`](../public/index.html). |
| `/api/stats` | `application/json`: the latest sample and the history.      |

## `/api/stats`

```json
{
  "latest": { "...": "a sample" },
  "history": [{ "...": "a sample" }]
}
```

- `history` holds the samples of the last ten minutes, oldest first. A new
  sample arrives every 5 seconds, so it holds up to about 120.
- `latest` is the last element of `history`. It is `null`, with an empty
  `history`, until the first poll completes.

### Sample

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

The example is rounded. The server sends the full floating-point values.

| Field                                            | Unit           | Meaning                                                                           |
| ------------------------------------------------ | -------------- | --------------------------------------------------------------------------------- |
| `timestamp`                                      | ms since epoch | When the poll ran.                                                                |
| `cpuUsagePercent`                                | percent        | CPU use of the host: the busy share of the `/proc/stat` time between two polls.   |
| `memory.usedGB`, `memory.totalGB`                | GiB (1024³ B)  | Used is total minus `MemAvailable`.                                               |
| `memory.usedPercent`                             | percent        | `usedGB / totalGB`.                                                               |
| `disk.usedGB`, `disk.totalGB`, `disk.freeGB`     | GiB (1024³ B)  | The `/` filesystem. `freeGB` is the space available to non-root users.            |
| `disk.usedPercent`                               | percent        | Used over total, with used as `df` reports it.                                    |
| `network.available`                              | boolean        | `false` when only a container network namespace is visible. See below.            |
| `network.rxBytesPerSec`, `network.txBytesPerSec` | bytes/s        | Received and sent by physical interfaces, averaged since the previous sample.     |
| `network.reason`                                 | text           | Present only when `available` is `false`: why the host's network cannot be shown. |
| `blockReadBytesPerSec`, `blockWriteBytesPerSec`  | bytes/s        | Read and written by whole physical disks, averaged since the previous sample.     |

`network` is one of two shapes. With `available: true` it has the two rates.
With `available: false` it has only `reason`, and there are no rates. That is
the case when no physical interface is visible, as in a container on the bridge
network. Run the container with host networking.

The rates and `cpuUsagePercent` are `0` in the first sample after a start, and
the rates are never negative. `GB` in a field name means GiB.

Where each value is read from is in [Architecture](architecture.md#srcstatsts).
