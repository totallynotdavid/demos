import { afterEach, describe, expect, test } from "bun:test";
import { collectSnapshot, NO_PHYSICAL_NIC_REASON } from "../src/stats";
import { diskstats, FakeFs, netDev, PROC_MEMINFO, PROC_STAT } from "./fixture";

let fake: FakeFs;

afterEach(() => fake.cleanup());

function snapshotOf(fs: FakeFs) {
  return collectSnapshot({ fs: fs.root, disk: "/" });
}

function baseFs(): FakeFs {
  return new FakeFs()
    .file("proc/stat", PROC_STAT)
    .file("proc/meminfo", PROC_MEMINFO)
    .file("proc/diskstats", diskstats({}))
    .file("proc/net/dev", netDev({}))
    .virtual("sys/class/net", "lo")
    .file("sys/block/.keep");
}

describe("network", () => {
  test("a host namespace counts physical interfaces only", () => {
    fake = baseFs()
      .hardware("sys/class/net", "eno1")
      .virtual("sys/class/net", "docker0")
      .virtual("sys/class/net", "veth1234")
      .file(
        "proc/net/dev",
        netDev({
          lo: [999, 999],
          eno1: [1000, 200],
          docker0: [700, 100],
          veth1234: [700, 100],
        }),
      );

    expect(snapshotOf(fake).network).toEqual({
      available: true,
      interfaces: { eno1: [1000, 200] },
    });
  });

  test("a container namespace is reported, not read", () => {
    fake = baseFs()
      .virtual("sys/class/net", "eth0")
      .file("proc/net/dev", netDev({ lo: [5, 5], eth0: [1000, 200] }));

    expect(snapshotOf(fake).network).toEqual({
      available: false,
      reason: NO_PHYSICAL_NIC_REASON,
    });
  });

  test("an unreadable sysfs is reported, not read", () => {
    fake = new FakeFs()
      .file("proc/stat", PROC_STAT)
      .file("proc/meminfo", PROC_MEMINFO)
      .file("proc/diskstats", diskstats({}))
      .file("sys/block/.keep")
      .file("proc/net/dev", netDev({ eth0: [1, 1] }));

    const { network } = snapshotOf(fake);
    expect(network.available).toBe(false);
  });
});

describe("block devices", () => {
  test("partitions and stacked devices are not counted again", () => {
    fake = baseFs()
      .hardware("sys/block", "sda")
      .virtual("sys/block", "dm-0")
      .virtual("sys/block", "loop0")
      .file(
        "proc/diskstats",
        diskstats({
          loop0: [1, 1],
          sda: [100, 40],
          sda1: [60, 20],
          sda2: [40, 20],
          "dm-0": [100, 40],
        }),
      );

    expect(snapshotOf(fake).block).toEqual({ sda: [100 * 512, 40 * 512] });
  });
});

describe("cpu and memory", () => {
  test("cpu jiffies exclude guest time and split busy from idle", () => {
    fake = baseFs();

    // idle + iowait = 840; the rest of the first eight fields is busy.
    expect(snapshotOf(fake).cpu).toEqual({ busy: 180, total: 1020 });
  });

  test("memory used is total minus MemAvailable", () => {
    fake = baseFs();

    const { memory } = snapshotOf(fake);
    expect(memory.totalGB).toBe(8);
    expect(memory.usedGB).toBe(2);
    expect(memory.usedPercent).toBe(25);
  });

  test("a /proc/stat without a cpu line is an error", () => {
    fake = baseFs().file("proc/stat", "intr 1 2 3\n");

    expect(() => snapshotOf(fake)).toThrow("/proc/stat");
  });
});

test("the real /proc and /sys of this machine can be read", () => {
  const snapshot = collectSnapshot();

  expect(snapshot.memory.totalGB).toBeGreaterThan(0);
  expect(snapshot.cpu.total).toBeGreaterThan(0);
  expect(snapshot.disk.totalGB).toBeGreaterThan(0);
});
