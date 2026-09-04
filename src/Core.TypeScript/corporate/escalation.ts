/**
 * corporate/escalation.ts — when work spins, break the loop structurally.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `supervisor-signal.ts` already routes an escalation to the right hat. What it cannot do is decide
 * that one is NEEDED. Nothing counted how often a piece of work had come back, so an item could
 * fail its runtime-validation gate, be reworked, fail again, be reworked again, forever — and every
 * individual step would look like the process working.
 *
 * The reference states the principle exactly (`escalation.ts`, WORK_OS_OVERHAUL §C4):
 *
 *   > The chosen escalation changes the INPUT ... so the item cannot re-enter the same failing loop
 *   > by spinning. Churn is broken structurally, not endured.
 *
 * ── WHAT MAKES AN ESCALATION REAL ────────────────────────────────────────────
 * An escalation that leaves everything the same is a status update. So every action here must do
 * one of exactly two things, and `escalationEffect` is total over the action set — a ninth action
 * is a compile error until someone says which it is:
 *
 *   - **change the input** to the failing loop (more agents, a new approach, a smaller scope,
 *     a different reviewer, an owner where there was none), or
 *   - **stop the loop** (pause it, or accept the risk and move on).
 *
 * "Endure it" is deliberately not an option. An escalation whose outcome is to try the same thing
 * again is how a bounded retry becomes an unbounded one.
 *
 * ── THE ARCHITECT IS RESOLVED, NOT NAMED ─────────────────────────────────────
 * The reference hardcodes `architectHatId: "architect"`. That id does exist in its own 117-hat
 * catalog, so it is not a bug there — but it couples the escalation logic to one seed, and it is
 * absent from this one. Here the architect is resolved from the chart by who holds the
 * architecture-approval scope, and an organization with nobody to bring in is told so rather than
 * handed a hat id that resolves to nothing.
 */

import { chooseWithinLegal, type OrgChooser } from "./org-decision";
import { LEVEL_RANK, nearestSupervisorAtOrAbove, type HatLevel, type OrgChart, type OrgHat } from "./org-chart";
import { GateKind, gateOwners, isPassing, type GateEvaluation } from "./quality-gate";

export const EscalationTrigger = {
  /** The same work keeps failing a gate and coming back. */
  RepeatedGateRejection: "repeated_gate_rejection",
  SlaBreach: "sla_breach",
  StaleBlocker: "stale_blocker",
  ReviewQueueSaturated: "review_queue_saturated",
} as const;

export type EscalationTrigger = (typeof EscalationTrigger)[keyof typeof EscalationTrigger];

export const EscalationAction = {
  AddAgents: "add_agents",
  BringInArchitect: "bring_in_architect",
  ReScope: "re_scope",
  Pause: "pause",
  AcceptRisk: "accept_risk",
  ReassignReviewer: "reassign_reviewer",
  AssignOwner: "assign_owner",
  AlternateWork: "alternate_work",
} as const;

export type EscalationAction = (typeof EscalationAction)[keyof typeof EscalationAction];

/**
 * Which actions are legal for which trigger.
 *
 * Not every action fits every cause, and that is the point of the table: a saturated review queue is
 * not fixed by re-scoping the work, and a stale blocker is not fixed by adding agents to a thing
 * nobody owns. Offering every action for every trigger would make the legal set decorative.
 */
const LEGAL_BY_TRIGGER: Readonly<Record<EscalationTrigger, readonly EscalationAction[]>> = {
  [EscalationTrigger.RepeatedGateRejection]: [
    EscalationAction.AddAgents,
    EscalationAction.BringInArchitect,
    EscalationAction.ReScope,
    EscalationAction.Pause,
    EscalationAction.AcceptRisk,
  ],
  [EscalationTrigger.SlaBreach]: [EscalationAction.AddAgents, EscalationAction.ReScope, EscalationAction.Pause],
  [EscalationTrigger.StaleBlocker]: [
    EscalationAction.AssignOwner,
    EscalationAction.AlternateWork,
    EscalationAction.ReScope,
  ],
  [EscalationTrigger.ReviewQueueSaturated]: [EscalationAction.ReassignReviewer, EscalationAction.AddAgents],
};

