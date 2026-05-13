// standing-by-detector.ts — B-0440 slice 1: skeleton + no-op poll loop
//
// Background service that detects when an agent has been "Standing by" for N
// consecutive autonomous-loop ticks without producing substrate. Future slices
// add commit-history polling, PR-activity polling, and bus integration to
// publish nudges via B-0400 protocol.
//
// This slice ships ONLY the skeleton: poll-loop scaffolding + configurable
// thresholds + log output. No real detection yet.
//
// Run: bun tools/bg/standing-by-detector.ts [--once] [--poll-min N] [--idle-min N]
// Compose with: B-0440 (this row) + B-0400 (bus) + B-0441 (proactive notifier).

export type DetectorConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** Idle threshold — if no activity in this many minutes, flag Standing-by */
  idleThresholdMin: number;
  /** When true, run a single poll and exit (for testing / cron-driven mode) */
  once: boolean;
};

export const DEFAULT_CONFIG: DetectorConfig = {
  pollIntervalMin: 5,
  idleThresholdMin: 15,
  once: false,
};

export type PollResult = {
  pollAt: string; // ISO-8601
  idleDetected: boolean;
  note: string;
};

/**
 * Single poll iteration. Slice 1 returns a no-op result with a placeholder
 * note. Future slices will implement actual commit-history + PR-activity
 * checks.
 */
export function pollOnce(_config: DetectorConfig): PollResult {
  return {
    pollAt: new Date().toISOString(),
    idleDetected: false,
    note: "slice-1 skeleton — no detection yet; future slices add commit-history + PR-activity polls",
  };
}

/**
 * Run the poll loop. When `once: true`, runs exactly one iteration.
 * Otherwise sleeps for pollIntervalMin between iterations.
 */
export async function runDetector(config: DetectorConfig = DEFAULT_CONFIG): Promise<PollResult[]> {
  const results: PollResult[] = [];

  do {
    const result = pollOnce(config);
    results.push(result);
    console.log(JSON.stringify(result));

    if (config.once) break;

    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMin * 60 * 1000));
  } while (!config.once);

  return results;
}

function parseArgs(argv: string[]): DetectorConfig {
  const config: DetectorConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") config.once = true;
    else if (arg === "--poll-min" && i + 1 < argv.length) {
      config.pollIntervalMin = Number(argv[++i]);
    } else if (arg === "--idle-min" && i + 1 < argv.length) {
      config.idleThresholdMin = Number(argv[++i]);
    }
  }

  return config;
}

// CLI entry — only fires when invoked directly, not when imported by tests.
if (import.meta.main) {
  const config = parseArgs(process.argv.slice(2));
  await runDetector(config);
}
