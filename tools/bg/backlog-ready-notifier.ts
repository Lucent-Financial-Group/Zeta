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

/** Parse a single backlog file's frontmatter into a BacklogRow. */
export function parseRow(content: string, filename: string): BacklogRow | null {
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!fmMatch) return null;
  const frontmatter = fmMatch[1] ?? "";

  const idMatch = /^id:\s*(\S+)/m.exec(frontmatter);
  const priorityMatch = /^priority:\s*(\S+)/m.exec(frontmatter);
  const statusMatch = /^status:\s*(\S+)/m.exec(frontmatter);
  const depsMatch = /^depends_on:\s*\[(.*?)\]/m.exec(frontmatter);

  if (!idMatch || !priorityMatch || !statusMatch) return null;

  const dependsOn = depsMatch && depsMatch[1]
    ? depsMatch[1]
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)
    : [];

  return {
    id: idMatch[1] ?? "",
    priority: priorityMatch[1] ?? "",
    status: statusMatch[1] ?? "",
    dependsOn,
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
 * Single poll iteration. Scans the backlog and classifies rows by readiness:
 * a row is "ready" iff it is open AND every dependency is closed.
 */
export function pollOnce(
  config: NotifierConfig,
  adapters: Adapters = REAL_ADAPTERS,
): PollResult {
  const pollAt = adapters.now();
  const allRows = adapters.scanBacklog(config.backlogDir);
  const openRows = allRows.filter(r => r.status === "open");
  const idToStatus = new Map(allRows.map(r => [r.id, r.status]));

  const readyRows = openRows.filter(r =>
    r.dependsOn.every(dep => idToStatus.get(dep) === "closed"),
  );

  return {
    pollAt: pollAt.toISOString(),
    totalOpenRows: openRows.length,
    readyRowsFound: readyRows.length,
    candidateIds: readyRows.slice(0, 10).map(r => r.id),
    note: readyRows.length > 0
      ? `${readyRows.length} of ${openRows.length} open rows are ready-to-grind (deps satisfied); top candidates: ${readyRows.slice(0, 5).map(r => r.id).join(", ")}`
      : `${openRows.length} open rows but none ready (all have unsatisfied deps); future slice 4 will publish bus assignments when ready rows exist`,
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

const KNOWN_FLAGS = new Set(["--once", "--poll-min", "--backlog-dir"]);

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
    } else if (KNOWN_FLAGS.has(arg)) {
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
