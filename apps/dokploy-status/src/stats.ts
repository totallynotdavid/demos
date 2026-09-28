import { readFileSync, statfsSync } from "node:fs";
import { OSUtils } from "node-os-utils";

// Host metrics require neither Docker socket access nor elevated privileges.
const osutils = new OSUtils({
  // Each poll should read current host values instead of cached results.
  cacheEnabled: false,
  disk: {
    includeStats: true,
  },
});

// Exclude virtual block devices from block I/O totals.
const BLOCK_DEVICE_EXCLUDE = [/^loop/, /^ram/, /^sr\d+$/, /^fd\d+$/];

export interface RawStats {
  timestamp: number;
  cpuUsagePercent: number;
  memory: { usedGB: number; totalGB: number; usedPercent: number };
  disk: {
    usedGB: number;
    totalGB: number;
    freeGB: number;
    usedPercent: number;
  };
  // These counters are cumulative since boot.
  network: { rxBytes: number; txBytes: number };
  block: { readBytes: number; writeBytes: number };
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

function getDiskUsage(): RawStats["disk"] {
  const stat = statfsSync("/");
  const totalBytes = stat.blocks * stat.bsize;
  const freeBytes = stat.bavail * stat.bsize; // available to non-root; matches what `df` reports as "available"
  const usedBytes = totalBytes - stat.bfree * stat.bsize; // bfree (not bavail) for "used", matching df's Used column

  return {
    usedGB: usedBytes / BYTES_PER_GB,
    totalGB: totalBytes / BYTES_PER_GB,
    freeGB: freeBytes / BYTES_PER_GB,
    usedPercent: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0,
  };
}

// Exclude loopback from network totals; it doesn't represent real network I/O.
function getNetworkUsage(): RawStats["network"] {
  const raw = readFileSync("/proc/net/dev", "utf-8");
  const lines = raw.trim().split("\n").slice(2); // drop the 2-line header

  let rxBytes = 0;
  let txBytes = 0;
  for (const line of lines) {
    const [rawName, rawData] = line.split(":");
    if (!rawName || !rawData) continue;
    if (rawName.trim() === "lo") continue;

    const fields = rawData.trim().split(/\s+/).map(Number);
    rxBytes += fields[0] ?? 0;
    txBytes += fields[8] ?? 0;
  }

  return { rxBytes, txBytes };
}

export async function collectStats(): Promise<RawStats> {
  const [cpuResult, memResult, blockResult] = await Promise.all([
    osutils.cpu.usage(),
    osutils.memory.info(),
    osutils.disk.stats(),
  ]);

  const cpuUsagePercent = cpuResult.success ? cpuResult.data : 0;

  const memory = memResult.success
    ? {
        usedGB: memResult.data.used.toGB(),
        totalGB: memResult.data.total.toGB(),
        usedPercent: memResult.data.usagePercentage,
      }
    : { usedGB: 0, totalGB: 0, usedPercent: 0 };

  const disk = getDiskUsage();
  const network = getNetworkUsage();

  const block = { readBytes: 0, writeBytes: 0 };
  if (blockResult.success) {
    for (const stat of blockResult.data) {
      if (
        stat.device &&
        BLOCK_DEVICE_EXCLUDE.some((pattern) => pattern.test(stat.device))
      ) {
        continue;
      }
      block.readBytes += stat.readBytes.toBytes();
      block.writeBytes += stat.writeBytes.toBytes();
    }
  }

  return {
    timestamp: Date.now(),
    cpuUsagePercent,
    memory,
    disk,
    network,
    block,
  };
}
