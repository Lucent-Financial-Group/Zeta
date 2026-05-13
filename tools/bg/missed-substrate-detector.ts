// missed-substrate-detector.ts — B-0442 slice 2: merged-PR fetch via gh CLI
//
// Background service that detects branch-vs-merged-PR drift: commits landing
// on a feature branch AFTER its parent PR squash-merged. Slice 2 adds real
// merged-PR fetching via `gh pr list --state merged` — the detector now
// pulls the recent merged-PR window and reports candidate branches that
// COULD have drifted (branch exists in remote tracking refs after merge).
//
// Slice 2 does NOT yet perform the actual branch-vs-squash compare (slice
// 3) or publish bus events (slice 4); it just identifies the candidate
// merged-PR set within a lookback window.
//
// Run: bun tools/bg/missed-substrate-detector.ts [--once] [--poll-min N] [--lookback-min N]
// Compose with: B-0442 + B-0400 (bus) + B-0440 / B-0441 (companion services).

import { spawnSync } from "node:child_process";

export type DetectorConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** Lookback window for merged PRs, in minutes */
  lookbackMin: number;
  /** When true, run a single poll and exit */
  once: boolean;
};

export const DEFAULT_CONFIG: DetectorConfig = {
  pollIntervalMin: 5,
  lookbackMin: 30,
  once: false,
};

export type MergedPR = {
  number: number;
  headRefName: string; // feature branch name
  mergedAt: string; // ISO-8601
};

export type PollResult = {
  pollAt: string; // ISO-8601
  candidatesScanned: number;
  cascadesDetected: number;
  note: string;
};

/** Adapter abstraction so tests can inject deterministic clock + gh result. */
export type Adapters = {
  now: () => Date;
  fetchRecentMergedPRs: (lookbackMin: number) => MergedPR[];
};

const REAL_ADAPTERS: Adapters = {
  now: () => new Date(),
  fetchRecentMergedPRs: (lookbackMin: number) => {
    // gh pr list --state merged --search "merged:>{iso}" --json number,headRefName,mergedAt
    const since = new Date(Date.now() - lookbackMin * 60 * 1000).toISOString();
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- gh invoked as explicit args array; no shell, no injection risk.
    const result = spawnSync(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "merged",
        "--search",
        `merged:>${since}`,
        "--json",
        "number,headRefName,mergedAt",
        "--limit",
        "50",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    if (result.status !== 0 || !result.stdout) return [];
    try {
      const parsed = JSON.parse(result.stdout);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((p): p is MergedPR =>
        typeof p === "object" &&
        p !== null &&
        typeof p.number === "number" &&
        typeof p.headRefName === "string" &&
        typeof p.mergedAt === "string",
      );
    } catch {
      return [];
    }
  },
};

/**
 * Single poll iteration. Fetches recent merged PRs within the lookback
 * window and reports the candidate set. Slice 3 will fetch branch HEADs
 * and compare against squash content to surface actual cascades.
 */
export function pollOnce(
  config: DetectorConfig,
  adapters: Adapters = REAL_ADAPTERS,
): PollResult {
  const pollAt = adapters.now();
  const merged = adapters.fetchRecentMergedPRs(config.lookbackMin);

  return {
    pollAt: pollAt.toISOString(),
    candidatesScanned: merged.length,
    cascadesDetected: 0, // slice 3 will populate this
    note: merged.length === 0
      ? `no merged PRs in last ${config.lookbackMin}min lookback window`
      : `${merged.length} merged PR(s) in last ${config.lookbackMin}min; slice 3 will compare each branch HEAD against squash content`,
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

const KNOWN_FLAGS = ["--once", "--poll-min", "--lookback-min"] as const;

export function parseArgs(argv: string[]): DetectorConfig {
  const config: DetectorConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--once") {
      config.once = true;
    } else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    } else if (arg === "--lookback-min") {
      config.lookbackMin = parsePositiveMinutes(argv[++i], "--lookback-min");
    } else {
      throw new Error(`unknown flag: ${arg}; known flags: ${KNOWN_FLAGS.join(", ")}`);
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
