/**
 * corporate/quality-gate.ts — the seven gates a work item crosses before it is done.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * Before this, `org-cycle.ts` took a task straight from assigned to `done` on the assignee's own
 * say-so. Every other refusal in this register was in place — a goal cannot be closed by closing the
 * goal, an anchor cannot resolve without producing its output, a calendar cannot double-book — and
 * the middle of the pipeline had nothing at all. "Delivered" meant "the dev said so", which is the
 * exact shape the rest of this package exists to remove.
 *
 * The corporate register puts the item through seven gates (`BUSINESS_QUALITY_GATE_SYSTEM.md`),
 * each owned by named hats, each with a legal outcome set and a recovery path when it fails.
 *
 * ── ONE SOURCE OF TRUTH FOR WHO OWNS A GATE ──────────────────────────────────
 * The reference keeps TWO lists and requires both: a `GateOwnerHats` roster, and the evaluating
 * hat's own `approvalScopes`. Two lists that must agree are two lists that can disagree — and the
 * disagreement is silent in the permissive direction the moment a hat is added to one and not the
 * other.
 *
 * Here the roster is DERIVED: a hat owns a gate iff its `approvalScopes` contain it. `gateOwners`
 * computes the list rather than storing it, so there is nothing to drift.
 *
 * ── DETERMINISM SETS THE GATE; THE AGENT SETS THE OUTCOME ────────────────────
 * Which gate is next, and who may evaluate it, are computed (`nextLegalGate`, `gateOwners`). Whether
 * it passes is chosen by an agent through `chooseWithinLegal`, clamped to the legal outcomes. That
 * split is the same one the observe loop makes, and it is what keeps a gate from being either a
 * rubber stamp (code decides) or a suggestion (the agent decides everything).
 */

import { chooseWithinLegal, type OrgChooser } from "./org-decision";
import { preflightGateEvaluation } from "./hat-guardrails";
import type { OrgChart, OrgHat } from "./org-chart";

/** The seven gates. */
export const GateKind = {
  CustomerRfpReview: "customer_rfp_review",
  BrdApproval: "brd_approval",
  ArchitectureApproval: "architecture_approval",
  ImplementationReview: "implementation_review",
  RuntimeValidation: "runtime_validation",
  FinalBusinessValidation: "final_business_validation",
  ReleaseReadiness: "release_readiness",
} as const;

export type GateKind = (typeof GateKind)[keyof typeof GateKind];

/**
 * The chain, in order. This array is the single source of truth for sequencing — `nextLegalGate`
 * derives the prior-gate requirement from position rather than from a hand-maintained dependency
 * table, so the two cannot disagree about what comes before what.
 */
export const ORDERED_GATES: readonly GateKind[] = [
  GateKind.CustomerRfpReview,
  GateKind.BrdApproval,
  GateKind.ArchitectureApproval,
  GateKind.ImplementationReview,
  GateKind.RuntimeValidation,
  GateKind.FinalBusinessValidation,
  GateKind.ReleaseReadiness,
];

export const GateOutcome = {
  Approved: "approved",
  ChangesRequested: "changes_requested",
  Rejected: "rejected",
  Waived: "waived",
} as const;

export type GateOutcome = (typeof GateOutcome)[keyof typeof GateOutcome];

/**
 * The outcomes that let the item move on.
 *
 * `Waived` passes and is NOT the same as `Approved` — a waiver is an authority deciding the gate
 * does not apply here, which is a different fact from the gate having been satisfied, and the
 * distinction has to survive into the record or an audit cannot tell them apart.
 */
const PASSING: ReadonlySet<GateOutcome> = new Set([GateOutcome.Approved, GateOutcome.Waived]);

/**
 * The proposer for work nobody has been assigned.
 *
 * A sentinel rather than `undefined`, so choosing to evaluate a gate with no author is a visible
 * decision at the call site instead of an omitted argument.
 */
export const NO_PROPOSER = "(unassigned)";

export function isPassing(outcome: GateOutcome): boolean {
  return PASSING.has(outcome);
}

/**
 * The outcomes an evaluator may pick.
 *
 * `Waived` is deliberately ABSENT from the ordinary legal set. Waiving is not one of three normal
 * verdicts — it is a decision to skip a control, and offering it beside "approved" in every
 * evaluation makes the cheapest way past a hard gate a single index. It is reachable only through
 * `legalGateOutcomesFor` below, and only for a hat senior enough to carry it.
 */
export function legalGateOutcomes(): readonly GateOutcome[] {
  return [GateOutcome.Approved, GateOutcome.ChangesRequested, GateOutcome.Rejected];
}

/**
 * The legal outcomes for a specific evaluator.
 *
 * A Director or above may additionally waive. Anyone else gets the ordinary three — so skipping a
 * control requires standing, and the standing is checked here rather than trusted to a convention.
 */
