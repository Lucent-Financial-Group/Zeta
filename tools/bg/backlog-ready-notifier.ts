// backlog-ready-notifier.ts — B-0441 slice 4: bus publish (work-assignment topic)
//
// Background service that proactively surfaces ready-to-grind backlog rows
// to agents whose queue is empty. Slice 4 adds bus publish: when ready
// rows are found, the notifier publishes a `work-assignment` envelope per
// ready candidate (capped) via the B-0400 protocol.
//
// Queue-state detection (only assign when an agent's queue is empty) is
// slice 5; slice 4 publishes unconditionally when ready rows exist so the
// reactive loop is closed end-to-end.
//
// Run: bun tools/bg/backlog-ready-notifier.ts [--once] [--poll-min N] [--backlog-dir PATH] [--no-publish] [--agent NAME] [--to NAME] [--max-assignments N]
// Compose with: B-0441 + B-0400 (bus) + B-0440 (reactive peer).

import { readdirSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { publish } from "../bus/bus";
import { AGENT_IDS, SENDER_IDS, type AgentId, type MessageEnvelope, type SenderAgentId } from "../bus/types";

export type NotifierConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** When true, run a single poll and exit */
  once: boolean;
  /** Directory containing P{0..3}/B-NNNN-*.md backlog rows */
  backlogDir: string;
  /** When true, skip bus publish (dry-run mode) */
  noPublish: boolean;
  /** Bus sender identity */
  fromAgent: SenderAgentId;
  /** Bus recipient (default "*" = broadcast) */
  toAgent: AgentId;
  /** Max number of work-assignment envelopes to publish per poll */
  maxAssignments: number;
  /**
   * Agent whose queue state is checked before assignment. CLI input is
   * validated against `Object.keys(AGENT_MAP)` (identity-level: otto / alexa /
   * lior / vera / riven) so typos error loudly instead of silently no-opping
   * the queue check via the "unknown agent = empty" branch of
   * isAgentQueueEmpty. Tests may set this field directly to inject custom
   * patterns via `adapters.agentPatterns`.
   */
  targetAgent: string;
  /** File path to track recent assignments */
  historyFile: string;
  /** Cooldown window in minutes to avoid re-assigning the same row */
  cooldownMin: number;
};

export const DEFAULT_CONFIG: NotifierConfig = {
  pollIntervalMin: 10,
  once: false,
  backlogDir: "docs/backlog",
  noPublish: false,
  fromAgent: "otto",
  toAgent: "*",
  maxAssignments: 3,
  targetAgent: "otto",
  historyFile: process.env.ZETA_BUS_DIR ? join(process.env.ZETA_BUS_DIR, "assignment-history.json") : "/tmp/zeta-bus/assignment-history.json",
  cooldownMin: 30,
};

export type AssignmentHistoryEntry = {
  rowId: string;
  publishedAt: string; // ISO-8601
};

export type AssignmentHistory = {
  entries: AssignmentHistoryEntry[];
};

export type BacklogRow = {
  id: string;
  priority: string;
  status: string;
  dependsOn: string[];
  filename: string;
};

export type PollResult = {
  pollAt: string; // ISO-8601
  totalOpenRows: number;
  readyRowsFound: number;
  candidateIds: string[];
  publishedEnvelopeIds: string[];
  /** Structured publish-failure reason; null on success or skip. */
  lastPublishError: string | null;
  queueBusy: boolean;
  skippedDueToCooldown: string[];
  note: string;
};

/** Adapter abstraction so tests can inject deterministic time + filesystem + bus + shell. */
export type Adapters = {
  now: () => Date;
  scanBacklog: (backlogDir: string) => BacklogRow[];
  publishAssignment: (
    from: SenderAgentId,
    to: AgentId,
    rowId: string,
    priority: "P0" | "P1" | "P2" | "P3",
    rationale: string,
  ) => MessageEnvelope;
  agentPatterns: Record<string, string[]>;
  /** Returns git log output, or null if the git invocation fails (treat as indeterminate). */
  execGitLog: (sinceMinutes: number) => string | null;
  /** Returns `gh pr list` JSON output, or null if the gh invocation fails (treat as indeterminate). */
  execGhPrList: () => string | null;
  readHistoryFile: (path: string) => AssignmentHistory | null;
  writeHistoryFile: (path: string, history: AssignmentHistory) => void;
};

// Keys are lowercase to match the canonical bus agent IDs (SENDER_IDS in tools/bus/types.ts).
// Only otto/alexa/riven/vera/lior are valid SENDER_IDS; aaron is a human, not a bus sender.
export const AGENT_MAP: Record<string, string[]> = {
  otto: ["Co-Authored-By: Claude"],
  alexa: ["kiro", "alexa", "qwen"],
  lior: ["lior", "gemini"],
  vera: ["codex", "vera"],
  riven: ["riven", "grok"],
};

