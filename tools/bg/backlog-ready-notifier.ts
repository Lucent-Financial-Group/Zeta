// backlog-ready-notifier.ts — B-0441 slice 2: backlog row scan (real readiness detection)
//
// Background service that proactively surfaces ready-to-grind backlog rows
// (open, dependencies satisfied) to agents whose queue is empty. Composes
// with B-0440 (Standing-by detector): B-0440 catches the failure mode AFTER
// it occurs (reactive); this service PREVENTS the failure mode by surfacing
// work BEFORE the agent goes idle (proactive).
//
// Slice 2 adds real backlog parsing — scans docs/backlog/P*/B-*.md for rows
// where status: open AND every depends_on row is closed. Reports the count
// of ready rows and the first N row IDs as candidate work targets.
//
// Queue-state detection (slice 3) and bus integration (slice 4) still TBD.
//
// Run: bun tools/bg/backlog-ready-notifier.ts [--once] [--poll-min N] [--backlog-dir PATH]
// Compose with: B-0441 + B-0400 (bus) + B-0440 (reactive peer).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type NotifierConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** When true, run a single poll and exit */
  once: boolean;
  /** Directory containing P{0..3}/B-NNNN-*.md backlog rows */
  backlogDir: string;
};

export const DEFAULT_CONFIG: NotifierConfig = {
  pollIntervalMin: 10,
  once: false,
  backlogDir: "docs/backlog",
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
  candidateIds: string[]; // up to first 10 ready row IDs
  note: string;
};

/** Adapter abstraction so tests can inject deterministic time + filesystem. */
export type Adapters = {
  now: () => Date;
  scanBacklog: (backlogDir: string) => BacklogRow[];
};

/**
 * Parse depends_on from frontmatter. Supports both YAML inline-flow
 * and block-style lists. Returns empty array when missing.
 */
function parseDependsOn(frontmatter: string): string[] {
  // Inline flow style: depends_on: [A, B, C]
  const inlineMatch = frontmatter.match(/^depends_on:\s*\[(.*?)\]/m);
  if (inlineMatch && inlineMatch[1] !== undefined) {
    return inlineMatch[1]
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Block style: depends_on:\n  - A\n  - B
  const blockMatch = frontmatter.match(/^depends_on:\s*\n((?:[ \t]+-[ \t]*[^\r\n]+\r?\n?)+)/m);
  if (blockMatch && blockMatch[1] !== undefined) {
    return blockMatch[1]
      .split(/\r?\n/)
      .map(line => line.match(/^[ \t]+-[ \t]*(.+?)\s*$/)?.[1] ?? "")
      .filter(s => s.length > 0);
  }

  return [];
}

/** Parse a single backlog file's frontmatter into a BacklogRow. */
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
        continue; // priority dir doesn't exist; skip
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
};

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

/**
 * Single poll iteration. Scans the backlog and classifies rows by readiness:
 * a row is "ready" iff it is open AND every dependency is satisfied
 * (closed or superseded). Dangling dep references are reported separately.
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

  const danglingNote = danglingDeps.size > 0
    ? ` (warning: ${danglingDeps.size} dangling dep ref(s) — first: ${[...danglingDeps].slice(0, 3).join(", ")})`
    : "";

  return {
    pollAt: pollAt.toISOString(),
    totalOpenRows: openRows.length,
    readyRowsFound: readyRows.length,
    candidateIds: readyRows.slice(0, 10).map(r => r.id),
    note: readyRows.length > 0
      ? `${readyRows.length} of ${openRows.length} open rows are ready-to-grind (deps satisfied); top candidates: ${readyRows.slice(0, 5).map(r => r.id).join(", ")}${danglingNote}`
      : `${openRows.length} open rows but none ready (all have unsatisfied deps)${danglingNote}; future slice 4 will publish bus assignments when ready rows exist`,
  };
}

/** Run a single poll iteration and return its result. */
export function runOnce(config: NotifierConfig = DEFAULT_CONFIG): PollResult {
  const result = pollOnce(config);
  console.log(JSON.stringify(result));
  return result;
}

/**
 * Run the notifier as a daemon. Sleeps for pollIntervalMin between
 * iterations and never returns; results are NOT accumulated.
 */
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

const KNOWN_FLAGS = ["--once", "--poll-min", "--backlog-dir"] as const;

export function parseArgs(argv: string[]): NotifierConfig {
  const config: NotifierConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") {
      config.once = true;
    } else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    } else if (arg === "--backlog-dir") {
      const next = argv[++i];
      if (next === undefined) throw new Error("--backlog-dir requires a value");
      config.backlogDir = next;
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
