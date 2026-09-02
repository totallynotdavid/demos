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
	disk: { usedGB: number; totalGB: number; freeGB: number; usedPercent: number };
	// These counters are cumulative since boot.
	network: { rxBytes: number; txBytes: number };
	block: { readBytes: number; writeBytes: number };
}

export async function collectStats(): Promise<RawStats> {
	const [cpuResult, memResult, diskResult, networkResult, blockResult] = await Promise.all([
		osutils.cpu.usage(),
		osutils.memory.info(),
		osutils.disk.usageByMountPoint("/"),
		osutils.network.overview(),
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

	const disk =
		diskResult.success && diskResult.data
			? {
					usedGB: diskResult.data.used.toGB(),
					totalGB: diskResult.data.total.toGB(),
					freeGB: diskResult.data.available.toGB(),
					usedPercent: diskResult.data.usagePercentage,
				}
			: { usedGB: 0, totalGB: 0, freeGB: 0, usedPercent: 0 };

	const network = networkResult.success
		? {
				rxBytes: networkResult.data.totalRxBytes.toBytes(),
				txBytes: networkResult.data.totalTxBytes.toBytes(),
			}
		: { rxBytes: 0, txBytes: 0 };

	const block = { readBytes: 0, writeBytes: 0 };
	if (blockResult.success) {
		for (const stat of blockResult.data) {
			if (stat.device && BLOCK_DEVICE_EXCLUDE.some((pattern) => pattern.test(stat.device))) {
				continue;
			}
			block.readBytes += stat.readBytes.toBytes();
			block.writeBytes += stat.writeBytes.toBytes();
		}
	}

	return { timestamp: Date.now(), cpuUsagePercent, memory, disk, network, block };
}
