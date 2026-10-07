import { describe, expect, test } from "bun:test";
import { computeSample } from "../src/monitor";
import type { Snapshot } from "../src/stats";

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    timestamp: 0,
    cpu: { busy: 0, total: 0 },
    memory: { usedGB: 1, totalGB: 4, usedPercent: 25 },
    disk: { usedGB: 1, totalGB: 10, freeGB: 9, usedPercent: 10 },
    network: { available: true, interfaces: {} },
    block: {},
    ...overrides,
  };
}

describe("computeSample", () => {
  test("the first sample has zero rates", () => {
    const sample = computeSample(
      null,
      snapshot({
        network: { available: true, interfaces: { eno1: [500, 500] } },
        block: { sda: [500, 500] },
      }),
    );

    expect(sample.cpuUsagePercent).toBe(0);
    expect(sample.network).toEqual({
      available: true,
      rxBytesPerSec: 0,
      txBytesPerSec: 0,
    });
    expect(sample.blockReadBytesPerSec).toBe(0);
  });

  test("counters become bytes per second", () => {
    const before = snapshot({
      timestamp: 1_000,
      cpu: { busy: 100, total: 1000 },
      network: { available: true, interfaces: { eno1: [1000, 100] } },
      block: { sda: [0, 0] },
    });
    const after = snapshot({
      timestamp: 3_000,
      cpu: { busy: 150, total: 1100 },
      network: { available: true, interfaces: { eno1: [5000, 300] } },
      block: { sda: [4000, 2000] },
    });

    const sample = computeSample(before, after);

    expect(sample.cpuUsagePercent).toBe(50);
    expect(sample.network).toEqual({
      available: true,
      rxBytesPerSec: 2000,
      txBytesPerSec: 100,
    });
    expect(sample.blockReadBytesPerSec).toBe(2000);
    expect(sample.blockWriteBytesPerSec).toBe(1000);
  });

  test("a reset counter and a new interface add nothing", () => {
    const before = snapshot({
      timestamp: 0,
      network: { available: true, interfaces: { eno1: [9000, 9000] } },
    });
    const after = snapshot({
      timestamp: 1_000,
      network: {
        available: true,
        interfaces: { eno1: [10, 10], wlan0: [1_000_000, 1_000_000] },
      },
    });

    expect(computeSample(before, after).network).toEqual({
      available: true,
      rxBytesPerSec: 0,
      txBytesPerSec: 0,
    });
  });

  test("an unavailable network carries its reason into the sample", () => {
    const after = snapshot({
      timestamp: 1_000,
      network: { available: false, reason: "container namespace" },
    });

    expect(computeSample(snapshot(), after).network).toEqual({
      available: false,
      reason: "container namespace",
    });
  });
});
