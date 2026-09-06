/**
 * corporate/org-admin.ts — the operator surface. What a person (or a supervising hat) DOES to a
 * running organization.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * `org-runtime.ts` runs a cycle and `org-status.ts` reads one. Neither ever revokes a binding,
 * cancels a block, hands a stuck shard back, waives a gate, or briefs a hat — so the single-step
 * operations those need were tested and called by nobody.
 *
 * Every function here is one an operator genuinely performs mid-flight, and each one CHECKS
 * AUTHORITY before acting. That is the difference between an admin surface and a set of setters:
 * the reference's own escalation path hardcodes its decider, and an admin API that skipped the check
 * would be a more convenient way to do the same thing wrong.
 *
 * Nothing here reads a clock. `nowMs` is an argument, so an operator action is as replayable as the
 * cycle it acts on.
 */

import { abandonAnchor, type AnchorBoard, type BoardResult } from "./discussion-anchor";
import {
  hasEscalationAuthority,
  legalEscalationActions,
  type EscalationAction,
  type EscalationTrigger,
} from "./escalation";
import { ownerForRung } from "./goal-cascade";
import {
  advanceBinding,
  approveBinding,
  revokeBinding,
  type BindingResult,
  type HatBinding,
} from "./hat-binding";
import { ingest, triage, type IntakeItem, type IntakeResult, type NormalizedIntake } from "./intake";
import { createScheduleMenuPolicy, workIsInScopeDuring } from "./loop-policy";
import { buildOrgChart, type HatLevel, type OrgChart, type OrgChartResult, type OrgHat } from "./org-chart";
import { preferWhere, type OrgChooser } from "./org-decision";
import { legalPriorityClassesFor, normalizeInput, type PriorityClass } from "./prioritization";
import {
  evaluateGate,
  legalGateOutcomes,
  legalGateOutcomesFor,
  type GateKind,
  type GateOutcome,
  type GateResult,
} from "./quality-gate";
import {
  buildHatCommunicationBrief,
  evidenceSatisfies,
  routeSignal,
  type HatCommunicationBrief,
  type SignalTool,
} from "./supervisor-signal";
import type { EvidenceRef } from "./discussion-anchor";
import type { NextAction } from "../observe/observe";
import { heartbeat, releaseClaim, type WorkQueue } from "./work-market";
import {
  cadenceOwnerLevel,
  mayAdjustSchedule,
  maySetCadence,
  setBlockState,
  ScheduleBlockState,
  type Calendar,
  type ScheduleBlockType,
  type ScheduleResult,
} from "./work-schedule";

export type AdminResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

// ─── Bindings ───────────────────────────────────────────────────────────────

/**
 * Revoke an agent's hat — the incident action.
 *
 * Only a hat that SUPERVISES the revoked hat may do it. Without the check this would be a faster way
 * to strip authority than the reporting line allows, which is the opposite of what an audited
 * organization wants from its admin surface.
 */
export function revokeHat(
  chart: OrgChart,
  bindings: readonly HatBinding[],
  input: {
    readonly bindingId: string;
    readonly byHatId: string;
    readonly nowMs: number;
    readonly reason: string;
  },
): AdminResult<readonly HatBinding[]> {
  const binding = bindings.find((b) => b.bindingId === input.bindingId);
  if (binding === undefined) return { ok: false, reason: `no binding '${input.bindingId}'` };
  if (!mayAdjustSchedule(chart, input.byHatId, binding.hatId)) {
    return {
      ok: false,
      reason: `'${input.byHatId}' does not supervise '${binding.hatId}' and cannot revoke its binding`,
    };
  }
  const revoked: BindingResult = revokeBinding(binding, input.nowMs, input.reason);
  if (!revoked.ok) return { ok: false, reason: revoked.reason };
  return {
    ok: true,
    value: bindings.map((b) => (b.bindingId === input.bindingId ? revoked.binding : b)),
  };
}

/** A supervisor approves a pending binding, starting its clock. */
export function approvePendingBinding(
  chart: OrgChart,
  bindings: readonly HatBinding[],
  input: { readonly bindingId: string; readonly byHatId: string; readonly nowMs: number },
): AdminResult<readonly HatBinding[]> {
  const binding = bindings.find((b) => b.bindingId === input.bindingId);
  if (binding === undefined) return { ok: false, reason: `no binding '${input.bindingId}'` };
  const hat = chart.byId.get(binding.hatId);
  if (hat === undefined) return { ok: false, reason: `binding names unknown hat '${binding.hatId}'` };
  if (!mayAdjustSchedule(chart, input.byHatId, binding.hatId)) {
    return { ok: false, reason: `'${input.byHatId}' does not supervise '${binding.hatId}'` };
  }
  const approved = approveBinding(binding, hat, input.nowMs);
  if (!approved.ok) return { ok: false, reason: approved.reason };
  // Advance immediately so the caller sees the phase the clock actually implies rather than the one
  // approval nominally set.
  const advanced = advanceBinding(approved.binding, hat, input.nowMs);
  return { ok: true, value: bindings.map((b) => (b.bindingId === input.bindingId ? advanced : b)) };
}

