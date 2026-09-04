/**
 * agent-loop/state-store.ts — the loop's state, append-only, on disk.
 *
 * ── THE CLAIM THIS MAKES TRUE ────────────────────────────────────────────────
 * The README says the substrate is *"workflows ARE code (in Git); state IS data (in Git
 * append-only)"* and that *"The agent (LLM) never holds state internally. Every invocation reads
 * current state from Git, gets a menu, returns a choice. Script executes choice + appends new
 * state."*
 *
 * None of that was true. `AgentState` was a value that lived for the lifetime of a process and
 * vanished with it, so the loop could be unit-tested and could not be RESUMED. A claim in a README
 * that no code implements is the documentation form of the vacuity class.
 *
 * ── THE SHAPE IS THE ONE THE REPO ALREADY PROVED ─────────────────────────────
 * One file per write, under a date shard, named by a ZetaId — the convention behind
 * `workitems/events/YYYY/MM/DD/<zetaid>.json` and `observe/tick-shards.ts`, and adopted here for
 * the reason that file states plainly: **two writers touching one path is a merge conflict by
 * construction.** With one file per write the merge is SET UNION — commutative and idempotent
 * (disciplines #2 lock-free and #6 idempotency) — and conflicts stop being unlikely and start being
 * structurally impossible. A single `state.json` that every cycle rewrote would have reintroduced
 * exactly the coordination problem the shard shape exists to retire.
 *
 * ── ZERO AMBIENT ENTROPY ─────────────────────────────────────────────────────
 * The id is a pure function of the record: its `at` supplies the ZetaId timestamp and the sha256 of
 * its canonical JSON supplies the randomness field. So this mint reads no clock and draws no
 * randomness (§13 noninterference), the same record always lands at the same path (re-appending a
 * cycle is an upsert, not a duplicate), and the whole store replays byte-identically under DST.
 *
 * Time and identity enter through the CALLER, which is the only place they may: `appendCycle` is
 * handed an `at`, never a `Date.now()`.
 *
 * ── KEYS SORT ORDINALLY ──────────────────────────────────────────────────────
 * `canonicalJson` sorts by code unit, not by locale. The digest decides the filename, so a
 * locale-aware sort would make the same record land at different paths on different machines — a
 * content address that is not a function of the content. (`observe/tick-shards.ts` sorts with
 * `localeCompare(a, b, "en")`; changing it there would re-key shards already written, so it is
 * flagged rather than migrated. This store is new and has no such history.)
 */

import { join } from "node:path";

import { toHex } from "../../zeta-id/encoding";
import { Category, type ZetaId } from "../../zeta-id/types";
import {
  canonicalJson as shardCanonicalJson,
  readShards,
  shardZetaId,
  writeShard,
} from "../../shard-store/shard-store";
import type { AgentPersona, AgentState, MenuOption } from "./state-machine";
/**
 * One cycle, as it happened.
 *
 * `state` is the state the agent was left in AFTER the choice was executed, because that is what a
 * resume needs. Recording the state before the choice would make the newest record describe a
 * moment the agent has already left.
 */
export interface CycleRecord {
  /** ISO-8601, supplied by the caller. Never read from a clock here. */
  readonly at: string;
  readonly agent: AgentPersona;
  readonly cycle: number;
  /** What was offered. Kept as a count so the record stays small; the menu is reproducible. */
  readonly menuSize: number;
  /** Whether the menu left a way out. Recorded, so a coercive cycle is visible in the history. */
  readonly nonCoercive: boolean;
  /** Absent when the cycle ended without a choice. */
  readonly chosen?: MenuOption;
  /**
   * Work that was in flight and got switched away from with nothing recorded about it.
   *
   * Kept in the RECORD, not just printed, because the churn is only visible across cycles: one
   * abandonment is a change of mind, and the same two items traded back and forth for twenty cycles
   * is an agent that finished nothing while every cycle looked productive.
   */
  readonly abandonedWorkId?: string;
  readonly state: AgentState;
}

