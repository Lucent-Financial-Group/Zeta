/**
 * corporate/hat-guardrails.ts — may this hat do this, at all? Asked before it acts.
 *
 * ── THE HOLE THIS CLOSES ─────────────────────────────────────────────────────
 * `evaluateGate` checks that the evaluator holds the gate's approval scope. It does not ask who DID
 * the work — so a hat holding both the implementer's role and the implementation-review scope
 * reviews its own change and approves it. Probed on a chart with exactly that shape:
 *
 *     the implementer reviewing its OWN implementation: ALLOWED → approved
 *
 * The seeded organization never configures it, which is why it went unnoticed: the defect is in the
 * CHECK, not in the seed, and a check that only holds for one configuration is not a check.
 *
 * ── SEPARATION OF DUTIES ─────────────────────────────────────────────────────
 * The proposer of a change can never approve it. Not "should not" — cannot, structurally, with no
 * model call and no prompt involved. A supervisor reviewing a subordinate's work is still fine and
 * still normal; what is refused is a hat signing off on what it did itself.
 *
 * ── ONE PLACE TO ASK ─────────────────────────────────────────────────────────
 * The authority to do each class of thing already existed, scattered: `legalPriorityClassesFor` for
 * priority, `hasEscalationAuthority` for escalation, `gateOwners` for gates, `mayAdjustSchedule` for
 * schedules, the IC rule inside `assign`. Scattered checks are checks somebody forgets to call —
 * which is exactly how the hole above happened. This is the single preflight, and it delegates to
 * those rather than restating them, so there is still one definition of each.
 */

import { hasEscalationAuthority } from "./escalation";
import { LEVEL_RANK, type OrgChart } from "./org-chart";
import { legalPriorityClassesFor } from "./prioritization";
import { gateOwners, type GateKind } from "./quality-gate";
import { mayAdjustSchedule } from "./work-schedule";

/** The classes of thing a hat can attempt. */
export const ActionClass = {
  /** Execute assigned work. */
  ImplementWork: "implement_work",
  /** Evaluate a quality gate. */
  ApproveGate: "approve_gate",
  /** Set a work item's priority. */
  DecidePriority: "decide_priority",
  /** Decide an escalation. */
  Escalate: "escalate",
  /** Accept a company goal. */
  AcceptGoal: "accept_goal",
  /** Change another hat's schedule. */
  SetSchedule: "set_schedule",
} as const;

export type ActionClass = (typeof ActionClass)[keyof typeof ActionClass];

export type GuardrailResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface PreflightInput {
  readonly hatId: string;
  readonly action: ActionClass;
  /** The gate being evaluated. Required for `approve_gate`. */
  readonly gate?: GateKind;
  /** The hat whose schedule is being changed. Required for `set_schedule`. */
  readonly targetHatId?: string;
}

/**
 * May this hat perform this class of action?
 *
 * Delegates to the existing authority rules rather than restating them — a second definition of
 * "who may escalate" is a second thing to keep in step, and the one that drifts is always the copy.
 */
