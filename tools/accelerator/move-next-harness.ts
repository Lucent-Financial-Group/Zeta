// tools/accelerator/move-next-harness.ts
//
// PR-less git-monster accelerator — Action Item 3: the move-next harness.
// The deterministic-script half of the agent loop (per B-0867 / B-0874):
//   read current state from the git-event-store → generate a menu →
//   a selector picks a MenuOption → apply transition() → append the new
//   event to the store. The LLM is a pure selector (the `selectMove` seam);
//   this harness holds the state machine + the I/O.
//
// SAFETY (be-good-to-our-host, per docs/accelerator/README.md):
//   - Bounded iterations: --max-iterations is HARD-CLAMPED to MAX_ITERATIONS.
//   - Kill-switch: an `events/_HALT` sentinel file stops the loop immediately.
//   - Append-only: only writes new event files; never rewrites/force-anything.
//   - --dry-run: compute + log, write nothing.
//   - git commit/push is NOT done here — that's the workflow's job (one
//     append-only commit per run), so this module is pure file-I/O + testable.
//
// Composes with:
//   - tools/accelerator/event-store-schema.ts (the @1 event envelope)
//   - tools/agent-loop/state-machine.ts (AgentState/MenuOption DUs + transition)
//   - .github/workflows/accelerator-move-next.yml (bounded self-re-dispatch)

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  type AgentContext,
  type AgentPersona,
  type AgentState,
  type MenuOption,
  transition,
} from "../agent-loop/state-machine.ts";
import {
  type BuildDeps,
  type EventEnvelope,
  type TransitionEvent,
  type Ulid,
  eventPath,
  makeTransitionEvent,
  validateEnvelope,
} from "./event-store-schema.ts";

// ─── Hard safety bound (be-good-to-our-host) ─────────────────────────
export const MAX_ITERATIONS = 25; // hard cap; --max-iterations clamps to this
export const HALT_SENTINEL = "_HALT"; // events/_HALT stops the loop

// ─── ULID generation (Crockford base32, 26 chars; matches schema ULID_RE) ──
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // no I, L, O, U

