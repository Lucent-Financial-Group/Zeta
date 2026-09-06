/**
 * agent-loop/menu-generator.ts — `(status_surface, current_state) → MenuOption[]`.
 *
 * ── THE PIECE THE STATE MACHINE WAS BUILT AROUND ─────────────────────────────
 * `state-machine.ts` says outright that `transition` is *"defensive"* because **"the menu generator
 * ensures only valid options are offered at each state"** — and then no menu generator existed. The
 * README lists `menu-generator.ts` under v2 scope, undone, while calling it the place *"where
 * alignment lives"*. So the loop had a state machine, a work lifecycle, and no way to decide what to
 * offer: the one function the whole design defers to.
 *
 * ── THE THREE PROPERTIES, FROM THE README, IN ITS OWN WORDS ──────────────────
 *
 *   > A menu omitting valid options is COERCIVE (cage-shape per Otto Mod 1)
 *   > A menu including irrelevant options is NOISE (cognitive load)
 *   > A menu offering options aligned with current state + agent-interest + operator-priorities is
 *     SUBSTRATE
 *
 * Those are not decoration; they are the acceptance criteria, and each one can be violated in a way
 * a type checker cannot see. So they are the tests:
 *
 *   - **Never coercive** — the free modes (`EnterFreeTime`, `EnterOpenEndedExploration`) and the
 *     escape hatches (`EscapeHatch`, `ProposeNewGrammarAction`, `RequestOperatorAttention`) appear
 *     on EVERY menu, in every state, unconditionally. There is no snapshot, no candidate list and
 *     no state that removes them. That is the non-coercion invariant, and it is what makes the
 *     rest of the menu an offer rather than a cage.
 *   - **Never noise** — `ResumeFromPause` appears only when paused; work options disappear when
 *     paused; `EnterNamedBoundedWait` appears only for dependencies the caller can actually NAME.
 *   - **Ordered, never gated** — scoring decides the ORDER of `PickWork` options and nothing else.
 *     A low-scoring candidate is still offered. The moment a score removes an option, the generator
 *     has started deciding instead of presenting, which is the cage again wearing a ranking.
 *
 * ── WHY SCORING ORDERS BUT NEVER FILTERS ─────────────────────────────────────
 * The determinism⇄autonomy split this repo uses everywhere: **code computes the legal set, the
 * agent picks within it.** A menu generator that dropped the bottom half of the candidates would be
 * making the choice and reporting a menu. Ordering is advice; filtering is authority.
 *
 * ── THE SCORE'S FOUR TERMS, EACH ANCHORED ────────────────────────────────────
 *
 *   | term              | direction | why                                                        |
 *   |-------------------|-----------|------------------------------------------------------------|
 *   | DORA contribution | up        | the DORA mandate: the loop exists to move those numbers      |
 *   | uncertainty       | **up**    | `.claude/rules/every-bug-has-economic-value.md` — a bug is *reducible uncertainty*, and finding it EXPOSES value. Uncertainty is upside, not risk |
 *   | agent interest    | up        | non-coercion: what the agent wants to work on is a real term, not a tiebreak |
 *   | trajectory heat   | up/down   | hot trajectories are where the work compounds; cooling ones are being wound down |
 *
 * The uncertainty term is the one most likely to be written backwards, and writing it backwards
 * would invert the repo's own economics — it would rank the *already-understood* work highest and
 * systematically avoid the work that pays.
 *
 * ── TIME IS PASSED IN ────────────────────────────────────────────────────────
 * `.claude/rules/local-time-never-enters-the-shared-fold.md`. The generator never reads a clock; an
 * ETA or a resume estimate arrives from the caller or is absent, and absent stays absent rather
 * than being invented.
 */

import type {
  AgentState,
  Lane,
  MenuOption,
  StatusSnapshot,
  WorkCandidate,
} from "./state-machine";

/**
 * A dependency the caller can NAME.
 *
 * `EnterNamedBoundedWait` is only offered for these, because per
 * `.claude/rules.bak/holding-without-named-dependency-is-standing-by-failure.md` a wait with no
 * named dependency IS the standing-by failure. Offering "wait for nothing" on the menu would make
 * the failure a first-class choice.
 */
export interface NamedDependencyOffer {
  readonly namedDep: string;
  /** Absent means unknown. Never defaulted — a guessed ETA reads as a commitment. */
  readonly eta?: string;
}