/** Escalation is a MANAGEMENT act. A lead or an IC may raise one; only a manager and above decides. */
export function hasEscalationAuthority(level: HatLevel): boolean {
  return LEVEL_RANK[level] <= LEVEL_RANK["manager"];
}

/** The bounded legal set for a trigger, empty when the decider lacks the authority. */
export function legalEscalationActions(
  trigger: EscalationTrigger,
  deciderLevel: HatLevel,
): readonly EscalationAction[] {
  if (!hasEscalationAuthority(deciderLevel)) return [];
  return LEGAL_BY_TRIGGER[trigger];
}

/**
 * What an escalation does to the failing loop.
 *
 * Total over the action set on purpose — the compiler refuses a ninth action until someone declares
 * whether it changes the input or halts. That is the check behind the whole module: an action that
 * did neither would let the item re-enter the same loop while the record says it was escalated.
 */
export type EscalationEffect = "changes_the_input" | "halts_the_loop";

export function escalationEffect(action: EscalationAction): EscalationEffect {
  switch (action) {
    case EscalationAction.AddAgents:
    case EscalationAction.BringInArchitect:
    case EscalationAction.ReScope:
    case EscalationAction.ReassignReviewer:
    case EscalationAction.AssignOwner:
    case EscalationAction.AlternateWork:
      return "changes_the_input";
    case EscalationAction.Pause:
    case EscalationAction.AcceptRisk:
      return "halts_the_loop";
  }
  return assertNeverAction(action);
}

function assertNeverAction(x: never): never {
  throw new Error(`unhandled escalation action: ${String(x)}`);
}

/** The concrete change an escalation makes. */
export type EscalationChange =
  | { readonly kind: "expand_supply"; readonly ownerHatIds: readonly string[]; readonly addCount: number }
  | { readonly kind: "new_approach"; readonly architectHatId: string; readonly reopenGate: GateKind }
  | { readonly kind: "rescope" }
  | { readonly kind: "pause" }
  | { readonly kind: "accept_risk" }
  | { readonly kind: "reassign_reviewer"; readonly awayFromHatId: string }
  | { readonly kind: "assign_owner" }
  | { readonly kind: "alternate_work" };

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * How many times this work item has come back from a gate.
 *
 * Counted from the gate evaluations themselves rather than from a counter someone increments. A
 * counter can be reset, forgotten, or incremented twice; the evaluations are the record of what
 * actually happened, and re-deriving from them means the count cannot drift from the history.
 */
export function bounceBackCount(workId: string, evaluations: readonly GateEvaluation[]): number {
  return evaluations.filter((e) => e.workId === workId && !isPassing(e.outcome)).length;
}

export const DEFAULT_CHURN_THRESHOLD = 3;

/** Has this item bounced back enough times to need breaking out of the loop? */
export function detectChurn(
  workId: string,
  evaluations: readonly GateEvaluation[],
  threshold: number = DEFAULT_CHURN_THRESHOLD,
): boolean {
  // A threshold of zero or less would fire on work that has never failed, so churn would be
  // permanent from the first tick and the escalation would carry no information.
  if (threshold < 1) return false;
  return bounceBackCount(workId, evaluations) >= threshold;
}

/** The gate this item keeps failing, if it keeps failing one in particular. */
export function churnGate(workId: string, evaluations: readonly GateEvaluation[]): GateKind | undefined {
  const failures = evaluations.filter((e) => e.workId === workId && !isPassing(e.outcome));
  const counts = new Map<GateKind, number>();
  for (const f of failures) counts.set(f.gate, (counts.get(f.gate) ?? 0) + 1);
  let best: GateKind | undefined;
  let bestCount = 0;
  for (const [gate, n] of counts) {
    if (n > bestCount) {
      best = gate;
      bestCount = n;
    }
  }
  return best;
}

// ─── Deciding ───────────────────────────────────────────────────────────────

/**
 * Who decides an escalation for work owned by `ownerHatId`: the nearest manager-or-above ABOVE it.
 *
 * Resolved from the chart rather than named. The reference's own work-OS cycle hardcodes a single
 * engineering-manager id even though its authority check permits Director and above, which means an
 * escalation from anywhere else in that organization is decided by a hat with no relationship to the
 * work. Deriving it keeps the decider inside the reporting line that owns the item.
 *
 * Note the owner itself may qualify when it is already a manager or above — a manager escalating
 * work it owns decides its own escalation, which is correct: escalation is about breaking the loop,
 * not about finding someone senior to bless it.
 */
