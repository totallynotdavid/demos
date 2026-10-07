# API

The server answers two routes. Every other path returns `404 Not Found`. The
routes do not check the HTTP method.

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
  "networkRxBytesPerSec": 5141316,
  "networkTxBytesPerSec": 178971,
  "blockReadBytesPerSec": 2527859,
  "blockWriteBytesPerSec": 3513781
}
```

The example is rounded. The server sends the full floating-point values.

| Field                                           | Unit           | Meaning                                                                |
| ----------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `timestamp`                                     | ms since epoch | When the poll ran.                                                     |
| `cpuUsagePercent`                               | percent        | CPU use of the host.                                                   |
| `memory.usedGB`, `memory.totalGB`               | GiB (1024³ B)  | Used is total minus `MemAvailable`.                                    |
| `memory.usedPercent`                            | percent        | `usedGB / totalGB`.                                                    |
| `disk.usedGB`, `disk.totalGB`, `disk.freeGB`    | GiB (1024³ B)  | The `/` filesystem. `freeGB` is the space available to non-root users. |
| `disk.usedPercent`                              | percent        | Used over total, with used as `df` reports it.                         |
| `networkRxBytesPerSec`, `networkTxBytesPerSec`  | bytes/s        | Received and sent, averaged since the previous sample.                 |
| `blockReadBytesPerSec`, `blockWriteBytesPerSec` | bytes/s        | Read and written by block devices, averaged since the previous sample. |

The four rates are `0` in the first sample after a start, and are never
negative. `GB` in a field name means GiB.

Where each value is read from is in [Architecture](architecture.md#srcstatsts).
