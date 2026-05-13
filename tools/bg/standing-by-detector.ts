// standing-by-detector.ts — B-0440 slice 4: bus publish on idle detection
//
// Background service that detects Standing-by failure mode (idle agent
// while cron fires) by comparing the timestamp of the most recent commit
// on HEAD against a configurable idle threshold. Slice 4 adds bus publish:
// when idle is detected, the detector publishes an `infinite-backlog-nudge`
// envelope via the B-0400 protocol so any subscribing agent can react.
//
// PR-activity polling is still TBD (slice 3). Slice 4 is wired ahead of
// slice 3 because the bus publish path is small and unblocks the
// full reactive loop (detect → nudge).
//
// Run: bun tools/bg/standing-by-detector.ts [--once] [--poll-min N] [--idle-min N] [--no-publish] [--agent NAME]
// Compose with: B-0440 + B-0400 (bus, PR #3016) + B-0441 (proactive notifier).

import { spawnSync } from "node:child_process";
import { publish } from "../bus/bus";
import type { AgentId, MessageEnvelope, SenderAgentId } from "../bus/types";

export type DetectorConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** Idle threshold — if no commit in this many minutes, flag Standing-by */
  idleThresholdMin: number;
  /** When true, run a single poll and exit (for testing / cron-driven mode) */
  once: boolean;
  /** When true, skip bus publish even on idle detection (dry-run mode). */
  noPublish: boolean;
  /** Bus sender identity (the detector publishes as this agent). */
  fromAgent: SenderAgentId;
  /** Bus recipient (default "*" = broadcast nudge to all agents). */
  toAgent: AgentId;
};

export const DEFAULT_CONFIG: DetectorConfig = {
  pollIntervalMin: 5,
  idleThresholdMin: 15,
  once: false,
  noPublish: false,
  fromAgent: "otto",
  toAgent: "*",
};

export type PollResult = {
  pollAt: string; // ISO-8601
  idleDetected: boolean;
  lastCommitAt: string | null;
  idleMinutes: number | null;
  /** Envelope ID if a nudge was published, null otherwise. */
  publishedEnvelopeId: string | null;
  note: string;
};

/** Adapter abstraction so tests can inject deterministic time + git + bus. */
export type Adapters = {
  now: () => Date;
  lastCommitIso: () => string | null;
  publishNudge: (
    from: SenderAgentId,
    to: AgentId,
    idleMinutes: number,
    rationale: string,
  ) => MessageEnvelope;
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
  publishNudge: (from, to, idleMinutes, rationale) =>
    publish(from, to, {
      topic: "infinite-backlog-nudge",
      payload: { idleMinutes, rationale },
    }),
};

/**
 * Single poll iteration. Reads the most recent commit on HEAD, compares
 * against the idle threshold, and publishes a bus nudge when idle is
 * detected (unless noPublish is set).
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
      publishedEnvelopeId: null,
      note: "no commit found on HEAD (fresh repo or git unavailable); cannot evaluate idle threshold",
    };
  }

  const lastCommit = new Date(lastCommitIso);
  const idleMs = pollAt.getTime() - lastCommit.getTime();
  const idleMinutes = Math.max(0, idleMs / 60_000);
  const idleDetected = idleMinutes >= config.idleThresholdMin;

  let publishedEnvelopeId: string | null = null;
  if (idleDetected && !config.noPublish) {
    const rationale = `Standing-by detected: ${idleMinutes.toFixed(1)}min since last commit on HEAD (threshold ${config.idleThresholdMin}min). Pick decomposition work per infinite-backlog metabolism.`;
    const envelope = adapters.publishNudge(config.fromAgent, config.toAgent, idleMinutes, rationale);
    publishedEnvelopeId = envelope.id;
  }

  return {
    pollAt: pollAt.toISOString(),
    idleDetected,
    lastCommitAt: lastCommit.toISOString(),
    idleMinutes,
    publishedEnvelopeId,
    note: idleDetected
      ? `idle ${idleMinutes.toFixed(1)}min >= threshold ${config.idleThresholdMin}min — Standing-by candidate${publishedEnvelopeId ? ` (nudge published; envelope=${publishedEnvelopeId})` : config.noPublish ? " (publish skipped per --no-publish)" : ""}`
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

const VALID_SENDER_IDS = ["otto", "alexa", "riven", "vera", "lior"] as const;
const VALID_AGENT_IDS = [...VALID_SENDER_IDS, "*"] as const;

function parseSenderId(raw: string | undefined): SenderAgentId {
  if (raw === undefined) throw new Error("--agent requires a value");
  if ((VALID_SENDER_IDS as readonly string[]).includes(raw)) return raw as SenderAgentId;
  throw new Error(`--agent must be one of ${VALID_SENDER_IDS.join(", ")}; got "${raw}"`);
}

function parseAgentId(raw: string | undefined): AgentId {
  if (raw === undefined) throw new Error("--to requires a value");
  if ((VALID_AGENT_IDS as readonly string[]).includes(raw)) return raw as AgentId;
  throw new Error(`--to must be one of ${VALID_AGENT_IDS.join(", ")}; got "${raw}"`);
}

const KNOWN_FLAGS = ["--once", "--poll-min", "--idle-min", "--no-publish", "--agent", "--to"] as const;

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
    } else if (arg === "--idle-min") {
      config.idleThresholdMin = parsePositiveMinutes(argv[++i], "--idle-min");
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
