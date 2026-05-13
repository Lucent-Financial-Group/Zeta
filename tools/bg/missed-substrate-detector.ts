// missed-substrate-detector.ts — B-0442 slice 1: skeleton + no-op poll loop
//
// Background service that detects branch-vs-merged-PR drift, e.g., commits
// landing on a feature branch AFTER its parent PR squash-merged. The
// canonical operational example: Otto-section-missed-PR-2980-by-3-min cascade
// (recovered via PR #2997). This service mechanizes detection so the cascade
// is caught BEFORE branch deletion erases substrate.
//
// This slice ships ONLY the skeleton. Future slices add merged-PR state
// fetch, branch-vs-squash comparison, cascade-detection bus publish, and
// optional auto-recovery-PR opening.
//
// Run: bun tools/bg/missed-substrate-detector.ts [--once] [--poll-min N]
// Compose with: B-0442 + B-0400 (bus) + B-0440 / B-0441 (companion services).

export type DetectorConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** When true, run a single poll and exit */
  once: boolean;
};

export const DEFAULT_CONFIG: DetectorConfig = {
  pollIntervalMin: 5,
  once: false,
};

export type PollResult = {
  pollAt: string; // ISO-8601
  cascadesDetected: number;
  note: string;
};

/**
 * Single poll iteration. Slice 1 returns a no-op result. Future slices
 * fetch recent merged PRs and compare branch HEAD against squash content.
 */
export function pollOnce(_config: DetectorConfig): PollResult {
  return {
    pollAt: new Date().toISOString(),
    cascadesDetected: 0,
    note: "slice-1 skeleton — no detection yet; future slices add merged-PR scan + branch-vs-squash compare + bus publish",
  };
}

/**
 * Run the detector loop. When `once: true`, runs exactly one iteration and
 * returns its result. Otherwise sleeps for pollIntervalMin between
 * iterations and runs forever; results are NOT accumulated.
 */
export async function runDetector(config: DetectorConfig = DEFAULT_CONFIG): Promise<PollResult[]> {
  if (config.once) {
    const result = pollOnce(config);
    console.log(JSON.stringify(result));
    return [result];
  }

  while (true) {
    const result = pollOnce(config);
    console.log(JSON.stringify(result));
    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMin * 60 * 1000));
  }
}

function parsePositiveMinutes(raw: string | undefined, name: string): number {
  if (raw === undefined) throw new Error(`${name} requires a value`);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive finite number; got "${raw}"`);
  }
  return n;
}

function parseArgs(argv: string[]): DetectorConfig {
  const config: DetectorConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") config.once = true;
    else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    }
  }

  return config;
}

if (import.meta.main) {
  const config = parseArgs(process.argv.slice(2));
  await runDetector(config);
}
