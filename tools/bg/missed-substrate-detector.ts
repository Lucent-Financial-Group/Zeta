// missed-substrate-detector.ts — B-0442 slice 2: merged-PR fetch via gh CLI
//
// Background service that detects branch-vs-merged-PR drift: commits landing
// on a feature branch AFTER its parent PR squash-merged. Slice 2 fetches the
// recent merged-PR set (number, head-ref, merged-at) within a configurable
// lookback window via `gh pr list --state merged`. The fetch produces a
// FetchResult that distinguishes successful fetch from gh-failure so the
// caller can tell "no merged PRs" from "gh unavailable".
//
// Slice 2 does NOT yet perform branch-HEAD comparison (slice 3) or bus
// publish (slice 4); it just produces the candidate merged-PR set and
// surfaces gh-failure explicitly.
//
// Run: bun tools/bg/missed-substrate-detector.ts [--once] [--poll-min N] [--lookback-min N] [--fetch-limit N]
// Compose with: B-0442 + B-0400 (bus) + B-0440 / B-0441 (companion services).

import { spawnSync } from "node:child_process";

export type DetectorConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** Lookback window for merged PRs, in minutes */
  lookbackMin: number;
  /**
   * Max merged PRs to fetch per poll. Defaults to 100 (gh's hard cap is
   * higher). Set higher for busy repos with short lookback windows.
   */
  fetchLimit: number;
  /** When true, run a single poll and exit */
  once: boolean;
};

export const DEFAULT_CONFIG: DetectorConfig = {
  pollIntervalMin: 5,
  lookbackMin: 30,
  fetchLimit: 100,
  once: false,
};

export type MergedPR = {
  number: number;
  headRefName: string; // feature branch name
  mergedAt: string; // ISO-8601
};

/**
 * Result of fetching the recent merged-PR window. Distinguishes successful
 * fetch (status: "ok") from gh-failure (status: "gh-error") so the caller
 * can avoid silently treating gh-down as "no PRs merged".
 */
export type FetchResult =
  | { status: "ok"; prs: MergedPR[]; truncated: boolean }
  | { status: "gh-error"; reason: string };

export type PollResult = {
  pollAt: string; // ISO-8601
  candidatesScanned: number;
  cascadesDetected: number;
  fetchStatus: "ok" | "gh-error";
  fetchTruncated: boolean;
  note: string;
};

/** Adapter abstraction so tests can inject deterministic clock + gh result. */
export type Adapters = {
  now: () => Date;
  fetchRecentMergedPRs: (lookbackMin: number, fetchLimit: number) => FetchResult;
};

const REAL_ADAPTERS: Adapters = {
  now: () => new Date(),
  fetchRecentMergedPRs: (lookbackMin: number, fetchLimit: number) => {
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
        String(fetchLimit),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      return { status: "gh-error", reason: `gh exited with status ${result.status}; stderr: ${(result.stderr ?? "").toString().slice(0, 200)}` };
    }
    if (!result.stdout) {
      return { status: "gh-error", reason: "gh produced empty stdout (no error code; likely IO failure)" };
    }
    try {
      const parsed = JSON.parse(result.stdout);
      if (!Array.isArray(parsed)) {
        return { status: "gh-error", reason: "gh stdout was not a JSON array" };
      }
      const prs = parsed.filter((p): p is MergedPR =>
        typeof p === "object" &&
        p !== null &&
        typeof p.number === "number" &&
        typeof p.headRefName === "string" &&
        typeof p.mergedAt === "string",
      );
      return { status: "ok", prs, truncated: prs.length >= fetchLimit };
    } catch (e) {
      return { status: "gh-error", reason: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
};

/**
 * Single poll iteration. Fetches recent merged PRs and reports the
 * candidate set. Surfaces gh-failure explicitly so it can't be silently
 * treated as "no PRs merged". Slice 3 will fetch each branch's HEAD and
 * compare against squash content.
 */
export function pollOnce(
  config: DetectorConfig,
  adapters: Adapters = REAL_ADAPTERS,
): PollResult {
  const pollAt = adapters.now();
  const fetch = adapters.fetchRecentMergedPRs(config.lookbackMin, config.fetchLimit);

  if (fetch.status === "gh-error") {
    return {
      pollAt: pollAt.toISOString(),
      candidatesScanned: 0,
      cascadesDetected: 0,
      fetchStatus: "gh-error",
      fetchTruncated: false,
      note: `gh fetch failed; cannot evaluate drift this tick. ${fetch.reason}`,
    };
  }

  const truncatedSuffix = fetch.truncated
    ? ` (WARNING: results truncated at fetchLimit=${config.fetchLimit}; raise --fetch-limit or shorten --lookback-min)`
    : "";

  return {
    pollAt: pollAt.toISOString(),
    candidatesScanned: fetch.prs.length,
    cascadesDetected: 0, // slice 3 will populate
    fetchStatus: "ok",
    fetchTruncated: fetch.truncated,
    note: fetch.prs.length === 0
      ? `no merged PRs in last ${config.lookbackMin}min lookback window`
      : `${fetch.prs.length} merged PR(s) in last ${config.lookbackMin}min; slice 3 will compare each branch HEAD against squash content${truncatedSuffix}`,
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

function parsePositiveInt(raw: string | undefined, name: string): number {
  if (raw === undefined) throw new Error(`${name} requires a value`);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error(`${name} must be a positive integer; got "${raw}"`);
  }
  return n;
}

const KNOWN_FLAGS = ["--once", "--poll-min", "--lookback-min", "--fetch-limit"] as const;

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
    } else if (arg === "--fetch-limit") {
      config.fetchLimit = parsePositiveInt(argv[++i], "--fetch-limit");
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