export function legalGateOutcomesFor(hat: OrgHat): readonly GateOutcome[] {
  const base = legalGateOutcomes();
  const mayWaive = hat.level === "director" || hat.level === "c_suite" || hat.level === "executive_board";
  return mayWaive ? [...base, GateOutcome.Waived] : base;
}

/** Every hat authorized to evaluate this gate — derived from the hats' own approval scopes. */
export function gateOwners(chart: OrgChart, gate: GateKind): readonly OrgHat[] {
  return chart.hats.filter((h) => h.approvalScopes?.includes(gate) === true);
}

export function mayEvaluate(chart: OrgChart, hatId: string, gate: GateKind): boolean {
  return gateOwners(chart, gate).some((h) => h.id === hatId);
}

/**
 * The next gate this item must cross: the first in the chain not yet passed.
 *
 * Because the chain is ordered and gates are consumed in order, the first unpassed gate is by
 * construction the one whose priors are all satisfied. Returns `undefined` when every gate has
 * passed — the item may merge.
 */
export function nextLegalGate(passed: ReadonlySet<GateKind>): GateKind | undefined {
  return ORDERED_GATES.find((g) => !passed.has(g));
}

/** How far through the chain this item is, as a fraction — for reporting only. */
export function gateProgress(passed: ReadonlySet<GateKind>): number {
  return ORDERED_GATES.filter((g) => passed.has(g)).length / ORDERED_GATES.length;
}

/** Have all seven passed? */
export function allGatesPassed(passed: ReadonlySet<GateKind>): boolean {
  return nextLegalGate(passed) === undefined;
}

/** Where a failed gate sends the work. */
export const RecoveryPath = {
  ReopenDiscoveryOrBrd: "reopen_discovery_or_brd",
  ReopenArchitecture: "reopen_architecture",
  BackToEngineering: "back_to_engineering",
  ValidationProcessImprovement: "validation_process_improvement",
  ChangeRequest: "change_request",
} as const;

export type RecoveryPath = (typeof RecoveryPath)[keyof typeof RecoveryPath];

export function recoveryPathFor(gate: GateKind): RecoveryPath {
  switch (gate) {
    case GateKind.CustomerRfpReview:
    case GateKind.BrdApproval:
      return RecoveryPath.ReopenDiscoveryOrBrd;
    case GateKind.ArchitectureApproval:
      return RecoveryPath.ReopenArchitecture;
    case GateKind.ImplementationReview:
      return RecoveryPath.BackToEngineering;
    case GateKind.RuntimeValidation:
      return RecoveryPath.ValidationProcessImprovement;
    case GateKind.FinalBusinessValidation:
    case GateKind.ReleaseReadiness:
      return RecoveryPath.ChangeRequest;
  }
  return assertNeverGate(gate);
}

/** Exhaustiveness, enforced by the compiler: an eighth gate fails to typecheck here. */
function assertNeverGate(x: never): never {
  throw new Error(`unhandled gate: ${String(x)}`);
}

export interface GateEvaluation {
  readonly workId: string;
  readonly gate: GateKind;
  readonly outcome: GateOutcome;
  readonly byHatId: string;
  readonly reason: string;
  readonly atMs: number;
}

