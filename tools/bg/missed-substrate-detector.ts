// missed-substrate-detector.ts — B-0442 slice 3+4: real branch-vs-squash comparator
//
// Background service that detects branch-vs-merged-PR drift: commits landing
// on a feature branch AFTER its parent PR squash-merged. Slice 4 shipped the
// bus-publish wiring with a stub comparator; slice 3 (this file, 2026-05-13)
// plugs in the real branch-vs-squash compare logic via `realCascadeDetector`.
//
// Detection algorithm (slice 3):
//   1. For each merged PR, fetch `headRefOid` from gh — the branch HEAD SHA
//      *at merge time* (the SHA that was squashed).
//   2. Fetch `origin/<branchName>` to get the branch's current state.
//   3. If branch was deleted post-merge → return null (unrecoverable; the
//      window for detection closed at branch deletion).
//   4. Guard against rebases: if `headRefOid` is not an ancestor of the
//      current branch HEAD, return null (situation too complex to
//      auto-diagnose; would produce false-positive flood).
//   5. Run `git log <headRefOid>..origin/<branchName>` — these are the
//      commits added to the branch AFTER squash. If non-empty, cascade
//      detected; build CascadeFinding with urgency classified by
//      commit-count + merge-age.
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
   * Detect cascades on a single merged PR. Slice 4 keeps this as an
   * injectable adapter for testing the bus-publish path; slice 3 wires
   * REAL_ADAPTERS to `realCascadeDetector` composed with real gh + git
   * sub-adapters (see `REAL_CASCADE_SUB_ADAPTERS`).
   */
  detectCascade: (pr: MergedPR) => CascadeFinding | null;
  publishCascade: (
    from: SenderAgentId,
    to: AgentId,
    finding: CascadeFinding,
  ) => MessageEnvelope;
};

/**
 * Slice 3: result of fetching PR refs from gh. `headRefOid` is the branch
 * HEAD SHA at merge time — the SHA that was squashed.
 */
export type PRRefsResult =
  | { status: "ok"; headRefOid: string }
  | { status: "no-merge"; reason: string }
  | { status: "error"; reason: string };

/**
 * Slice 3: result of comparing the branch's current state against its
 * state at merge time. `missingCommits` are commits added to the branch
 * AFTER the squash — exactly the cascade signal.
 */
export type BranchCompareResult =
  | { status: "ok"; missingCommits: string[] }
  | { status: "branch-deleted"; reason: string }
  | { status: "branch-rebased"; reason: string }
  | { status: "error"; reason: string };

/**
 * Slice 3 sub-adapters for the real cascade detector. Decoupled so tests
 * inject deterministic gh + git responses without needing a real repo.
 */
export type CascadeDetectorAdapters = {
  fetchPRRefs: (prNumber: number) => PRRefsResult;
  compareBranchToMerged: (
    branchName: string,
    headRefOid: string,
  ) => BranchCompareResult;
  now: () => Date;
};

/**
 * Classify cascade urgency by commit count + merge-age. The Otto-section-
 * missed-PR-#2980 case was 3 minutes old with 1 missing commit ⇒ "high".
 */
export function classifyCascadeUrgency(
  missingCommitCount: number,
  mergedAtIso: string,
  nowMs: number,
): "low" | "medium" | "high" {
  const mergedAtMs = new Date(mergedAtIso).getTime();
  const ageHours = (nowMs - mergedAtMs) / (1000 * 60 * 60);
  if (missingCommitCount >= 4) return "high"; // multiple-commit drift = serious
  if (ageHours < 1) return "high"; // fresh drift = likely about to be lost
  if (missingCommitCount >= 2) return "medium";
  if (ageHours < 24) return "medium"; // recent single-commit drift
  return "low";
}

/**
 * Slice 3: real branch-vs-squash cascade detector. Pure function composed
 * with sub-adapters for testability. Returns null when no drift detected,
 * when branch was deleted, when branch was rebased (too complex to
 * auto-diagnose), or when gh/git errors prevent diagnosis.
 */
export function realCascadeDetector(
  pr: MergedPR,
  adapters: CascadeDetectorAdapters,
): CascadeFinding | null {
  const refs = adapters.fetchPRRefs(pr.number);
  if (refs.status !== "ok") return null;

  const compare = adapters.compareBranchToMerged(pr.headRefName, refs.headRefOid);
  if (compare.status !== "ok") return null;
  if (compare.missingCommits.length === 0) return null;

  return {
    prNumber: pr.number,
    branchName: pr.headRefName,
    missingCommits: compare.missingCommits,
    urgency: classifyCascadeUrgency(
      compare.missingCommits.length,
      pr.mergedAt,
      adapters.now().getTime(),
    ),
  };
}

/**
 * Slice 3: maximum number of post-squash commits to surface in a single
 * envelope. Caps the false-positive flood case where headRefOid is an
 * ancestor of branchHead but the gap is unexpectedly large (e.g., the
 * branch is being reused for follow-up work — not a cascade).
 */
