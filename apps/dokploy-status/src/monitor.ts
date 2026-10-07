import { type Counters, collectSnapshot, type Snapshot } from "./stats";

const POLL_INTERVAL_MS = 5_000;
const HISTORY_WINDOW_MS = 10 * 60 * 1000;

export type NetworkSample =
  | { available: true; rxBytesPerSec: number; txBytesPerSec: number }
  | { available: false; reason: string };

export interface Sample {
  timestamp: number;
  cpuUsagePercent: number;
  memory: Snapshot["memory"];
  disk: Snapshot["disk"];
  // Expose rates for charting instead of cumulative counters.
  network: NetworkSample;
  blockReadBytesPerSec: number;
  blockWriteBytesPerSec: number;
}

let history: Sample[] = [];
let previous: Snapshot | null = null;

// A rate uses counters present in both snapshots. Resets and newly appearing
// devices contribute zero.
function counterRates(
  before: Counters,
  after: Counters,
  deltaMs: number,
): [number, number] {
  if (deltaMs <= 0) return [0, 0];
  let first = 0;
  let second = 0;
  for (const [name, [now0, now1]] of Object.entries(after)) {
    const then = before[name];
    if (!then) continue;
    first += Math.max(0, now0 - then[0]);
    second += Math.max(0, now1 - then[1]);
  }
  return [(first / deltaMs) * 1000, (second / deltaMs) * 1000];
}

export function computeSample(
  before: Snapshot | null,
  after: Snapshot,
): Sample {
  const deltaMs = before ? after.timestamp - before.timestamp : 0;

  const cpuTotal = before ? after.cpu.total - before.cpu.total : 0;
  const cpuBusy = before ? after.cpu.busy - before.cpu.busy : 0;
  const cpuUsagePercent =
    cpuTotal > 0 ? Math.min(100, Math.max(0, (cpuBusy / cpuTotal) * 100)) : 0;

  const [blockRead, blockWrite] = counterRates(
    before?.block ?? {},
    after.block,
    deltaMs,
  );

  let network: NetworkSample;
  if (!after.network.available) {
    network = after.network;
  } else {
    const [rx, tx] =
      before?.network.available === true
        ? counterRates(
            before.network.interfaces,
            after.network.interfaces,
            deltaMs,
          )
        : [0, 0];
    network = { available: true, rxBytesPerSec: rx, txBytesPerSec: tx };
  }

  return {
    timestamp: after.timestamp,
    cpuUsagePercent,
    memory: after.memory,
    disk: after.disk,
    network,
    blockReadBytesPerSec: blockRead,
    blockWriteBytesPerSec: blockWrite,
  };
}

function poll(): void {
  let snapshot: Snapshot;
  try {
    snapshot = collectSnapshot();
  } catch (error) {
    console.error("Failed to collect host stats:", error);
    return;
  }

  history.push(computeSample(previous, snapshot));
  previous = snapshot;

  const cutoff = Date.now() - HISTORY_WINDOW_MS;
  history = history.filter((s) => s.timestamp >= cutoff);
}

export function startMonitor(): void {
  poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

export function getHistory(): Sample[] {
  return history;
}

export function getLatest(): Sample | null {
  return history.at(-1) ?? null;
}
