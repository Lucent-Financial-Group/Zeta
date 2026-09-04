/**
 * corporate/org-store.ts — the organization's history, on disk.
 *
 * ── WHAT WAS IN MEMORY ───────────────────────────────────────────────────────
 * `runOrgRuntime` produced a cascade, a calendar, an anchor board, a queue and a typed event trace,
 * and every one of them was a value that died with the process. So the organization could be run
 * and could not be RESUMED, audited across runs, or asked what it did last week — and `org-event.ts`
 * exists precisely so those questions are answerable.
 *
 * ── THE TRACE IS ALREADY THE LOG ─────────────────────────────────────────────
 * Nothing new needed inventing. `OrgEvent` is already an append-only record of what happened, each
 * one carrying its own `atMs`, its subject, its actor and the supervisor chain that authorised it.
 * Persisting it is one shard per event — the convention in `shard-store.ts`, so the merge is set
 * union and two writers never contend for a path.
 *
 * ── WHY THE TRACE AND NOT THE CASCADE ────────────────────────────────────────
 * Storing the cascade, calendar and board as snapshots would put a SECOND record of the same facts
 * beside the events that produced them, and the two can disagree — the failure this register keeps
 * refusing everywhere else (a metric that disagrees with what it counts, a parent state that
 * disagrees with its leaves). The events are the facts; anything else is a fold over them, and a
 * fold cannot drift from its own input.
 *
 * The honest limit, stated rather than hidden: a full `Cascade` fold from events is NOT implemented
 * here. What this gives is a durable, queryable, mergeable history — not yet a resumable runtime.
 * `runsIn` and `eventsFor` answer "what did this organization do"; rebuilding the live value
 * objects from the log is the next step and is not claimed by this module.
 */

import { Category } from "../zeta-id/types";
import { readShards, shardZetaId, writeShard } from "../shard-store/shard-store";
import { toHex } from "../zeta-id/encoding";
import type { OrgEvent } from "./org-event";

/** A run's own summary, stored beside its events so a history has runs and not only moments. */
export interface RunRecord {
  /**
   * MINTED FROM THE RUN'S OWN CONTENT, never supplied.
   *
   * The first cut let the caller pass one and the CLI passed `run-${nowMs}` — which is not a
   * unique id when `nowMs` is fixed, as it is in every deterministic run. Two genuinely different
   * runs then shared an identity and the second silently vanished from the history: the store
   * reported "0/1 delivered" after two runs, one of which had delivered.
   *
   * Content-derived instead, so distinct runs are distinct and identical runs collapse — which is
   * the idempotency the shard shape is for, rather than an accident of the clock.
   */
  readonly runId: string;
  readonly atMs: number;
  readonly delivered: boolean;
  readonly eventCount: number;
  /** The levels that actually decided something, as the run reported them. */
  readonly levelsEngaged: readonly string[];
  readonly refusals: readonly string[];
}

const EVENTS = "events";
const RUNS = "runs";

/**
 * Identity of a stored event.
 *
 * The event's OWN `id` is the identity, not a re-mint of its content: the runtime already assigned
 * it, and re-deriving one here would create a second notion of the same event's identity. Two
 * copies of one event — a re-run, a merged branch — therefore collapse to one.
 */
function identifyEvent(event: OrgEvent): string {
  return event.id;
}

function identifyRun(run: RunRecord): string {
  return run.runId;
}

/** The run's identity: a pure function of what the run did. */
export function mintRunId(input: {
  readonly atMs: number;
  readonly delivered: boolean;
  readonly eventCount: number;
  readonly levelsEngaged: readonly string[];
  readonly refusals: readonly string[];
}): string {
  return toHex(shardZetaId(input, input.atMs, Category.Workflow));
}

/**
 * Append a run: every event as its own shard, plus the run's summary.
 *
 * Idempotent at the record level — re-appending the same run writes the same bytes to the same
 * paths, so replaying a run is an upsert rather than a duplicated history.
 */
export function appendRun(
  input: {
    readonly atMs: number;
    readonly delivered: boolean;
    readonly levelsEngaged: readonly string[];
    readonly refusals: readonly string[];
    readonly trace: readonly OrgEvent[];
  },
  root: string,
): { readonly runPath: string; readonly eventPaths: readonly string[] } {
  const eventPaths = input.trace.map((event) =>
    writeShard({ value: event, atMs: event.atMs, category: Category.Workflow, prefix: [EVENTS] }, root),
  );
  const summary = {
    atMs: input.atMs,
    delivered: input.delivered,
    eventCount: input.trace.length,
    levelsEngaged: [...input.levelsEngaged],
    refusals: [...input.refusals],
  };
  const run: RunRecord = { runId: mintRunId(summary), ...summary };
  const runPath = writeShard(
    { value: run, atMs: input.atMs, category: Category.Workflow, prefix: [RUNS] },
    root,
  );
  return { runPath, eventPaths };
}

/**
 * Every event ever stored, in the order they happened.
 *
 * Ordered by the event's own `atMs`, with its id as the tie-break — never by filename, which is an
 * artefact of the store rather than of the organization.
 */
export function readEvents(root: string): readonly OrgEvent[] {
  const events = readShards<OrgEvent>(`${root}/${EVENTS}`, identifyEvent);
  return [...events].sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
  });
}

/** Every run, oldest first. */
export function readRuns(root: string): readonly RunRecord[] {
  const runs = readShards<RunRecord>(`${root}/${RUNS}`, identifyRun);
  return [...runs].sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    return a.runId === b.runId ? 0 : a.runId < b.runId ? -1 : 1;
  });
}

/**
 * What happened to one work item, ACROSS RUNS.
 *
 * The question `org-event.ts` was built to answer, now answerable over more than one process
 * lifetime — which is the whole point of the history being durable.
 */
export function eventsFor(root: string, subjectId: string): readonly OrgEvent[] {
  return readEvents(root).filter((e) => e.subjectId === subjectId);
}

/** Everything a line of authority decided, across runs. */
export function decidedUnder(root: string, hatId: string): readonly OrgEvent[] {
  return readEvents(root).filter((e) => e.supervisorChain.includes(hatId));
}

/** How many runs delivered, and how many did not — the simplest thing a history is for. */
export function deliveryRate(root: string): { readonly runs: number; readonly delivered: number } {
  const runs = readRuns(root);
  return { runs: runs.length, delivered: runs.filter((r) => r.delivered).length };
}
