import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { MutationLogEntry, MutationOptions, MutationRequest } from "./mutate";
import { mutate } from "./mutate";

// ---------------------------------------------------------------------------
// Log file location
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const DEFAULT_LOG_PATH = resolve(REPO_ROOT, "docs/hygiene-history/playwright-mutations/log.jsonl");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A drain-log entry persisted on disk.  Extends the in-memory MutationLogEntry
 * with a mutable status so that revert events can be recorded as new lines in
 * the same append-only file.
 */
export type DrainLogEntry = Omit<MutationLogEntry, "status"> & {
  readonly status: "applied" | "reverted";
};

export interface RevertSuccess {
  readonly success: true;
  readonly entryId: string;
}

export interface RevertFailure {
  readonly success: false;
  readonly entryId: string;
  readonly error: string;
}

export type RevertResult = RevertSuccess | RevertFailure;

// ---------------------------------------------------------------------------
// Core I/O helpers
// ---------------------------------------------------------------------------

function ensureLogDir(logPath: string): void {
  const dir = dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Parse all lines from the log file, skipping blank lines. */
function readAllLines(logPath: string): DrainLogEntry[] {
  if (!existsSync(logPath)) return [];
  const raw = readFileSync(logPath, "utf8");
  const entries: DrainLogEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    entries.push(JSON.parse(trimmed) as DrainLogEntry);
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Append a MutationLogEntry (produced by mutate.ts) to the drain log.
 * The file is created (including parent directories) if absent.
 * Append-only — never modifies existing lines.
 */
export function appendEntry(entry: MutationLogEntry, logPath: string = DEFAULT_LOG_PATH): void {
  ensureLogDir(logPath);
  const line = JSON.stringify(entry as DrainLogEntry) + "\n";
  appendFileSync(logPath, line, "utf8");
}

/**
 * Return all drain-log entries whose effective (latest) status is "applied".
 *
 * Because the file is append-only, a revert is recorded as a second line
 * with the same id and status "reverted".  We reduce to the latest status
 * per id so that listing reflects current reality.
 */
export function listPending(logPath: string = DEFAULT_LOG_PATH): DrainLogEntry[] {
  const all = readAllLines(logPath);
  // Track latest status per id
  const latestStatus = new Map<string, "applied" | "reverted">();
  // Track the full entry keyed by id (last-wins for metadata, but status is separate)
  const byId = new Map<string, DrainLogEntry>();
  for (const entry of all) {
    latestStatus.set(entry.id, entry.status);
    byId.set(entry.id, entry);
  }
  const result: DrainLogEntry[] = [];
  for (const [id, status] of latestStatus) {
    if (status === "applied") {
      const entry = byId.get(id);
      if (entry !== undefined) result.push(entry);
    }
  }
  return result;
}

/**
 * Mechanically undo a logged mutation.
 *
 * Reads the inverse action from the log entry, calls mutate() with it, then
 * appends a new log line marking the entry as "reverted".  The original line
 * is never modified (append-only invariant).
 *
 * Returns a RevertResult — callers should check `success` before proceeding.
 */
export async function revert(
  entryId: string,
  options: MutationOptions = {},
  logPath: string = DEFAULT_LOG_PATH,
): Promise<RevertResult> {
  const all = readAllLines(logPath);

  // Find the most recent record for this id
  const entries = all.filter((e) => e.id === entryId);
  if (entries.length === 0) {
    return { success: false, entryId, error: `No log entry found with id "${entryId}".` };
  }

  const latest = entries[entries.length - 1] as DrainLogEntry;
  if (latest.status === "reverted") {
    return { success: false, entryId, error: `Entry "${entryId}" is already reverted.` };
  }

  // Build the inverse request
  const inverseRequest: MutationRequest = {
    surfaceId: latest.surfaceId,
    action: latest.inverseAction,
    params: latest.params,
  };

  const result = await mutate(inverseRequest, options);
  if (!result.success) {
    return { success: false, entryId, error: `Inverse mutation failed: ${result.error}` };
  }

  // Append revert marker (minimal — just id + status + timestamp)
  const revertMarker: DrainLogEntry = {
    ...result.drainLogEntry,
    id: entryId,         // same id as original — this is the revert event
    status: "reverted",
  };
  ensureLogDir(logPath);
  appendFileSync(logPath, JSON.stringify(revertMarker) + "\n", "utf8");

  return { success: true, entryId };
}