// Strip a YAML inline comment from a parsed depends_on value.
// Lines like `- B-0395  # operational-resonance-conversation-interface`
// previously produced the full string (including the comment) as a
// "dependency ID" which then surfaced as a false-positive dangling-dep
// warning. YAML's spec treats `#` (preceded by whitespace) as the start
// of a comment outside quoted contexts; backlog IDs never contain `#`,
// so the simple "split on whitespace-#" handling is sufficient and safe.
function stripInlineComment(value: string): string {
  const idx = value.search(/\s+#/);
  return (idx === -1 ? value : value.slice(0, idx)).trim();
}

function parseDependsOn(frontmatter: string): string[] {
  const inlineMatch = frontmatter.match(/^depends_on:\s*\[(.*?)\]/m);
  if (inlineMatch && inlineMatch[1] !== undefined) {
    return inlineMatch[1]
      .split(",")
      .map(s => stripInlineComment(s.trim()))
      .filter(s => s.length > 0);
  }
  const blockMatch = frontmatter.match(/^depends_on:\s*\n((?:[ \t]+-[ \t]*[^\r\n]+\r?\n?)+)/m);
  if (blockMatch && blockMatch[1] !== undefined) {
    return blockMatch[1]
      .split(/\r?\n/)
      .map(line => stripInlineComment(line.match(/^[ \t]+-[ \t]*(.+?)\s*$/)?.[1] ?? ""))
      .filter(s => s.length > 0);
  }
  return [];
}

export function parseRow(content: string, filename: string): BacklogRow | null {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const frontmatter = fmMatch[1] ?? "";
  const idMatch = frontmatter.match(/^id:\s*(\S+)/m);
  const priorityMatch = frontmatter.match(/^priority:\s*(\S+)/m);
  const statusMatch = frontmatter.match(/^status:\s*(\S+)/m);
  if (!idMatch || !priorityMatch || !statusMatch) return null;
  return {
    id: idMatch[1] ?? "",
    priority: priorityMatch[1] ?? "",
    status: statusMatch[1] ?? "",
    dependsOn: parseDependsOn(frontmatter),
    filename,
  };
}

const REAL_ADAPTERS: Adapters = {
  now: () => new Date(),
  scanBacklog: (backlogDir: string) => {
    const rows: BacklogRow[] = [];
    const priorities = ["P0", "P1", "P2", "P3"];
    for (const p of priorities) {
      const dir = join(backlogDir, p);
      let files: string[];
      try {
        files = readdirSync(dir).filter(f => f.startsWith("B-") && f.endsWith(".md"));
      } catch {
        continue;
      }
      for (const file of files) {
        try {
          const content = readFileSync(join(dir, file), "utf8");
          const row = parseRow(content, file);
          if (row !== null) rows.push(row);
        } catch {
          // skip unreadable files
        }
      }
    }
    return rows;
  },
  publishAssignment: (from, to, rowId, priority, rationale) =>
    publish(from, to, {
      topic: "work-assignment",
      payload: { rowId, priority, rationale },
    }),
  agentPatterns: AGENT_MAP,
  execGitLog: (sinceMinutes: number) => {
    const cutoff = Math.floor(Date.now() / 1000) - (sinceMinutes * 60);
    const { spawnSync } = require("node:child_process");
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array; no shell, no injection risk.
    const result = spawnSync(
      "git",
      ["log", "--all", `--since=${cutoff}`, "--format=%an %B"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    if (result.status !== 0 || result.error) return null;
    return result.stdout ?? "";
  },
  execGhPrList: () => {
    const { spawnSync } = require("node:child_process");
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- gh invoked as explicit args array; no shell, no injection risk.
    const result = spawnSync(
      "gh",
      ["pr", "list", "--state", "open", "--limit", "1000", "--json", "title,body,author"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    if (result.status !== 0 || result.error) return null;
    return result.stdout ?? "";
  },
  readHistoryFile: (path: string) => {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as AssignmentHistory;
    } catch {
      return null;
    }
  },
  // Atomic file replacement: tmp-then-rename guarantees readers never see
  // a torn (half-written) file. It does NOT serialize across concurrent
  // writers — two notifier instances writing simultaneously will both
  // rename their tmp file over the target, last-writer-wins. The dedup /
  // cooldown contract here holds only for single-process notifier; a
  // CAS-on-content or file-lock layer is out of scope for slice 5a.
  writeHistoryFile: (path: string, history: AssignmentHistory) => {
    const tmp = `${path}.tmp.${Date.now()}`;
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, JSON.stringify(history, null, 2));
    renameSync(tmp, path);
  },
};

/**
 * Defensive normalizer: accepts whatever readHistoryFile returns and
 * coerces it to a well-formed AssignmentHistory. Returning `null`,
 * `{}`, or any object missing/malforming `entries` falls back to an
 * empty entries array rather than throwing inside pollOnce's filter.
 */
function normalizeHistory(raw: AssignmentHistory | null): AssignmentHistory {
  if (raw === null || typeof raw !== "object") return { entries: [] };
  const entries = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return { entries: [] };
  return { entries: entries.filter(
    (e): e is AssignmentHistoryEntry =>
      e !== null && typeof e === "object"
      && typeof (e as { rowId?: unknown }).rowId === "string"
      && typeof (e as { publishedAt?: unknown }).publishedAt === "string",
  ) };
}

/**
 * Returns true if the agent has no commits in the last 30 minutes AND
 * no currently open PRs. Returns false (conservative) when any adapter
 * call fails — a sensor failure must not be mistaken for agent inactivity.
 */
export function isAgentQueueEmpty(
  agentName: string,
  adapters: Adapters = REAL_ADAPTERS,
): boolean {
  const patterns = adapters.agentPatterns[agentName.toLowerCase()] ?? [];
  if (patterns.length === 0) return true; // unknown agent = queue empty

  const logOutput = adapters.execGitLog(30);
  if (logOutput === null) return false; // git unavailable — treat as busy
  const logStr = logOutput.toLowerCase();
  const hasCommits = patterns.some(p => logStr.includes(p.toLowerCase()));
  if (hasCommits) return false;

  const prOutput = adapters.execGhPrList();
  if (prOutput === null) return false; // gh unavailable — treat as busy
  const prStr = prOutput.toLowerCase();
  const hasPRs = patterns.some(p => prStr.includes(p.toLowerCase()));
  if (hasPRs) return false;

  return true;
}

/**
 * A dependency is "satisfied" iff the dep's row status is `closed` OR begins
 * with `superseded-by-` (matching the canonical generator's checkbox logic
 * in tools/backlog/generate-index.ts). A dangling reference (dep ID not
 * present in the scan) is treated as UNSATISFIED.
 */
function isDepSatisfied(depStatus: string | undefined): boolean {
  if (depStatus === undefined) return false;
  return depStatus === "closed" || depStatus.startsWith("superseded-by-");
}

function isValidPriority(s: string): s is "P0" | "P1" | "P2" | "P3" {
  return s === "P0" || s === "P1" || s === "P2" || s === "P3";
}

/**
 * Single poll iteration. Scans backlog, identifies ready-to-grind rows,
 * and publishes up to maxAssignments work-assignment envelopes (unless
 * noPublish).
 */
export function pollOnce(
  config: NotifierConfig,
  adapters: Adapters = REAL_ADAPTERS,
): PollResult {
  const pollAt = adapters.now();
  const allRows = adapters.scanBacklog(config.backlogDir);
  const openRows = allRows.filter(r => r.status === "open");
  const idToStatus = new Map(allRows.map(r => [r.id, r.status]));

  const danglingDeps = new Set<string>();
  for (const row of openRows) {
    for (const dep of row.dependsOn) {
      if (!idToStatus.has(dep)) danglingDeps.add(dep);
    }
  }

  const readyRows = openRows.filter(r =>
    r.dependsOn.every(dep => isDepSatisfied(idToStatus.get(dep))),
  );

  const busy = !isAgentQueueEmpty(config.targetAgent, adapters);
  if (busy) {
    return {
      pollAt: pollAt.toISOString(),
      totalOpenRows: openRows.length,
      readyRowsFound: readyRows.length,
      candidateIds: readyRows.slice(0, 10).map(r => r.id),
      publishedEnvelopeIds: [],
      lastPublishError: null,
      queueBusy: true,
      skippedDueToCooldown: [],
      note: `queue busy for ${config.targetAgent} — skip publish`,
    };
  }

  const history = normalizeHistory(adapters.readHistoryFile(config.historyFile));
  const cooldownMs = config.cooldownMin * 60_000;
  const activeEntries = new Set(
    history.entries
      .filter(e => pollAt.getTime() - new Date(e.publishedAt).getTime() < cooldownMs)
      .map(e => e.rowId),
  );

  const toPublishRows = readyRows.filter(r => !activeEntries.has(r.id));
  const skippedDueToCooldown = readyRows.filter(r => activeEntries.has(r.id)).map(r => r.id);

  // Track envelope+row as pairs so cooldown entries record the row that was
  // actually published (not a wrong-indexed `toAssign[i]` when an earlier
  // row was skipped via `continue` for invalid priority).
  const publishedPairs: { envelopeId: string; rowId: string }[] = [];
  let lastPublishError: string | null = null;
  if (!config.noPublish && toPublishRows.length > 0) {
    const toAssign = toPublishRows.slice(0, config.maxAssignments);
    for (const row of toAssign) {
      if (!isValidPriority(row.priority)) continue;
      const rationale = `Ready-to-grind: ${row.id} is open with all deps satisfied. Decomposition discipline (PR #2999) says decompose ambiguous parents into concrete slices.`;
      try {
        const envelope = adapters.publishAssignment(
          config.fromAgent,
          config.toAgent,
          row.id,
          row.priority,
          rationale,
        );
        publishedPairs.push({ envelopeId: envelope.id, rowId: row.id });
      } catch (e) {
        // Bus publish failure must NOT kill the poll loop. Captured in
        // lastPublishError (structured + machine-readable per Riven P1).
        lastPublishError = e instanceof Error ? e.message : String(e);
        break; // stop the batch on first failure; next tick retries
      }
    }

    if (publishedPairs.length > 0) {
      const newEntries: AssignmentHistoryEntry[] = [
        ...history.entries.filter(
          e => pollAt.getTime() - new Date(e.publishedAt).getTime() < cooldownMs
        ),
        ...publishedPairs.map(p => ({ rowId: p.rowId, publishedAt: pollAt.toISOString() })),
      ];
      adapters.writeHistoryFile(config.historyFile, { entries: newEntries });
    }
  }
  const publishedEnvelopeIds = publishedPairs.map(p => p.envelopeId);

  const danglingNote = danglingDeps.size > 0
    ? ` (warning: ${danglingDeps.size} dangling dep ref(s) — first: ${[...danglingDeps].slice(0, 3).join(", ")})`
    : "";

  const publishNote = lastPublishError !== null
    ? ` (publish failed: ${lastPublishError})`
    : config.noPublish
    ? " (publish skipped per --no-publish)"
    : publishedEnvelopeIds.length > 0
    ? ` (published ${publishedEnvelopeIds.length} assignment envelope(s))`
    : "";

  return {
    pollAt: pollAt.toISOString(),
    totalOpenRows: openRows.length,
    readyRowsFound: readyRows.length,
    candidateIds: readyRows.slice(0, 10).map(r => r.id),
    publishedEnvelopeIds,
    lastPublishError,
    queueBusy: false,
    skippedDueToCooldown,
    note: readyRows.length > 0
      ? `${readyRows.length} of ${openRows.length} open rows are ready-to-grind; top candidates: ${readyRows.slice(0, 5).map(r => r.id).join(", ")}${publishNote}${danglingNote}`
      : `${openRows.length} open rows but none ready${danglingNote}`,
  };
}

/** Run a single poll iteration and return its result. */
export function runOnce(config: NotifierConfig = DEFAULT_CONFIG, adapters?: Adapters): PollResult {
  const result = pollOnce(config, adapters);
  console.log(JSON.stringify(result));
  return result;
}

export async function runDaemon(config: NotifierConfig = DEFAULT_CONFIG): Promise<never> {
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

// `targetAgent` indexes into AGENT_MAP (identity-level keys only, since
// queue-state patterns are defined per identity, not per surface). Validate
// the CLI input here so a typo (`--target-agent ott`) errors loudly instead
// of silently bypassing the queue-busy check via the
// "unknown agent = queue empty" branch in isAgentQueueEmpty.
function parseTargetAgent(raw: string | undefined): string {
  if (raw === undefined) throw new Error("--target-agent requires a value");
  const known = Object.keys(AGENT_MAP);
  if (known.includes(raw)) return raw;
  throw new Error(`--target-agent must be one of ${known.join(", ")}; got "${raw}"`);
}

const KNOWN_FLAGS = [
  "--once",
  "--poll-min",
  "--backlog-dir",
  "--no-publish",
  "--agent",
  "--to",
  "--max-assignments",
  "--target-agent",
  "--history-file",
  "--cooldown-min",
] as const;

export function parseArgs(argv: string[]): NotifierConfig {
  const config: NotifierConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--once") {
      config.once = true;
    } else if (arg === "--no-publish") {
      config.noPublish = true;
    } else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    } else if (arg === "--target-agent") {
      config.targetAgent = parseTargetAgent(argv[++i]);
    } else if (arg === "--history-file") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--history-file requires a value");
      config.historyFile = next;
    } else if (arg === "--cooldown-min") {
      config.cooldownMin = parsePositiveMinutes(argv[++i], "--cooldown-min");
    } else if (arg === "--backlog-dir") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--backlog-dir requires a value");
      config.backlogDir = next;
    } else if (arg === "--agent") {
      config.fromAgent = parseSenderId(argv[++i]);
    } else if (arg === "--to") {
      config.toAgent = parseAgentId(argv[++i]);
    } else if (arg === "--max-assignments") {
      config.maxAssignments = parsePositiveInt(argv[++i], "--max-assignments");
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