export type GateResult =
  | {
      readonly ok: true;
      readonly evaluation: GateEvaluation;
      readonly passed: ReadonlySet<GateKind>;
      /** Set when the outcome did NOT pass. */
      readonly recovery?: RecoveryPath;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * One hat evaluates one gate.
 *
 * Four refusals, and each is a way a gate becomes decorative:
 *
 *   - **out of order** — evaluating a gate whose priors have not passed lets an item reach release
 *     readiness without an architecture review, by evaluating the gates in a convenient order.
 *   - **not an owner** — a hat without the approval scope is not the authority for this control.
 *   - **already passed** — re-evaluating a passed gate is how a rejection gets overwritten by a
 *     second opinion nobody asked for.
 *   - **no legal outcome** — reported, never defaulted.
 */
export function evaluateGate(
  chart: OrgChart,
  input: {
    readonly workId: string;
    readonly gate: GateKind;
    readonly evaluatorHatId: string;
    readonly passed: ReadonlySet<GateKind>;
    readonly chooser: OrgChooser<GateOutcome>;
    readonly atMs: number;
    /**
     * The hat that DID the work. REQUIRED — the evaluator may not be it.
     *
     * Not optional, deliberately. An approval whose subject nobody recorded cannot be checked for
     * self-approval, and a caller that cannot name the author does not know what it is approving.
     * Making it optional left "unrecorded" reading as "fine", which is the quiet-loss shape this
     * module exists to remove. Pass `NO_PROPOSER` for the rare gate that genuinely evaluates
     * unassigned work, so that choice is visible at the call site.
     */
    readonly proposerHatId: string;
  },
): GateResult {
  const hat = chart.byId.get(input.evaluatorHatId);
  if (hat === undefined) return { ok: false, reason: `unknown hat '${input.evaluatorHatId}'` };

  if (input.passed.has(input.gate)) {
    return { ok: false, reason: `gate '${input.gate}' on '${input.workId}' has already passed` };
  }
  const expected = nextLegalGate(input.passed);
  if (expected !== input.gate) {
    return {
      ok: false,
      reason: `'${input.workId}' is at '${expected ?? "merged"}', not '${input.gate}' — gates are crossed in order`,
    };
  }
  // Scope AND separation of duties, in one preflight. Checking the scope alone let a hat that both
  // implemented and held the review scope approve its own change.
  const allowed = preflightGateEvaluation(chart, {
    evaluatorHatId: input.evaluatorHatId,
    gate: input.gate,
    ...(input.proposerHatId === NO_PROPOSER ? {} : { proposerHatId: input.proposerHatId }),
  });
  if (!allowed.ok) return { ok: false, reason: allowed.reason };

  const choice = chooseWithinLegal(
    legalGateOutcomesFor(hat),
    `gate ${input.gate} for ${input.workId}`,
    input.chooser,
  );
  if (choice.outcome === "no_legal_option") return { ok: false, reason: choice.reason };

  const evaluation: GateEvaluation = {
    workId: input.workId,
    gate: input.gate,
    outcome: choice.option,
    byHatId: hat.id,
    reason: choice.reason,
    atMs: input.atMs,
  };

  if (!isPassing(choice.option)) {
    // The passed set is UNCHANGED on failure. An item that fails a gate has not crossed it, and the
    // recovery path says where it goes instead.
    return { ok: true, evaluation, passed: input.passed, recovery: recoveryPathFor(input.gate) };
  }

  const next = new Set(input.passed);
  next.add(input.gate);
  return { ok: true, evaluation, passed: next };
}

/**
 * Run the whole chain for one work item until it merges, fails, or runs out of owners.
 *
 * Returns every evaluation, so a caller can see WHERE it stopped rather than only that it did.
 */
export interface GateRunResult {
  readonly evaluations: readonly GateEvaluation[];
  readonly passed: ReadonlySet<GateKind>;
  readonly merged: boolean;
  /** The gate that stopped it, if any. */
  readonly blockedAt?: GateKind;
  readonly recovery?: RecoveryPath;
  readonly refusals: readonly string[];
}

export function runGateChain(
  chart: OrgChart,
  input: {
    readonly workId: string;
    readonly chooser: OrgChooser<GateOutcome>;
    /** Picks which owner evaluates a gate. Absent = the first owner in chart order. */
    readonly evaluatorFor?: (gate: GateKind, owners: readonly OrgHat[]) => OrgHat | undefined;
    readonly atMs: number;
    /** The hat that did the work, so no gate is evaluated by its author. `NO_PROPOSER` if none. */
    readonly proposerHatId: string;
  },
): GateRunResult {
  const evaluations: GateEvaluation[] = [];
  const refusals: string[] = [];
  let passed: ReadonlySet<GateKind> = new Set<GateKind>();

  // Bounded by the chain length: every iteration either passes a gate or stops. The bound is a
  // backstop against a future change making the loop non-monotonic, not a suspicion about this one.
  for (let step = 0; step < ORDERED_GATES.length; step += 1) {
    const gate = nextLegalGate(passed);
    if (gate === undefined) break;

    // The proposer is excluded from its own review before an evaluator is even picked, so a chart
    // where the author is the only scope-holder BLOCKS rather than self-approving.
    const owners = gateOwners(chart, gate).filter((h) => h.id !== input.proposerHatId);
    const evaluator = input.evaluatorFor?.(gate, owners) ?? owners[0];
    if (evaluator === undefined) {
      // Nobody in this organization holds the scope. That is a staffing fact, not a pass.
      refusals.push(
        gateOwners(chart, gate).some((h) => h.id === input.proposerHatId)
          ? `the only hat holding '${gate}' is '${input.proposerHatId}', which did the work`
          : `no hat holds the approval scope for '${gate}'`,
      );
      return { evaluations, passed, merged: false, blockedAt: gate, refusals };
    }

    const result = evaluateGate(chart, {
      workId: input.workId,
      gate,
      evaluatorHatId: evaluator.id,
      passed,
      chooser: input.chooser,
      atMs: input.atMs,
      proposerHatId: input.proposerHatId,
    });
    if (!result.ok) {
      refusals.push(result.reason);
      return { evaluations, passed, merged: false, blockedAt: gate, refusals };
    }

    evaluations.push(result.evaluation);
    if (!isPassing(result.evaluation.outcome)) {
      return {
        evaluations,
        passed,
        merged: false,
        blockedAt: gate,
        ...(result.recovery === undefined ? {} : { recovery: result.recovery }),
        refusals,
      };
    }
    passed = result.passed;
  }

  return { evaluations, passed, merged: allGatesPassed(passed), refusals };
}