/** Key-sorted JSON, ordinally and recursively. The shard store owns the definition. */
export const canonicalJson = shardCanonicalJson;

/**
 * Mint the record's ZetaId. PURE — a total function of the record, taking no clock and no
 * randomness, so there is no non-determinism to inject and no DST boundary to cross.
 *
 * `Category.Workflow` is exactly what a cycle of the workflow engine is.
 */
export function cycleZetaId(record: CycleRecord): ZetaId {
  const atMs = Date.parse(record.at);
  if (Number.isNaN(atMs)) throw new Error(`cycle record has unparseable timestamp: ${record.at}`);
  return shardZetaId(record, atMs, Category.Workflow);
}

/**
 * The shard spec for a cycle: agent above the date, `Category.Workflow`, the record's own instant.
 *
 * ONE place builds it. An earlier cut also exported a `cyclePathFor` that recomputed the same
 * address independently — a second implementation of where a record lives, which can disagree with
 * the one that actually writes it. `appendCycle` returns the path it used; nothing in production
 * needed to know the address without writing.
 */
function specFor(record: CycleRecord) {
  const atMs = Date.parse(record.at);
  if (Number.isNaN(atMs)) throw new Error(`cycle record has unparseable timestamp: ${record.at}`);
  return { value: record, atMs, category: Category.Workflow, prefix: [record.agent] } as const;
}

/** Append one cycle. Idempotent: the same record lands at the same path with the same bytes. */
export function appendCycle(record: CycleRecord, root: string): string {
  return writeShard(specFor(record), root);
}

/**
 * Every recorded cycle, ordered.
 *
 * Ordering is by the record's OWN `at`, with the minted id as the tie-break — never by filename or
 * directory order, which are artefacts of the filesystem rather than of what happened. Two cycles
 * written in the same millisecond still get a total order, and it is the same order on every
 * machine.
 *
 * De-duplication is by re-minted identity, so the same cycle present at two paths counts once —
 * the set-union merge the shard shape exists to make possible.
 */
export function readHistory(root: string, agent?: AgentPersona): readonly CycleRecord[] {
  const dir = agent === undefined ? root : join(root, agent);
  const records = readShards<CycleRecord>(dir, (r) => toHex(cycleZetaId(r)));
  return [...records].sort((a, b) => {
    const at = Date.parse(a.at) - Date.parse(b.at);
    if (at !== 0) return at;
    if (a.cycle !== b.cycle) return a.cycle - b.cycle;
    const ia = toHex(cycleZetaId(a));
    const ib = toHex(cycleZetaId(b));
    return ia === ib ? 0 : ia < ib ? -1 : 1;
  });
}

/**
 * Where an agent is now: the state its last recorded cycle left it in.
 *
 * `undefined` for an agent with no history — deliberately NOT a fabricated `Idle`. A caller that
 * wants to start fresh says so; one that expected to resume finds out that it cannot, rather than
 * silently continuing from a state nobody recorded.
 */
export function currentState(root: string, agent: AgentPersona): AgentState | undefined {
  const history = readHistory(root, agent);
  return history.length === 0 ? undefined : history[history.length - 1]?.state;
}

/** The next cycle number for an agent: one past the highest recorded, or 1 for a fresh agent. */
export function nextCycleNumber(root: string, agent: AgentPersona): number {
  const history = readHistory(root, agent);
  let highest = 0;
  for (const record of history) if (record.cycle > highest) highest = record.cycle;
  return highest + 1;
}

/**
 * Cycles in which the agent was offered a menu with no way out.
 *
 * The non-coercion invariant is checked per cycle and RECORDED, so this is answerable over a whole
 * history rather than only at the moment it happened. An invariant nobody can audit after the fact
 * is one that held only where somebody was watching.
 */
export function coerciveCycles(history: readonly CycleRecord[]): readonly CycleRecord[] {
  return history.filter((r) => !r.nonCoercive);
}
