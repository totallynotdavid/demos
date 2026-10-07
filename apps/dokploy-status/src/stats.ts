import { existsSync, readdirSync, readFileSync, statfsSync } from "node:fs";
import { join } from "node:path";

const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_KB = 1024;
// /proc/diskstats counts 512-byte sectors whatever the device's sector size.
const BYTES_PER_SECTOR = 512;

// Cumulative counters per device or interface, stored as [first, second].
export type Counters = Record<string, [number, number]>;

export type NetworkSnapshot =
  | { available: true; interfaces: Counters }
  | { available: false; reason: string };

export interface Snapshot {
  timestamp: number;
  // Jiffies since boot: busy and total across all CPUs.
  cpu: { busy: number; total: number };
  memory: { usedGB: number; totalGB: number; usedPercent: number };
  disk: {
    usedGB: number;
    totalGB: number;
    freeGB: number;
    usedPercent: number;
  };
  network: NetworkSnapshot;
  block: Counters;
}

export interface Roots {
  // Directory that holds proc/ and sys/. Tests point it at a fixture tree.
  fs: string;
  // Filesystem whose usage the disk card shows.
  disk: string;
}

const DEFAULT_ROOTS: Roots = { fs: "/", disk: "/" };

export const NO_PHYSICAL_NIC_REASON =
  "Only a container network namespace is visible, so its traffic would be shown instead of the host's. Run the container with host networking.";

function readText(roots: Roots, path: string): string {
  return readFileSync(join(roots.fs, path), "utf-8");
}

function listDir(roots: Roots, path: string): string[] {
  return readdirSync(join(roots.fs, path));
}

// Real hardware has a `device` link in sysfs. Bridges, veth pairs, tunnels and
// loop devices do not, so counting only devices that have one skips traffic
// that is already counted on the physical interface or disk beneath them.
function isPhysical(roots: Roots, sysfsDir: string, name: string): boolean {
  return existsSync(join(roots.fs, sysfsDir, name, "device"));
}

function getCpu(roots: Roots): Snapshot["cpu"] {
  const line = readText(roots, "proc/stat").split("\n")[0] ?? "";
  // The first eight fields are user, nice, system, idle, iowait, irq, softirq,
  // and steal. Guest time is already included in user.
  const [user, nice, system, idle, iowait, irq, softirq, steal] = line
    .split(/\s+/)
    .slice(1, 9)
    .map(Number);
  const idleTotal = (idle ?? 0) + (iowait ?? 0);
  const total =
    (user ?? 0) +
    (nice ?? 0) +
    (system ?? 0) +
    idleTotal +
    (irq ?? 0) +
    (softirq ?? 0) +
    (steal ?? 0);
  if (!line.startsWith("cpu ") || !Number.isFinite(total)) {
    throw new Error("unexpected /proc/stat format");
  }
  return { busy: total - idleTotal, total };
}

function getMemory(roots: Roots): Snapshot["memory"] {
  const meminfo = readText(roots, "proc/meminfo");
  const kb = (field: string): number => {
    const match = meminfo.match(new RegExp(`^${field}:\\s+(\\d+) kB`, "m"));
    if (!match?.[1]) throw new Error(`${field} missing from /proc/meminfo`);
    return Number(match[1]) * BYTES_PER_KB;
  };
  const totalBytes = kb("MemTotal");
  const usedBytes = totalBytes - kb("MemAvailable");

  return {
    usedGB: usedBytes / BYTES_PER_GB,
    totalGB: totalBytes / BYTES_PER_GB,
    usedPercent: totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0,
  };
}

function getDisk(roots: Roots): Snapshot["disk"] {
  const stat = statfsSync(roots.disk);
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

// /proc/net/dev lists the interfaces of the reader's network namespace. In a
// container on the default bridge that is the container's own `eth0`, not the
// host's traffic. A namespace without a physical interface is therefore
// reported as unavailable instead of read.
function getNetwork(roots: Roots): NetworkSnapshot {
  let names: string[];
  try {
    names = listDir(roots, "sys/class/net");
  } catch (error) {
    return {
      available: false,
      reason: `Cannot list network interfaces in /sys/class/net: ${error instanceof Error ? error.message : error}`,
    };
  }
  const physical = new Set(
    names.filter((name) => isPhysical(roots, "sys/class/net", name)),
  );
  if (physical.size === 0) {
    return { available: false, reason: NO_PHYSICAL_NIC_REASON };
  }

  const interfaces: Counters = {};
  for (const line of readText(roots, "proc/net/dev").split("\n").slice(2)) {
    const [name, data] = line.split(":");
    const iface = name?.trim();
    if (!iface || !data || !physical.has(iface)) continue;
    const fields = data.trim().split(/\s+/).map(Number);
    interfaces[iface] = [fields[0] ?? 0, fields[8] ?? 0];
  }
  return { available: true, interfaces };
}

function getBlock(roots: Roots): Counters {
  // Partitions are not in /sys/block, so a disk and its partitions are never
  // both counted.
  const disks = new Set(
    listDir(roots, "sys/block").filter((name) =>
      isPhysical(roots, "sys/block", name),
    ),
  );

  const block: Counters = {};
  for (const line of readText(roots, "proc/diskstats").split("\n")) {
    const fields = line.trim().split(/\s+/);
    const name = fields[2];
    if (!name || !disks.has(name)) continue;
    block[name] = [
      Number(fields[5] ?? 0) * BYTES_PER_SECTOR,
      Number(fields[9] ?? 0) * BYTES_PER_SECTOR,
    ];
  }
  return block;
}

export function collectSnapshot(roots: Roots = DEFAULT_ROOTS): Snapshot {
  return {
    timestamp: Date.now(),
    cpu: getCpu(roots),
    memory: getMemory(roots),
    disk: getDisk(roots),
    network: getNetwork(roots),
    block: getBlock(roots),
  };
}
