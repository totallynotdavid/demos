import { collectStats, type RawStats } from "./stats";

const POLL_INTERVAL_MS = 5_000;
const HISTORY_WINDOW_MS = 10 * 60 * 1000;

export interface Sample {
  timestamp: number;
  cpuUsagePercent: number;
  memory: RawStats["memory"];
  disk: RawStats["disk"];
  // Expose rates for charting instead of cumulative counters.
  networkRxBytesPerSec: number;
  networkTxBytesPerSec: number;
  blockReadBytesPerSec: number;
  blockWriteBytesPerSec: number;
}

let history: Sample[] = [];
let previousRaw: RawStats | null = null;

function rate(deltaBytes: number, deltaMs: number): number {
  if (deltaMs <= 0) return 0;
  return Math.max(0, (deltaBytes / deltaMs) * 1000);
}

async function poll(): Promise<void> {
  let raw: RawStats;
  try {
    raw = await collectStats();
  } catch (error) {
    console.error("Failed to collect host stats:", error);
    return;
  }

  const deltaMs = previousRaw ? raw.timestamp - previousRaw.timestamp : 0;

  const sample: Sample = {
    timestamp: raw.timestamp,
    cpuUsagePercent: raw.cpuUsagePercent,
    memory: raw.memory,
    disk: raw.disk,
    networkRxBytesPerSec: previousRaw
      ? rate(raw.network.rxBytes - previousRaw.network.rxBytes, deltaMs)
      : 0,
    networkTxBytesPerSec: previousRaw
      ? rate(raw.network.txBytes - previousRaw.network.txBytes, deltaMs)
      : 0,
    blockReadBytesPerSec: previousRaw
      ? rate(raw.block.readBytes - previousRaw.block.readBytes, deltaMs)
      : 0,
    blockWriteBytesPerSec: previousRaw
      ? rate(raw.block.writeBytes - previousRaw.block.writeBytes, deltaMs)
      : 0,
  };

  previousRaw = raw;
  history.push(sample);

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