// ─── Schedule ───────────────────────────────────────────────────────────────

/** Cancel a block. Only the hat itself or a supervisor may. */
export function cancelBlock(
  chart: OrgChart,
  calendar: Calendar,
  input: { readonly blockId: string; readonly byHatId: string },
): AdminResult<Calendar> {
  const block = calendar.blocks.find((b) => b.blockId === input.blockId);
  if (block === undefined) return { ok: false, reason: `no block '${input.blockId}'` };
  if (!mayAdjustSchedule(chart, input.byHatId, block.hatId)) {
    return { ok: false, reason: `'${input.byHatId}' may not adjust '${block.hatId}'s schedule` };
  }
  const r: ScheduleResult = setBlockState(calendar, input.blockId, ScheduleBlockState.Canceled);
  return r.ok ? { ok: true, value: r.calendar } : { ok: false, reason: r.reason };
}

/** May this hat set the org-wide cadence for a block type, and who owns it if not? */
export function cadenceAuthority(
  chart: OrgChart,
  hatId: string,
  blockType: ScheduleBlockType,
): AdminResult<{ readonly owner: HatLevel; readonly permitted: boolean }> {
  const hat = chart.byId.get(hatId);
  if (hat === undefined) return { ok: false, reason: `unknown hat '${hatId}'` };
  return {
    ok: true,
    value: { owner: cadenceOwnerLevel(blockType), permitted: maySetCadence(hat.level, blockType) },
  };
}

/** What this hat's loop may pick right now, given its calendar. The operator's "why is it idle". */
export function menuForHatNow(
  calendar: Calendar,
  hatId: string,
  nowMs: number,
  menu: readonly NextAction[],
): { readonly offered: readonly NextAction[]; readonly workInScope: boolean } {
  const policy = createScheduleMenuPolicy(calendar, hatId, nowMs);
  const block = calendar.blocks.find(
    (b) => b.hatId === hatId && b.startMs <= nowMs && nowMs < b.endMs,
  );
  return {
    offered: policy(menu),
    workInScope: block === undefined ? true : workIsInScopeDuring(block.blockType),
  };
}

// ─── Work market ────────────────────────────────────────────────────────────

/** Keep a claim alive. Refused once the claim is no longer active. */
export function beat(
  queue: WorkQueue,
  claimId: string,
  nowMs: number,
): AdminResult<WorkQueue> {
  const r = heartbeat(queue, claimId, nowMs);
  return r.ok ? { ok: true, value: r.queue } : { ok: false, reason: r.reason };
}

/** Hand a claim back — the operator's answer to an agent that is stuck but still alive. */
export function handBack(
  queue: WorkQueue,
  input: { readonly claimId: string; readonly nowMs: number; readonly reason: string },
): AdminResult<WorkQueue> {
  const r = releaseClaim(queue, input.claimId, input.nowMs, input.reason);
  return r.ok ? { ok: true, value: r.queue } : { ok: false, reason: r.reason };
}

// ─── Gates ──────────────────────────────────────────────────────────────────

/** The outcomes this evaluator may choose for a gate, and whether waiving is among them. */
export function gateOptionsFor(
  chart: OrgChart,
  hatId: string,
): AdminResult<{ readonly ordinary: readonly GateOutcome[]; readonly mine: readonly GateOutcome[] }> {
  const hat = chart.byId.get(hatId);
  if (hat === undefined) return { ok: false, reason: `unknown hat '${hatId}'` };
  return { ok: true, value: { ordinary: legalGateOutcomes(), mine: legalGateOutcomesFor(hat) } };
}

/**
 * An operator drives one gate to a named outcome.
 *
 * The outcome is a PREFERENCE matched by value, not an assignment: it still goes through
 * `evaluateGate`, so ordering, ownership and the waive check all apply. An admin path that wrote the
 * verdict directly would be a way around the gate rather than a way to use it.
 */
export function decideGate(
  chart: OrgChart,
  input: {
    readonly workId: string;
    readonly gate: GateKind;
    readonly evaluatorHatId: string;
    readonly passed: ReadonlySet<GateKind>;
    readonly outcome: GateOutcome;
    readonly atMs: number;
    /** The hat that did the work. `NO_PROPOSER` when the work has no author yet. */
    readonly proposerHatId: string;
  },
): GateResult {
  const chooser: OrgChooser<GateOutcome> = preferWhere(
    (o) => o === input.outcome,
    `operator asked for ${input.outcome}`,
  );
  return evaluateGate(chart, {
    workId: input.workId,
    gate: input.gate,
    evaluatorHatId: input.evaluatorHatId,
    passed: input.passed,
    chooser,
    atMs: input.atMs,
    proposerHatId: input.proposerHatId,
  });
}

