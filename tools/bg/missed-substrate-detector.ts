// missed-substrate-detector.ts — B-0442 slice 4: bus publish on cascade detection
//
// Background service that detects branch-vs-merged-PR drift: commits landing
// on a feature branch AFTER its parent PR squash-merged. Slice 4 closes the
// drift-prevention reactive loop: fetch recent merged PRs, compare branch
// HEAD against squash content (NOTE: slice 3 implements the actual compare;
// slice 4 publishes envelopes for each detected cascade).
//
// Slice 4 ships the bus-publish wiring with a stub comparator that ALWAYS
// reports "no cascade detected" — slice 3 will plug in the real branch-vs-
// squash compare logic. The bus envelope schema + flags + tests are
// production-ready; the comparator stays no-op until slice 3.
//
// Run: bun tools/bg/missed-substrate-detector.ts [--once] [--poll-min N] [--lookback-min N] [--fetch-limit N] [--no-publish] [--agent NAME] [--to NAME]
// Compose with: B-0442 + B-0400 (bus) + B-0440 / B-0441 (companion services).

import { spawnSync } from "node:child_process";
import { publish } from "../bus/bus";
import { AGENT_IDS, SENDER_IDS, type AgentId, type MessageEnvelope, type SenderAgentId } from "../bus/types";

export type DetectorConfig = {
  pollIntervalMin: number;
  lookbackMin: number;
  fetchLimit: number;
  once: boolean;
  noPublish: boolean;
  fromAgent: SenderAgentId;
  toAgent: AgentId;
};

export const DEFAULT_CONFIG: DetectorConfig = {
  pollIntervalMin: 5,
  lookbackMin: 30,
  fetchLimit: 100,
  once: false,
  noPublish: false,
  fromAgent: "otto",
  toAgent: "*",
};

export type MergedPR = {
  number: number;
  headRefName: string;
  mergedAt: string;
};

export type CascadeFinding = {
  prNumber: number;
  branchName: string;
  missingCommits: string[]; // commits on branch but not in squash
  urgency: "low" | "medium" | "high";
};

export type FetchResult =
  | { status: "ok"; prs: MergedPR[]; truncated: boolean }
  | { status: "gh-error"; reason: string };

export type PollResult = {
  pollAt: string;
  candidatesScanned: number;
  cascadesDetected: number;
  fetchStatus: "ok" | "gh-error";
  fetchTruncated: boolean;
  publishedEnvelopeIds: string[];
  note: string;
};

/** Adapter abstraction so tests can inject deterministic clock + gh + cascade-detector + bus. */
export type Adapters = {
  now: () => Date;
  fetchRecentMergedPRs: (lookbackMin: number, fetchLimit: number) => FetchResult;
  /**
   * Detect cascades on a single merged PR. Slice 3 replaces this stub with
   * real branch-HEAD vs squash-content compare logic. Slice 4 keeps it as
   * an injectable stub for testing the bus-publish path.
   */
  detectCascade: (pr: MergedPR) => CascadeFinding | null;
  publishCascade: (
    from: SenderAgentId,
    to: AgentId,
    finding: CascadeFinding,
  ) => MessageEnvelope;
};