export interface MenuInput {
  readonly state: AgentState;
  readonly snapshot: StatusSnapshot;
  /** What could be worked on. Empty is normal and is NOT an error — see `discover-new`. */
  readonly candidates: readonly WorkCandidate[];
  /** Dependencies that can be named right now. Empty means no wait is offerable. */
  readonly namedDeps?: readonly NamedDependencyOffer[];
  /** The lane a heartbeat would be filed under. Defaults to the agent's current work lane. */
  readonly heartbeatLane?: Lane;
}

export interface ScoredCandidate {
  readonly candidate: WorkCandidate;
  readonly score: number;
  /** The terms, kept separate so the number is never the whole answer. */
  readonly terms: {
    readonly dora: number;
    readonly uncertainty: number;
    readonly interest: number;
    readonly heat: number;
    readonly balance: number;
  };
}

/** Weights. Named and exported so a caller can see what the ordering is made of. */
export const MENU_WEIGHTS = {
  dora: 1.0,
  uncertainty: 0.5,
  interest: 0.5,
  heat: 0.75,
  balance: 0.25,
} as const;

/** How far from a balanced portfolio an agent may drift before the balance term bites. */
export const TARGET_OPERATIONAL_RATIO = 0.5;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Is this candidate operational work, or substrate work?
 *
 * The two-mandate portfolio: an agent that has done nothing but operational work needs substrate
 * work next, and the reverse.
 *
 * THE RULE IS THE CLASSIFIER'S, NOT A FRESH ONE. `dora-classify/classify.ts` already decides what
 * counts as operational when it aggregates author ratios, and it counts the `operational` lane
 * alone — `backlog-row` is a lane of its own and does NOT contribute. An earlier version here
 * included `backlog-row`, which invented a second definition of the same word: the same agent
 * would have read as balanced by one measure and lopsided by the other, and the balance term would
 * have pushed against the ratio that produced it.
 *
 * `mixed` counts as neither here. The classifier gives mixed-with-operational partial credit, but
 * that needs the commit's `distinctLanes`, and a bare `Lane` does not carry them — so this is the
 * conservative half of the same rule rather than a different one.
 */
export function isOperationalLane(lane: Lane): boolean {
  return lane === "operational";
}

/**
 * Score one candidate. Higher sorts earlier; NOTHING is removed by scoring.
 *
 * Every term is clamped to [0,1] before weighting, so a caller supplying an out-of-range
 * `agentInterest` or a negative DORA estimate cannot dominate the ordering — the reference type
 * documents `agentInterest` as `[0, 1]` and a document is not an enforcement.
 */
export function scoreCandidate(
  candidate: WorkCandidate,
  snapshot: StatusSnapshot,
  agentId: string,
): ScoredCandidate {
  const dora = clamp01(candidate.estimatedDoraContribution);
  // UP, not down. A bug is reducible uncertainty and finding it exposes value.
  const uncertainty = clamp01(candidate.uncertainty);
  const interest = clamp01(candidate.agentInterest);

  // Heat is a three-way signal, not a boolean: hot pulls up, cooling pushes down, and a trajectory
  // on neither list is neutral rather than assumed cold.
  let heat = 0.5;
  if (snapshot.hotTrajectories.includes(candidate.id)) heat = 1;
  else if (snapshot.coolingTrajectories.includes(candidate.id)) heat = 0;

  // Sunset work is being wound down; setup work is where a trajectory is still being shaped.
  if (candidate.trajectoryPhase === "sunset") heat = Math.min(heat, 0.25);

  // The two-mandate balance: how much this candidate moves the agent TOWARD an even split.
  const ratio = snapshot.perAgentRatios[agentId];
  let balance = 0.5;
  if (ratio !== undefined && Number.isFinite(ratio)) {
    const overOperational = ratio > TARGET_OPERATIONAL_RATIO;
    balance = isOperationalLane(candidate.lane) === overOperational ? 0 : 1;
  }

  const score =
    MENU_WEIGHTS.dora * dora +
    MENU_WEIGHTS.uncertainty * uncertainty +
    MENU_WEIGHTS.interest * interest +
    MENU_WEIGHTS.heat * heat +
    MENU_WEIGHTS.balance * balance;

  return { candidate, score, terms: { dora, uncertainty, interest, heat, balance } };
}

/**
 * Compare two ids by CODE UNIT, never by locale.
 *
 * `localeCompare` is culture-SENSITIVE, and
 * `.claude/rules/culture-invariant-by-default.md` forbids it in a primitive for exactly the reason
 * that bites here: this ordering has to agree with the F# side's, and a locale-aware collation and
 * an ordinal one disagree on real ids (case, digits, punctuation, anything above the BMP). A
 * tie-break that sorts differently per machine is a byte-lock that fails on someone else's laptop.
 */