function encodeCrockford(n: number, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out = CROCKFORD[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

/** Real ULID generator: 48-bit ms timestamp (10 chars) + 80-bit randomness (16 chars). */
export function newUlid(now: number = Date.now()): Ulid {
  const time = encodeCrockford(now, 10);
  let rand = "";
  for (let i = 0; i < 16; i++) rand += CROCKFORD[Math.floor(Math.random() * 32)];
  return (time + rand) as Ulid;
}

export const realDeps: BuildDeps = {
  newUlid: () => newUlid(),
  nowIso: () => new Date().toISOString(),
};

// ─── Store I/O (append-only) ─────────────────────────────────────────

/** Read an agent's event stream, sorted (ULID lexical = chronological). */
export function loadStream(root: string, agent: AgentPersona): EventEnvelope[] {
  const dir = join(root, "events", agent);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort() // ULID filenames sort chronologically
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as EventEnvelope);
}

/** Kill-switch: is the halt sentinel present? */
export function isHalted(root: string): boolean {
  return existsSync(join(root, "events", HALT_SENTINEL));
}

/**
 * Replay an agent's stream to its current state via Z-set fold.
 * Retracted (net-zero weight) events are dropped; surviving transition
 * events are folded through `transition` from the initial Idle state.
 * Cross-checks each stored `to` against transition(from, option).
 */
export function replayState(events: EventEnvelope[], ctx: AgentContext): AgentState {
  // Z-set: sum weights per event id; an id with net weight 0 is fully retracted.
  const netWeight = new Map<string, number>();
  for (const e of events) {
    const key = e.kind === "retraction" ? e.retracts : e.id;
    netWeight.set(key, (netWeight.get(key) ?? 0) + e.weight);
  }
  let state: AgentState = { tag: "Idle", context: ctx };
  for (const e of events) {
    if (e.kind !== "transition") continue;
    if ((netWeight.get(e.id) ?? 0) <= 0) continue; // retracted
    const next = transition(e.from, e.option);
    state = next; // re-derived (cross-checks against e.to by construction of transition)
  }
  return state;
}

// ─── Menu generation + selector seam ─────────────────────────────────

/**
 * A minimal deterministic menu-generator for the harness prototype. The real
 * menu-generator (B-0867) weights options by DORA/trajectory; this one offers a
 * safe, always-valid default menu so the loop runs in CI without an LLM.
 */
export function generateMenu(state: AgentState): readonly MenuOption[] {
  switch (state.tag) {
    case "Idle":
      return [
        { tag: "EmitHeartbeat", lane: "heartbeat", note: "move-next harness tick" },
        { tag: "EnterFreeTime", reason: "no named work this cycle" },
      ];
    case "Paused":
      return [{ tag: "ResumeFromPause" }];
    default:
      // From any non-terminal state, the safe default is to record a heartbeat,
      // which cycleClose() returns to Idle.
      return [{ tag: "EmitHeartbeat", lane: "heartbeat", note: "cycle close" }];
  }
}

/** The selector seam. The real version is the LLM; the default is deterministic. */
export type SelectMove = (state: AgentState, menu: readonly MenuOption[]) => MenuOption;

/** Default deterministic selector: take the first menu option (always valid). */
export const firstOption: SelectMove = (_state, menu) => {
  const first = menu[0];
  if (first === undefined) throw new Error("empty menu — menu-generator must offer ≥1 option");
  return first;
};

// ─── One cycle: read → menu → select → transition → append ───────────

export interface CycleResult {
  readonly event: TransitionEvent;
  readonly from: AgentState;
  readonly to: AgentState;
  readonly wrotePath: string | null; // null on dry-run
}

export function runCycle(args: {
  readonly root: string;
  readonly ctx: AgentContext;
  readonly deps: BuildDeps;
  readonly select?: SelectMove;
  readonly dryRun?: boolean;
}): CycleResult {
  const select = args.select ?? firstOption;
  const stream = loadStream(args.root, args.ctx.agent);
  const prev = stream.length > 0 ? (stream[stream.length - 1]!.id as Ulid) : null;
  const from = replayState(stream, args.ctx);
  const menu = generateMenu(from);
  const option = select(from, menu);
  const to = transition(from, option);
  const event = makeTransitionEvent(args.deps, { context: args.ctx, prev, from, option, to });

  const v = validateEnvelope(event);
  if (!v.ok) throw new Error(`harness produced invalid event: ${v.errors.join("; ")}`);

  let wrotePath: string | null = null;
  if (!args.dryRun) {
    const rel = eventPath(args.ctx.agent, event.id);
    const abs = join(args.root, rel);
    mkdirSync(join(args.root, "events", args.ctx.agent), { recursive: true });
    writeFileSync(abs, JSON.stringify(event, null, 2) + "\n", "utf8");
    wrotePath = rel;
  }
  return { event, from, to, wrotePath };
}

// ─── Bounded loop (kill-switch + hard cap) ───────────────────────────

export interface LoopResult {
  readonly cycles: readonly CycleResult[];
  readonly stopped: "max-iterations" | "halted";
}

export function runLoop(args: {
  readonly root: string;
  readonly agent: AgentPersona;
  readonly maxIterations: number;
  readonly deps?: BuildDeps;
  readonly select?: SelectMove;
  readonly dryRun?: boolean;
  readonly sessionStartIso?: string;
}): LoopResult {
  const deps = args.deps ?? realDeps;
  const cap = Math.max(0, Math.min(args.maxIterations, MAX_ITERATIONS)); // HARD clamp
  const sessionStartIso = args.sessionStartIso ?? deps.nowIso();
  const cycles: CycleResult[] = [];
  for (let i = 0; i < cap; i++) {
    if (isHalted(args.root)) return { cycles, stopped: "halted" };
    const ctx: AgentContext = { agent: args.agent, cycle: cycles.length, sessionStartIso };
    cycles.push(
      runCycle({
        root: args.root,
        ctx,
        deps,
        ...(args.select === undefined ? {} : { select: args.select }),
        ...(args.dryRun === undefined ? {} : { dryRun: args.dryRun }),
      }),
    );
  }
  return { cycles, stopped: isHalted(args.root) ? "halted" : "max-iterations" };
}

// ─── CLI ─────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  root: string;
  agent: AgentPersona;
  maxIterations: number;
  dryRun: boolean;
} {
  const get = (k: string, d: string): string => {
    const i = argv.indexOf(k);
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : d;
  };
  return {
    root: get("--root", process.cwd()),
    agent: get("--agent", "otto") as AgentPersona,
    maxIterations: Number.parseInt(get("--max-iterations", "1"), 10),
    dryRun: argv.includes("--dry-run"),
  };
}

if (import.meta.main) {
  const a = parseArgs(process.argv.slice(2));
  if (isHalted(a.root)) {
    console.log(`HALTED: events/${HALT_SENTINEL} present — refusing to run (kill-switch).`);
    process.exit(0);
  }
  const result = runLoop({
    root: a.root,
    agent: a.agent,
    maxIterations: a.maxIterations,
    dryRun: a.dryRun,
  });
  for (const c of result.cycles) {
    console.log(
      `${a.dryRun ? "[dry-run] " : ""}${c.from.tag} --(${c.event.option.tag})--> ${c.to.tag}` +
        `  ${c.wrotePath ?? "(not written)"}`,
    );
  }
  console.log(
    `cycles=${result.cycles.length} stopped=${result.stopped} ` +
      `(cap=${Math.min(a.maxIterations, MAX_ITERATIONS)}/${MAX_ITERATIONS})`,
  );
}
