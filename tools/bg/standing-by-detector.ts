// standing-by-detector.ts — B-0440 slice 2: commit-history poll via `git log`
//
// Background service that detects when an agent has been Standing by (idle)
// by comparing the timestamp of the most recent commit on HEAD against a
// configurable idle threshold (`idleThresholdMin`). When the gap exceeds
// the threshold the detector flags the agent as a Standing-by candidate.
//
// PR-activity polling and bus-publish are still TBD (slices 3 + 4).
//
// Run: bun tools/bg/standing-by-detector.ts [--once] [--poll-min N] [--idle-min N]
// Compose with: B-0440 + B-0400 (bus) + B-0441 (proactive notifier).

import { spawnSync } from "node:child_process";

export type DetectorConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** Idle threshold — if no commit in this many minutes, flag Standing-by */
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
  lastCommitAt: string | null; // ISO-8601 of the most recent commit on HEAD, or null
  idleMinutes: number | null;
  note: string;
};

/** Adapter abstraction so tests can inject a deterministic clock + git-log result. */
export type Adapters = {
  now: () => Date;
  lastCommitIso: () => string | null;
};

const REAL_ADAPTERS: Adapters = {
  now: () => new Date(),
  lastCommitIso: () => {
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array; no shell, no injection risk.
    const result = spawnSync("git", ["log", "-1", "--format=%cI", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status !== 0 || !result.stdout) return null;
    const trimmed = result.stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
};

/**
 * Single poll iteration. Reads the most recent commit on HEAD and compares
 * its timestamp against the configured idle threshold.
 */
export function pollOnce(
  config: DetectorConfig,
  adapters: Adapters = REAL_ADAPTERS,
): PollResult {
  const pollAt = adapters.now();
  const lastCommitIso = adapters.lastCommitIso();

  if (lastCommitIso === null) {
    return {
      pollAt: pollAt.toISOString(),
      idleDetected: false,
      lastCommitAt: null,
      idleMinutes: null,
      note: "no commit found on HEAD (fresh repo or git unavailable); cannot evaluate idle threshold",
    };
  }

  const lastCommit = new Date(lastCommitIso);
  const idleMs = pollAt.getTime() - lastCommit.getTime();
  const idleMinutes = Math.max(0, idleMs / 60_000);
  const idleDetected = idleMinutes >= config.idleThresholdMin;

  return {
    pollAt: pollAt.toISOString(),
    idleDetected,
    lastCommitAt: lastCommit.toISOString(),
    idleMinutes,
    note: idleDetected
      ? `idle ${idleMinutes.toFixed(1)}min >= threshold ${config.idleThresholdMin}min — Standing-by candidate (future slice: publish bus nudge)`
      : `last commit ${idleMinutes.toFixed(1)}min ago; under threshold ${config.idleThresholdMin}min`,
  };
}

/** Run a single poll iteration and return its result. */
export function runOnce(config: DetectorConfig = DEFAULT_CONFIG): PollResult {
  const result = pollOnce(config);
  console.log(JSON.stringify(result));
  return result;
}

/**
 * Run the detector as a daemon. Sleeps for pollIntervalMin between
 * iterations and never returns; results are NOT accumulated.
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

const KNOWN_FLAGS = new Set(["--once", "--poll-min", "--idle-min"]);

export function parseArgs(argv: string[]): DetectorConfig {
  const config: DetectorConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") {
      config.once = true;
    } else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    } else if (arg === "--idle-min") {
      config.idleThresholdMin = parsePositiveMinutes(argv[++i], "--idle-min");
    } else if (KNOWN_FLAGS.has(arg)) {
      throw new Error(`internal: known flag ${arg} not handled`);
    } else {
      throw new Error(`unknown flag: ${arg}; known flags: ${[...KNOWN_FLAGS].join(", ")}`);
    }
  }

  return config;
}

// CLI entry — only fires when invoked directly, not when imported by tests.
if (import.meta.main) {
  const config = parseArgs(process.argv.slice(2));
  if (config.once) {
    runOnce(config);
  } else {
    await runDaemon(config);
  }
}