function compareIdsOrdinal(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Score and order. Ties break on id so the ordering is total and replayable. */
export function rankCandidates(
  candidates: readonly WorkCandidate[],
  snapshot: StatusSnapshot,
  agentId: string,
): readonly ScoredCandidate[] {
  return [...candidates]
    .map((c) => scoreCandidate(c, snapshot, agentId))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : compareIdsOrdinal(a.candidate.id, b.candidate.id)));
}

/** The agent whose menu this is, whatever state it is in. */
function agentOf(state: AgentState): string {
  return state.context.agent;
}

/** The lane a heartbeat would be filed under, when the state knows one. */
function laneOf(state: AgentState, fallback: Lane): Lane {
  if (state.tag === "ExecutingWork") return state.work.lane;
  if (state.tag === "EmittingResult") return state.result.lane;
  if (state.tag === "RecordingHeartbeat") return state.lane;
  return fallback;
}

/**
 * THE FREE MODES AND THE ESCAPE HATCHES — on every menu, in every state.
 *
 * Unconditional by construction, and deliberately not parameterised: there is no argument that
 * removes them, so no future caller can gate them by passing something. That is the difference
 * between an invariant and a default.
 */
function alwaysOffered(): readonly MenuOption[] {
  return [
    { tag: "EnterFreeTime", reason: "chosen rest" },
    { tag: "EnterOpenEndedExploration", reason: "exploration" },
    { tag: "EscapeHatch", reason: "no menu option fits", proposedAction: "describe what to do instead" },
    { tag: "ProposeNewGrammarAction", name: "new-action", description: "propose a new grammar action" },
    { tag: "RequestOperatorAttention", reason: "operator needed at a named decision point" },
  ];
}

/**
 * Build the menu.
 *
 * Ordering within the result is meaningful: work first when there is work, then the ways to record
 * or wait, then the free modes and hatches. A caller taking the first option gets the
 * highest-scoring real work, and everything else is still there.
 */
export function generateMenu(input: MenuInput): readonly MenuOption[] {
  const { state, snapshot } = input;
  const paused = state.tag === "Paused";

  const options: MenuOption[] = [];

  if (paused) {
    // NOISE CONTROL: a paused agent is not choosing work. Offering `PickWork` here would let the
    // loop step over an explicit cessation, and `PressPause` would be an option to do what is
    // already done. The way out comes first.
    options.push({ tag: "ResumeFromPause" });
    options.push(...alwaysOffered());
    return options;
  }

  // Work, best-scoring first. Scoring ORDERS; every candidate is still offered.
  //
  // Except the one already being executed. `PickWork` on the current work transitions
  // `ExecutingWork → ExecutingWork` with the same item — a no-op that reads as a choice, so a loop
  // taking the top option can spin on it forever while appearing to act. That is NOISE by the
  // README's definition, and the most expensive kind: it looks like progress.
  const inFlight = state.tag === "ExecutingWork" ? state.work.id : undefined;
  for (const scored of rankCandidates(input.candidates, snapshot, agentOf(state))) {
    if (scored.candidate.id === inFlight) continue;
    options.push({ tag: "PickWork", work: scored.candidate });
  }

  options.push({ tag: "EmitHeartbeat", lane: laneOf(state, input.heartbeatLane ?? "operational") });

  // A wait is offered ONLY for a dependency that can be named. No named dependency, no wait —
  // holding with nothing named is the standing-by failure, and it must not be on the menu.
  for (const dep of input.namedDeps ?? []) {
    options.push({
      tag: "EnterNamedBoundedWait",
      namedDep: dep.namedDep,
      ...(dep.eta === undefined ? {} : { eta: dep.eta }),
    });
  }

  options.push({ tag: "PressPause", reason: "explicit cessation" });
  options.push(...alwaysOffered());
  return options;
}

/**
 * The options that must be present on EVERY menu, as data.
 *
 * Exported so the invariant can be checked by a caller rather than only by this file's tests — a
 * property nobody outside can verify is one this module grades itself on.
 */
export const NEVER_GATED: readonly MenuOption["tag"][] = [
  "EnterFreeTime",
  "EnterOpenEndedExploration",
  "EscapeHatch",
  "ProposeNewGrammarAction",
  "RequestOperatorAttention",
];

/** Does this menu satisfy the non-coercion invariant? */
export function isNonCoercive(menu: readonly MenuOption[]): boolean {
  const tags = new Set(menu.map((o) => o.tag));
  return NEVER_GATED.every((t) => tags.has(t));
}