export function preflightHatAction(chart: OrgChart, input: PreflightInput): GuardrailResult {
  const hat = chart.byId.get(input.hatId);
  if (hat === undefined) return { ok: false, reason: `unknown hat '${input.hatId}'` };

  switch (input.action) {
    case ActionClass.ImplementWork:
      // Work is executed by individual contributors. The cascade enforces this at assignment; the
      // guardrail is what lets a caller ask BEFORE it tries.
      return hat.level === "individual_contributor"
        ? { ok: true }
        : { ok: false, reason: `'${hat.id}' is ${hat.level}; work is executed by an individual contributor` };

    case ActionClass.ApproveGate: {
      if (input.gate === undefined) return { ok: false, reason: "approve_gate needs a gate" };
      return gateOwners(chart, input.gate).some((h) => h.id === hat.id)
        ? { ok: true }
        : { ok: false, reason: `'${hat.id}' does not hold the approval scope for '${input.gate}'` };
    }

    case ActionClass.DecidePriority:
      return legalPriorityClassesFor(hat.level).length > 0
        ? { ok: true }
        : { ok: false, reason: `'${hat.id}' is ${hat.level}; priority is set for it, not by it` };

    case ActionClass.Escalate:
      return hasEscalationAuthority(hat.level)
        ? { ok: true }
        : { ok: false, reason: `'${hat.id}' is ${hat.level}; escalation is decided at manager and above` };

    case ActionClass.AcceptGoal:
      return LEVEL_RANK[hat.level] <= LEVEL_RANK["c_suite"]
        ? { ok: true }
        : { ok: false, reason: `'${hat.id}' is ${hat.level}; a goal is accepted at the top` };

    case ActionClass.SetSchedule: {
      if (input.targetHatId === undefined) return { ok: false, reason: "set_schedule needs a target hat" };
      return mayAdjustSchedule(chart, hat.id, input.targetHatId)
        ? { ok: true }
        : { ok: false, reason: `'${hat.id}' does not supervise '${input.targetHatId}'` };
    }
  }
  return assertNeverAction(input.action);
}

function assertNeverAction(x: never): never {
  throw new Error(`unhandled action class: ${String(x)}`);
}

/**
 * SEPARATION OF DUTIES: the hat that did the work may not sign off on it.
 *
 * Two hats are supplied because they are two roles, and the check is between them — not a property
 * of either alone. A supervisor approving a subordinate's work passes; the subordinate approving its
 * own does not, however senior it is and whatever scopes it holds.
 *
 * `proposerHatId` being absent is NOT a pass. An approval whose subject nobody recorded cannot be
 * checked for self-approval, and treating "unknown" as "fine" is how the guarantee is lost quietly.
 */
export function preflightApproval(input: {
  readonly approverHatId: string;
  readonly proposerHatId?: string;
}): GuardrailResult {
  if (input.proposerHatId === undefined) {
    return {
      ok: false,
      reason: "the work's proposer is unrecorded, so self-approval cannot be ruled out",
    };
  }
  if (input.approverHatId === input.proposerHatId) {
    return {
      ok: false,
      reason: `'${input.approverHatId}' did this work and may not approve it`,
    };
  }
  return { ok: true };
}

/**
 * The full preflight for a gate evaluation: the scope AND separation of duties.
 *
 * Both, in one call, because they fail differently and a caller that remembers one and forgets the
 * other has the hole this module was written for.
 */
export function preflightGateEvaluation(
  chart: OrgChart,
  input: {
    readonly evaluatorHatId: string;
    readonly gate: GateKind;
    readonly proposerHatId?: string;
  },
): GuardrailResult {
  const scope = preflightHatAction(chart, {
    hatId: input.evaluatorHatId,
    action: ActionClass.ApproveGate,
    gate: input.gate,
  });
  if (!scope.ok) return scope;
  // A gate with no recorded proposer is a review of nothing in particular; the separation check
  // only applies where the work has an owner to separate from.
  if (input.proposerHatId === undefined) return { ok: true };
  return preflightApproval({
    approverHatId: input.evaluatorHatId,
    proposerHatId: input.proposerHatId,
  });
}

/** Every action class this hat may currently perform — the brief's authority half. */
export function permittedActions(chart: OrgChart, hatId: string): readonly ActionClass[] {
  return Object.values(ActionClass).filter((action) => {
    if (action === ActionClass.ApproveGate || action === ActionClass.SetSchedule) {
      // Both need a subject, so they are not answerable in the abstract. `approve_gate` is included
      // when the hat owns ANY gate; `set_schedule` when it supervises anyone.
      if (action === ActionClass.ApproveGate) {
        return (chart.byId.get(hatId)?.approvalScopes?.length ?? 0) > 0;
      }
      return chart.hats.some((h) => h.id !== hatId && mayAdjustSchedule(chart, hatId, h.id));
    }
    return preflightHatAction(chart, { hatId, action }).ok;
  });
}