// ─── Escalation ─────────────────────────────────────────────────────────────

/** What this hat could legally do about this trigger — the operator's menu before deciding. */
export function escalationOptions(
  chart: OrgChart,
  hatId: string,
  trigger: EscalationTrigger,
): AdminResult<{ readonly authorized: boolean; readonly actions: readonly EscalationAction[] }> {
  const hat = chart.byId.get(hatId);
  if (hat === undefined) return { ok: false, reason: `unknown hat '${hatId}'` };
  return {
    ok: true,
    value: {
      authorized: hasEscalationAuthority(hat.level),
      actions: legalEscalationActions(trigger, hat.level),
    },
  };
}

// ─── Deliberation ───────────────────────────────────────────────────────────

/**
 * Drop a discussion that will not conclude.
 *
 * Distinct from resolving, and deliberately available to an operator: an initiative gets cancelled,
 * an incident turns out not to be one, and forcing those through `resolve` would mean manufacturing
 * a decision nobody made.
 */
export function dropAnchor(board: AnchorBoard, anchorId: string): AdminResult<AnchorBoard> {
  const r: BoardResult = abandonAnchor(board, anchorId);
  return r.ok ? { ok: true, value: r.board } : { ok: false, reason: r.reason };
}

// ─── Communication ──────────────────────────────────────────────────────────

/** The brief a hat carries: its duty, its supervisor, and where each upward tool routes. */
export function briefFor(
  chart: OrgChart,
  hatId: string,
  resourceAuthorityHatId: string,
): AdminResult<HatCommunicationBrief> {
  const brief = buildHatCommunicationBrief(chart, hatId, resourceAuthorityHatId);
  return brief === undefined
    ? { ok: false, reason: `unknown hat '${hatId}'` }
    : { ok: true, value: brief };
}

/** Would this signal be accepted, and where would it go? Checked BEFORE sending. */
export function previewSignal(
  chart: OrgChart,
  input: {
    readonly fromHatId: string;
    readonly tool: SignalTool;
    readonly evidence: readonly EvidenceRef[];
    readonly resourceAuthorityHatId: string;
  },
): AdminResult<{ readonly targetHatId?: string; readonly evidenceOk: boolean }> {
  if (chart.byId.get(input.fromHatId) === undefined) {
    return { ok: false, reason: `unknown hat '${input.fromHatId}'` };
  }
  const target = routeSignal(chart, input.fromHatId, input.tool, input.resourceAuthorityHatId);
  return {
    ok: true,
    value: {
      ...(target === undefined ? {} : { targetHatId: target.id }),
      evidenceOk: evidenceSatisfies(input.tool, input.evidence),
    },
  };
}

// ─── Intake ─────────────────────────────────────────────────────────────────

/**
 * Ingest and triage in two explicit steps, so an operator can see which one refused.
 *
 * `receive` in `intake.ts` does both and returns the first refusal, which is right for a webhook.
 * An operator repairing a stuck report needs to know whether it was rejected as a duplicate or for
 * missing evidence.
 */
export function ingestThenTriage(
  normalized: NormalizedIntake,
  input: { readonly itemId: string; readonly nowMs: number; readonly seen: ReadonlySet<string> },
): { readonly ingested: IntakeResult<IntakeItem>; readonly triaged?: IntakeResult<IntakeItem> } {
  const ingested = ingest(normalized, input);
  if (!ingested.ok) return { ingested };
  return { ingested, triaged: triage(ingested.value) };
}

// ─── Priority and structure ─────────────────────────────────────────────────

/** What priority classes this hat may set, with the normalized weight of an input for context. */
export function priorityOptions(
  chart: OrgChart,
  hatId: string,
): AdminResult<readonly PriorityClass[]> {
  const hat = chart.byId.get(hatId);
  return hat === undefined
    ? { ok: false, reason: `unknown hat '${hatId}'` }
    : { ok: true, value: legalPriorityClassesFor(hat.level) };
}

/** Normalize an operator-supplied signal to `0..1`, refusing a value that is not a number. */
export function normalizedSignal(raw: number): AdminResult<number> {
  if (!Number.isFinite(raw)) return { ok: false, reason: `'${raw}' is not a usable signal value` };
  return { ok: true, value: normalizeInput(raw) };
}

/** Who would own a rung beneath this hat — the staffing question before decomposing. */
export function proposedOwner(
  chart: OrgChart,
  parentHatId: string,
  level: HatLevel,
  mustSupportLevel?: HatLevel,
): AdminResult<OrgHat> {
  const owner = ownerForRung(chart, level, parentHatId, mustSupportLevel);
  return owner === undefined
    ? { ok: false, reason: `no ${level} hat reports up to '${parentHatId}'` }
    : { ok: true, value: owner };
}

/** Validate a proposed chart before adopting it. The refusal names what is wrong. */
export function validateChart(hats: readonly OrgHat[]): OrgChartResult {
  return buildOrgChart(hats);
}