export function escalationDeciderFor(chart: OrgChart, ownerHatId: string): OrgHat | undefined {
  const owner = chart.byId.get(ownerHatId);
  if (owner === undefined) return undefined;
  if (hasEscalationAuthority(owner.level)) return owner;
  return nearestSupervisorAtOrAbove(chart, ownerHatId, "manager");
}

export interface EscalationInput {
  readonly trigger: EscalationTrigger;
  readonly workId: string;
  /** The hats whose supply `AddAgents` would expand. */
  readonly ownerHatIds: readonly string[];
  readonly deciderHatId: string;
  readonly chooser: OrgChooser<EscalationAction>;
  /** The gate being reopened by `BringInArchitect`. Defaults to architecture approval. */
  readonly reopenGate?: GateKind;
  /** The reviewer `ReassignReviewer` moves the work away from. */
  readonly currentReviewerHatId?: string;
}

export type EscalationResult =
  | {
      readonly ok: true;
      readonly action: EscalationAction;
      readonly change: EscalationChange;
      readonly effect: EscalationEffect;
      readonly byHatId: string;
      readonly reason: string;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * A management hat decides an escalation within the legal set.
 *
 * Refuses rather than degrading when the chosen action cannot actually be carried out — most
 * importantly `BringInArchitect` in an organization with no architect. Returning a change naming a
 * hat that does not exist would record a structural fix that nobody can perform, which is worse than
 * the churn it claims to have broken.
 */
export function decideEscalation(chart: OrgChart, input: EscalationInput): EscalationResult {
  const decider = chart.byId.get(input.deciderHatId);
  if (decider === undefined) return { ok: false, reason: `unknown hat '${input.deciderHatId}'` };
  if (!hasEscalationAuthority(decider.level)) {
    return { ok: false, reason: `'${decider.id}' is ${decider.level}; escalation is decided at manager and above` };
  }

  const legal = legalEscalationActions(input.trigger, decider.level);
  const choice = chooseWithinLegal(legal, `escalate ${input.workId} on ${input.trigger}`, input.chooser);
  if (choice.outcome === "no_legal_option") return { ok: false, reason: choice.reason };

  const action = choice.option;
  const change = changeFor(chart, action, input);
  if (change === undefined) {
    return {
      ok: false,
      reason: `'${action}' cannot be carried out in this organization — no hat holds the architecture-approval scope`,
    };
  }

  return {
    ok: true,
    action,
    change,
    effect: escalationEffect(action),
    byHatId: decider.id,
    reason: choice.reason,
  };
}

function changeFor(
  chart: OrgChart,
  action: EscalationAction,
  input: EscalationInput,
): EscalationChange | undefined {
  switch (action) {
    case EscalationAction.AddAgents:
      return { kind: "expand_supply", ownerHatIds: input.ownerHatIds, addCount: 1 };
    case EscalationAction.BringInArchitect: {
      // Resolved from the chart, never named. An organization with nobody to bring in gets a
      // refusal rather than a change naming a hat that does not exist.
      const architect = gateOwners(chart, GateKind.ArchitectureApproval)[0];
      if (architect === undefined) return undefined;
      return {
        kind: "new_approach",
        architectHatId: architect.id,
        reopenGate: input.reopenGate ?? GateKind.ArchitectureApproval,
      };
    }
    case EscalationAction.ReScope:
      return { kind: "rescope" };
    case EscalationAction.Pause:
      return { kind: "pause" };
    case EscalationAction.AcceptRisk:
      return { kind: "accept_risk" };
    case EscalationAction.ReassignReviewer:
      return { kind: "reassign_reviewer", awayFromHatId: input.currentReviewerHatId ?? "" };
    case EscalationAction.AssignOwner:
      return { kind: "assign_owner" };
    case EscalationAction.AlternateWork:
      return { kind: "alternate_work" };
  }
  return assertNeverAction(action);
}
