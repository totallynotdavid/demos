import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// A /proc and /sys tree written to a temporary directory, so the readers run
// against real files.
export class FakeFs {
  readonly root = mkdtempSync(join(tmpdir(), "dokploy-status-"));

  file(path: string, content = ""): this {
    const full = join(this.root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    return this;
  }

  // sysfs marks hardware with a `device` entry.
  hardware(sysfsDir: string, name: string): this {
    return this.file(`${sysfsDir}/${name}/device/uevent`);
  }

  virtual(sysfsDir: string, name: string): this {
    return this.file(`${sysfsDir}/${name}/uevent`);
  }

  cleanup(): void {
    rmSync(this.root, { recursive: true, force: true });
  }
}

export const PROC_STAT =
  "cpu  100 10 50 800 40 5 5 10 0 0\ncpu0 100 10 50 800 40 5 5 10 0 0\n";

export const PROC_MEMINFO = [
  "MemTotal:        8388608 kB",
  "MemFree:         1048576 kB",
  "MemAvailable:    6291456 kB",
  "",
].join("\n");

const NET_HEADER = [
  "Inter-|   Receive                                                |  Transmit",
  " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed",
];

// Columns after the name: receive bytes, 7 more receive fields, transmit bytes,
// 7 more transmit fields.
export function netDev(counters: Record<string, [number, number]>): string {
  const rows = Object.entries(counters).map(
    ([name, [rx, tx]]) =>
      `${name.padStart(6)}: ${rx} 0 0 0 0 0 0 0 ${tx} 0 0 0 0 0 0 0`,
  );
  return [...NET_HEADER, ...rows, ""].join("\n");
}

// Fields after the name: reads completed, merged, sectors read, ms, writes
// completed, merged, sectors written, then the rest.
export function diskstats(devices: Record<string, [number, number]>): string {
  return `${Object.entries(devices)
    .map(
      ([name, [read, written]]) =>
        `   8       0 ${name} 10 0 ${read} 5 10 0 ${written} 5 0 5 10`,
    )
    .join("\n")}\n`;
}
