// missed-substrate-detector.ts — B-0442 slice 1: skeleton + no-op poll loop
//
// Background service that detects branch-vs-merged-PR drift, e.g., commits
// landing on a feature branch AFTER its parent PR squash-merged. The
// canonical operational example: the substrate-recovery cascade from earlier
// today (recovered via a follow-up PR). This service mechanizes detection
// so the cascade is caught BEFORE branch deletion erases substrate.
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
 * Run a single poll iteration and return its result.
 */
export function runOnce(config: DetectorConfig = DEFAULT_CONFIG): PollResult {
  const result = pollOnce(config);
  console.log(JSON.stringify(result));
  return result;
}

/**
 * Run the detector as a daemon. Sleeps for pollIntervalMin between
 * iterations and never returns; results are NOT accumulated (no memory
 * growth). Caller is responsible for process termination (SIGTERM, etc.).
 */
export async function runDaemon(config: DetectorConfig = DEFAULT_CONFIG): Promise<never> {
  while (true) {
    runOnce(config);
    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMin * 60 * 1000));
  }
}

export function parsePositiveMinutes(raw: string | undefined, name: string): number {
  if (raw === undefined) throw new Error(`${name} requires a value`);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive finite number; got "${raw}"`);
  }
  return n;
}

const KNOWN_FLAGS = new Set(["--once", "--poll-min"]);

export function parseArgs(argv: string[]): DetectorConfig {
  const config: DetectorConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--once") {
      config.once = true;
    } else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    } else if (KNOWN_FLAGS.has(arg)) {
      // Defensive: should be unreachable given the explicit checks above.
      throw new Error(`internal: known flag ${arg} not handled`);
    } else {
      throw new Error(`unknown flag: ${arg}; known flags: ${[...KNOWN_FLAGS].join(", ")}`);
    }
  }

  return config;
}

if (import.meta.main) {
  const config = parseArgs(process.argv.slice(2));
  if (config.once) {
    runOnce(config);
  } else {
    await runDaemon(config);
  }
}
