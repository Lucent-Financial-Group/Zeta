/**
 * tools/observe/load-world.ts — wire the real World snapshot (closes the loop).
 *
 * observe.ts's roadmap was "wire the real World snapshot + execute the pick." The
 * execute side landed (execute.ts + event-sink-folder.ts). `loadWorld` is the
 * read side: it builds a `World` from the real channels so the loop runs for real:
 *
 *   loadWorld()  →  observe / observeWithLlm  →  execute (append event)  →  loadWorld()  →  …
 *
 * Two channels, each its own source of truth:
 *
 *   - BACKLOG  ← the existing selector (the oracle). Per backlog-reader.ts we do
 *     NOT reimplement selection: `nextActionFromBacklog` runs the priority-ranked
 *     `selectNextBacklogItem`, and the chosen item (if any) IS the world's backlog
 *     for this tick. A free_time selection (empty/blocked) → empty backlog.
 *   - MODE     ← a FOLD of the event log (per observe.ts v5: state is a projection
 *     of the event log). The events `execute` appended (via the folder sink) carry
 *     the chosen mode; folding them yields the persisted mode (operator: "i love
 *     mode persistance"). This is the read side of what the folder sink writes —
 *     the loop closing on itself.
 *
 * Schema-on-read (decoupled reader): `loadWorld` tolerantly parses the event JSON
 * for just `{ id, at, action }` — the reader doesn't depend on the writer's type,
 * skips anything malformed, and validates the action kind before trusting it. The
 * folder + the canonical-id shape are the only contract.
 *
 * operator is OPTIONAL: absent = a background agent (no operator wired); a
 * foreground caller injects the live channel. Same World DU, fewer channels.
 *
 * Pure-shaped + sync (reads files); the `nextAction` channel is injectable so the
 * whole thing is testable without the real backlog.
 *
 * Composes with:
 *   - tools/observe/observe.ts (World / BacklogItem / Mode / NextAction / fold)
 *   - tools/observe/backlog-reader.ts (the backlog channel; selector = oracle)
 *   - tools/observe/execute.ts + event-sink-folder.ts (the write side this reads back)
 *   - docs/DECISIONS/2026-05-31-observe-act-16-direction-universal-action-grammar-local-no-cloud-llm.md
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { nextActionFromBacklog, type Priority } from "./backlog-reader";
import { fold, type BacklogItem, type Mode, type NextAction, type OperatorChannel, type World } from "./observe";

/** The NextAction kinds a folded event log may legitimately contain. */
const KNOWN_KINDS: ReadonlySet<string> = new Set([
  "preserve_ferry",
  "respond_to_operator",
  "do_item",
  "decompose",
  "explore",
  "play",
  "self_reflect",
  "free_time",
  "edit_grammar",
]);

const isCanonicalEventId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{32}$/.test(id);

/** What the reader extracts from one event file (schema-on-read; ignores extra fields). */
interface ParsedEvent {
  readonly id: string;
  readonly at: string;
  readonly action: NextAction;
}

/**
 * Read + deterministically order the event log → the recorded actions. Tolerant:
 * a missing dir, a non-JSON file, a malformed envelope, a non-canonical id, or an
 * unknown action kind is skipped (never throws). Ordered by `at` then `id` so the
 * fold is replayable (DST).
 */
export function readEventActions(eventDir: string): readonly NextAction[] {
  let names: readonly string[];
  try {
    names = readdirSync(eventDir);
  } catch {
    return []; // no event dir yet → empty log
  }
  const parsed: ParsedEvent[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw: unknown = JSON.parse(readFileSync(join(eventDir, name), "utf-8"));
      if (typeof raw !== "object" || raw === null) continue;
      const env = raw as Record<string, unknown>;
      const action = env.action;
      if (!isCanonicalEventId(env.id) || typeof env.at !== "string") continue;
      if (typeof action !== "object" || action === null) continue;
      const kind = (action as Record<string, unknown>).kind;
      if (typeof kind !== "string" || !KNOWN_KINDS.has(kind)) continue;
      parsed.push({ id: env.id, at: env.at, action: action as NextAction });
    } catch {
      continue; // malformed file → skip
    }
  }
  parsed.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return 0;
  });
  return parsed.map((p) => p.action);
}

export interface LoadWorldOptions {
  /** The git folder the folder sink appended events to (the mode channel). */
  readonly eventDir: string;
  /** Backlog channel (default: the real selector). Inject in tests. */
  readonly nextAction?: () => NextAction;
  /** Repo root for the default backlog channel (default: process.cwd()). */
  readonly repoRoot?: string;
  readonly activeClaims?: readonly string[];
  readonly maxPriority?: Priority;
  /** Live operator channel; omit for a background agent. */
  readonly operator?: OperatorChannel;
}

/**
 * Build the real `World`: backlog from the selector (oracle), mode from folding
 * the event log, operator if wired. The snapshot `observe()` reads — now sourced
 * from real channels, closing the observe → execute → observe loop.
 */
export function loadWorld(opts: LoadWorldOptions): World {
  const next = opts.nextAction
    ? opts.nextAction()
    : nextActionFromBacklog(opts.repoRoot ?? process.cwd(), opts.activeClaims ?? [], opts.maxPriority ?? "P2");
  // Selector = oracle: the chosen item IS the backlog for this tick (no re-selection).
  const backlog: readonly BacklogItem[] =
    next.kind === "do_item" || next.kind === "decompose" ? [next.item] : [];

  // Mode = projection of the event log (v5). Fold over an EMPTY backlog: mode
  // transitions don't depend on backlog contents, so this isolates the persisted mode.
  const mode: Mode | undefined = fold({ backlog: [] }, readEventActions(opts.eventDir)).mode;

  return {
    backlog,
    ...(mode !== undefined ? { mode } : {}),
    ...(opts.operator !== undefined ? { operator: opts.operator } : {}),
  };
}