export const MAX_REPORTED_MISSING_COMMITS = 50;

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
  // Slice 3 (2026-05-13): real branch-vs-squash compare via gh + git.
  detectCascade: (pr: MergedPR) =>
    realCascadeDetector(pr, REAL_CASCADE_SUB_ADAPTERS),
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
 * Slice 3 (2026-05-13): real production sub-adapters for the cascade
 * detector. `fetchPRRefs` calls `gh pr view --json headRefOid`;
 * `compareBranchToMerged` fetches the branch from origin and runs
 * `git log <headRefOid>..origin/<branchName>` to find post-squash drift.
 */
export const REAL_CASCADE_SUB_ADAPTERS: CascadeDetectorAdapters = {
  now: () => new Date(),
  fetchPRRefs: (prNumber: number): PRRefsResult => {
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- gh invoked as explicit args array; no shell, no injection risk.
    const result = spawnSync(
      "gh",
      ["pr", "view", String(prNumber), "--json", "headRefOid,mergeCommit"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      return {
        status: "error",
        reason: `gh pr view ${prNumber} exited ${result.status}; stderr: ${(result.stderr ?? "").toString().slice(0, 200)}`,
      };
    }
    if (!result.stdout) {
      return { status: "error", reason: "gh pr view produced empty stdout" };
    }
    try {
      const parsed = JSON.parse(result.stdout);
      const headRefOid = parsed?.headRefOid;
      const mergeCommit = parsed?.mergeCommit;
      if (typeof headRefOid !== "string" || headRefOid.length === 0) {
        return { status: "no-merge", reason: "PR has no headRefOid" };
      }
      if (!mergeCommit || typeof mergeCommit.oid !== "string") {
        return { status: "no-merge", reason: "PR has no mergeCommit (closed-not-merged?)" };
      }
      return { status: "ok", headRefOid };
    } catch (e) {
      return { status: "error", reason: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  },
  compareBranchToMerged: (branchName: string, headRefOid: string): BranchCompareResult => {
    // Validate inputs to prevent shell-injection via crafted refs (gh response is
    // trusted but defensive validation matches our usual posture).
    if (!/^[A-Za-z0-9._\/\-]+$/.test(branchName)) {
      return { status: "error", reason: `invalid branchName: ${branchName.slice(0, 40)}` };
    }
    if (!/^[0-9a-f]{7,40}$/.test(headRefOid)) {
      return { status: "error", reason: `invalid headRefOid: ${headRefOid.slice(0, 40)}` };
    }

    // Fetch the latest branch state. If the branch was deleted post-merge,
    // git fetch reports "couldn't find remote ref" — surface as branch-deleted.
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array; refs validated above.
    const fetchResult = spawnSync(
      "git",
      ["fetch", "--quiet", "origin", branchName],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (fetchResult.status !== 0) {
      const stderr = (fetchResult.stderr ?? "").toString();
      if (stderr.includes("couldn't find remote ref") || stderr.includes("not found")) {
        return { status: "branch-deleted", reason: "branch not on origin (deleted post-merge)" };
      }
      return { status: "error", reason: `git fetch failed: ${stderr.slice(0, 200)}` };
    }

    // Guard against rebases: if headRefOid is NOT an ancestor of the current
    // branch HEAD, the branch was rewritten and we cannot trust a simple
    // log-range. Surface branch-rebased; the situation needs manual review.
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array.
    const ancestorResult = spawnSync(
      "git",
      ["merge-base", "--is-ancestor", headRefOid, `origin/${branchName}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (ancestorResult.status === 1) {
      return { status: "branch-rebased", reason: `${headRefOid.slice(0, 8)} is not ancestor of origin/${branchName} (rebase or force-push detected)` };
    }
    if (ancestorResult.status !== 0) {
      return { status: "error", reason: `git merge-base failed: ${(ancestorResult.stderr ?? "").toString().slice(0, 200)}` };
    }

    // Now list commits on origin/<branch> not reachable from headRefOid —
    // these are the post-squash drift commits (the cascade signal).
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array.
    const logResult = spawnSync(
      "git",
      ["log", `${headRefOid}..origin/${branchName}`, "--format=%H"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (logResult.status !== 0) {
      return { status: "error", reason: `git log failed: ${(logResult.stderr ?? "").toString().slice(0, 200)}` };
    }
    const allMissing = (logResult.stdout ?? "")
      .trim()
      .split("\n")
      .filter(line => line.length > 0);
    const missingCommits = allMissing.slice(0, MAX_REPORTED_MISSING_COMMITS);
    return { status: "ok", missingCommits };
  },
};

/**
 * Single poll iteration. Fetches merged PRs, runs the cascade detector
 * on each, and publishes a missed-substrate-cascade envelope per finding
 * (unless noPublish). Slice 3 (2026-05-13) wired the real detector;
 * REAL_ADAPTERS.detectCascade now calls `realCascadeDetector` with real
 * gh + git sub-adapters.
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
      : `${fetch.prs.length} merged PR(s) in last ${config.lookbackMin}min; no cascades detected${truncatedSuffix}`,
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