const REAL_ADAPTERS: Adapters = {
  now: () => new Date(),
  fetchRecentMergedPRs: (lookbackMin: number, fetchLimit: number) => {
    const since = new Date(Date.now() - lookbackMin * 60 * 1000).toISOString();
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- gh invoked as explicit args array; no shell, no injection risk.
    const result = spawnSync(
      "gh",
      [
        "pr", "list",
        "--state", "merged",
        "--search", `merged:>${since}`,
        "--json", "number,headRefName,mergedAt",
        "--limit", String(fetchLimit),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      return { status: "gh-error", reason: `gh exited with status ${result.status}; stderr: ${(result.stderr ?? "").toString().slice(0, 200)}` };
    }
    if (!result.stdout) {
      return { status: "gh-error", reason: "gh produced empty stdout" };
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
  // Slice 3 will replace this stub with real branch-vs-squash compare.
  detectCascade: (_pr: MergedPR) => null,
  publishCascade: (from, to, finding) =>
    publish(from, to, {
      topic: "missed-substrate-cascade",
      payload: {
        prNumber: finding.prNumber,
        branchName: finding.branchName,
        missingCommits: finding.missingCommits,
        recommendedAction: "open-recovery-PR",
        urgency: finding.urgency,
      },
    }),
};

/**
 * Single poll iteration. Fetches merged PRs, runs the cascade detector
 * on each, and publishes a missed-substrate-cascade envelope per finding
 * (unless noPublish). Slice 4's detectCascade is a stub (returns null
 * for all PRs); slice 3 plugs in real logic.
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
      publishedEnvelopeIds: [],
      note: `gh fetch failed; cannot evaluate drift this tick. ${fetch.reason}`,
    };
  }

  const findings: CascadeFinding[] = [];
  for (const pr of fetch.prs) {
    const finding = adapters.detectCascade(pr);
    if (finding !== null) findings.push(finding);
  }

  const publishedEnvelopeIds: string[] = [];
  let publishError: string | null = null;
  if (!config.noPublish && findings.length > 0) {
    for (const finding of findings) {
      try {
        const envelope = adapters.publishCascade(config.fromAgent, config.toAgent, finding);
        publishedEnvelopeIds.push(envelope.id);
      } catch (e) {
        publishError = e instanceof Error ? e.message : String(e);
        break;
      }
    }
  }

  const truncatedSuffix = fetch.truncated
    ? ` (WARNING: results truncated at fetchLimit=${config.fetchLimit}; raise --fetch-limit or shorten --lookback-min)`
    : "";
  const publishSuffix = publishError
    ? ` (publish failed: ${publishError})`
    : config.noPublish && findings.length > 0
    ? ` (publish skipped per --no-publish)`
    : publishedEnvelopeIds.length > 0
    ? ` (published ${publishedEnvelopeIds.length} cascade envelope(s))`
    : "";

  return {
    pollAt: pollAt.toISOString(),
    candidatesScanned: fetch.prs.length,
    cascadesDetected: findings.length,
    fetchStatus: "ok",
    fetchTruncated: fetch.truncated,
    publishedEnvelopeIds,
    note: findings.length > 0
      ? `${findings.length} cascade(s) detected in ${fetch.prs.length} merged PR(s)${publishSuffix}${truncatedSuffix}`
      : fetch.prs.length === 0
      ? `no merged PRs in last ${config.lookbackMin}min lookback window`
      : `${fetch.prs.length} merged PR(s) in last ${config.lookbackMin}min; no cascades detected (slice 3 plugs in real compare logic)${truncatedSuffix}`,
  };
}

export function runOnce(config: DetectorConfig = DEFAULT_CONFIG): PollResult {
  const result = pollOnce(config);
  console.log(JSON.stringify(result));
  return result;
}

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

function parseSenderId(raw: string | undefined): SenderAgentId {
  if (raw === undefined) throw new Error("--agent requires a value");
  if ((SENDER_IDS as readonly string[]).includes(raw)) return raw as SenderAgentId;
  throw new Error(`--agent must be one of ${SENDER_IDS.join(", ")}; got "${raw}"`);
}

function parseAgentId(raw: string | undefined): AgentId {
  if (raw === undefined) throw new Error("--to requires a value");
  if ((AGENT_IDS as readonly string[]).includes(raw)) return raw as AgentId;
  throw new Error(`--to must be one of ${AGENT_IDS.join(", ")}; got "${raw}"`);
}

const KNOWN_FLAGS = ["--once", "--poll-min", "--lookback-min", "--fetch-limit", "--no-publish", "--agent", "--to"] as const;

export function parseArgs(argv: string[]): DetectorConfig {
  const config: DetectorConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--once") {
      config.once = true;
    } else if (arg === "--no-publish") {
      config.noPublish = true;
    } else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    } else if (arg === "--lookback-min") {
      config.lookbackMin = parsePositiveMinutes(argv[++i], "--lookback-min");
    } else if (arg === "--fetch-limit") {
      config.fetchLimit = parsePositiveInt(argv[++i], "--fetch-limit");
    } else if (arg === "--agent") {
      config.fromAgent = parseSenderId(argv[++i]);
    } else if (arg === "--to") {
      config.toAgent = parseAgentId(argv[++i]);
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
