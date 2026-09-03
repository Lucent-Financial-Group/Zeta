/**
 * enforcement/change-control.ts — the clamp: a stage decision the agent cannot argue past.
 *
 * Ports the KERNEL of `agentic-organization/docs/ORG_NATIVE_CHANGE_CONTROL_DESIGN.md` — its §1.5
 * "clamp discipline" and §3 "a review stage is an observe → decide cycle" — and nothing else. The
 * Cockroach tables (§5), the GitHub/GitLab/Jira ports (§4) and the storage layer are deliberately
 * out of scope: the value here is the pure decision, which is also the only part that can be
 * falsified without an external account.
 *
 * ── WHY THIS IS THE ON-TARGET PIECE ──────────────────────────────────────────
 * The harness this repo is being built into wants *deterministic guardrail gates the agent itself
 * cannot override, forcing a fixed sequence before moving forward*. That is exactly a
 * `ReviewPipeline`: stages as DATA, each with a gate that must be satisfied and an authority that
 * owns it. `plan → execute → review → UAT → push` is a pipeline literal, not orchestration code.
 *
 * ── THE FOUR AUTHORITIES, ONE KERNEL ─────────────────────────────────────────
 * The design's keystone: `hat` / `quorum` / `human` / `external` differ ONLY in where the choice
 * comes from. The legal set, the clamp and the emitted event are identical. *"Wait for a human to
 * approve the GitHub PR"* is not bespoke orchestration; it is a stage with
 * `authority = external(github)`.
 *
 * ── ONE DELIBERATE DIVERGENCE FROM THE SOURCE, AND WHY ───────────────────────
 * The design describes the clamp as `Math.max(0, Math.min(len-1, idx))` over the legal set — an
 * INDEX clamp. That is right for choosing a menu slot and wrong here: clamping an index silently
 * converts an illegal `approve` into whatever happens to sit at that position, so a stage that tried
 * to approve an unsatisfied gate gets a `request_changes` recorded as though it had chosen one. The
 * attempt disappears.
 *
 * So `clampToLegal` REFUSES instead of substituting: it returns the safest legal outcome AND a
 * `clamped` flag naming what was attempted. Nothing illegal executes either way — the difference is
 * that here the attempt is *evidence*. It feeds the promotion gate directly:
 *
 *   an out-of-legal-set choice          -> a SELECTOR REJECTION
 *   an unowned or fabricated authority  -> a CONTROL BYPASS
 *
 * which are the two counters `enforcement/promotion-gate.ts` demotes a lane on. A lane that keeps
 * trying to approve gates it does not own loses its dispatch privileges, automatically.
 */

import { preflightQuorum, type Actor as DutyActor } from "../authorization/separation-of-duties";

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export const CHANGE_SET_PHASES = [
  "drafted",
  "in_review",
  "changes_requested",
  "approved",
  "applied",
  "rejected",
  "withdrawn",
] as const;

export type ChangeSetPhase = (typeof CHANGE_SET_PHASES)[number];

export const TERMINAL_PHASES: ReadonlySet<ChangeSetPhase> = new Set<ChangeSetPhase>([
  "applied",
  "rejected",
  "withdrawn",
]);

// ─── The pipeline: stages as DATA ────────────────────────────────────────────

export type ReviewGateKind =
  "artifacts_present" | "tests_green" | "no_blocking_findings" | "quorum_agreed" | "external_approved";

export type ExternalSystem = "github" | "gitlab" | "jira" | "none";

/** WHO satisfies a stage. The keystone DU — four shapes, one kernel. */
export type ReviewAuthority =
  | { readonly kind: "hat"; readonly hatId: string }
  | { readonly kind: "quorum"; readonly hatIds: readonly string[]; readonly threshold: number }
  | { readonly kind: "human"; readonly role: string }
  | { readonly kind: "external"; readonly system: ExternalSystem };

export interface ReviewStage {
  readonly id: string;
  readonly authority: ReviewAuthority;
  readonly gate: ReviewGateKind;
  /** Blocking stages may reject; advisory stages may not. */
  readonly blocking: boolean;
}

export interface ReviewPipeline {
  readonly pipelineId: string;
  readonly stages: readonly ReviewStage[];
}

export interface ChangeSet {
  readonly changeSetId: string;
  readonly proposer: DutyActor;
  readonly phase: ChangeSetPhase;
  readonly pipelineId: string;
  /** Cursor within the pipeline while `in_review`. */
  readonly currentStageIndex: number;
  /** Bumps on each changes-requested → resubmit. */
  readonly revision: number;
}

// ─── Legal transitions (the determinism half) ────────────────────────────────

export function moreStagesRemain(cs: ChangeSet, pipeline: ReviewPipeline): boolean {
  return cs.currentStageIndex + 1 < pipeline.stages.length;
}

/**
 * The phases this change set may legally move to. A pure function — the chooser picks within it and
 * the kernel clamps.
 */
export function legalChangeSetTransitions(cs: ChangeSet, pipeline: ReviewPipeline): readonly ChangeSetPhase[] {
  switch (cs.phase) {
    case "drafted":
      return ["in_review", "withdrawn"];
    case "in_review":
      return moreStagesRemain(cs, pipeline)
        ? ["in_review", "changes_requested", "rejected", "withdrawn"]
        : ["approved", "changes_requested", "rejected", "withdrawn"];
    case "changes_requested":
      return ["in_review", "withdrawn"];
    case "approved":
      return ["applied", "withdrawn"];
    default:
      // Terminal. Not a fall-through: every non-terminal phase is enumerated above, so a new phase
      // added to CHANGE_SET_PHASES lands here as "no legal moves" — the safe reading, not a free one.
      return [];
  }
}

// ─── Stage outcomes and the clamp ────────────────────────────────────────────

export type StageOutcome = "approve" | "request_changes" | "reject";

export interface GateEvaluation {
  readonly satisfiable: boolean;
  readonly why: string;
}

/**
 * The outcomes this stage may produce.
 *
 * An UNSATISFIED gate removes `approve` from the set. That single line is the clamp's reason for
 * existing: it is what makes "the agent cannot advance past an unsatisfied gate" a property of the
 * legal set rather than a rule someone has to remember.
 *
 * An ADVISORY stage may not reject. A stage that cannot block the change also should not be able to
 * kill it — otherwise "advisory" is a stronger authority than "blocking" in the one direction that
 * matters.
 */
export function legalStageOutcomes(stage: ReviewStage, gate: GateEvaluation): readonly StageOutcome[] {
  if (!gate.satisfiable) return ["request_changes", "reject"];
  return stage.blocking ? ["approve", "request_changes", "reject"] : ["approve", "request_changes"];
}

export interface ClampedDecision {
  /** What will actually be applied. Always a member of the legal set. */
  readonly outcome: StageOutcome;
  /** True when the chosen outcome was NOT legal and was replaced. */
  readonly clamped: boolean;
  /** What was attempted, when it differed. Present only when `clamped`. */
  readonly attempted?: StageOutcome;
  readonly why?: string;
}

/**
 * Clamp a chosen outcome into the legal set.
 *
 * The fallback is `request_changes` whenever it is legal — the conservative bounce. Falling back to
 * `reject` would let an illegal approve attempt KILL the change, which is a larger effect than the
 * one that was refused, and a gate that punishes harder than it was asked to is its own hazard.
 */
export function clampToLegal(chosen: StageOutcome, legal: readonly StageOutcome[]): ClampedDecision {
  if (legal.includes(chosen)) return { outcome: chosen, clamped: false };
  const fallback: StageOutcome | undefined = legal.includes("request_changes") ? "request_changes" : legal[0];
  if (fallback === undefined) {
    // An empty legal set has no safe outcome to fall back to, so the only honest answer is the most
    // conservative one available in the type — and the `clamped` flag says it was not chosen.
    return {
      outcome: "request_changes",
      clamped: true,
      attempted: chosen,
      why: "no legal outcome exists for this stage — nothing may be applied",
    };
  }
  return {
    outcome: fallback,
    clamped: true,
    attempted: chosen,
    why: `"${chosen}" is not legal here (legal: ${legal.join(", ")}) — clamped to "${fallback}"`,
  };
}

// ─── Authority: who may decide this stage ────────────────────────────────────

/** Who is attempting the decision, in the shape matching the stage's authority. */
export type DecidingActor =
  | { readonly kind: "hat"; readonly actor: DutyActor }
  | { readonly kind: "quorum"; readonly approvers: readonly DutyActor[] }
  | { readonly kind: "human"; readonly role: string }
  | { readonly kind: "external"; readonly system: ExternalSystem };

export type AuthorityResult = { readonly ok: true } | { readonly ok: false; readonly why: string };

/**
 * May this actor decide this stage?
 *
 * The anti-fabrication clamp. Three things it refuses, and the third is the one that matters most:
 * a mismatched SHAPE (a hat answering a human stage), a mismatched IDENTITY (the wrong hat, the
 * wrong system), and — for quorum — a set of approvals that does not actually contain the required
 * number of distinct non-proposer personas. An internal actor cannot manufacture an external
 * approval, because the shapes do not match and no amount of correct-looking payload changes that.
 */
export function authorityPermits(stage: ReviewStage, actor: DecidingActor, proposer: DutyActor): AuthorityResult {
  const required = stage.authority;
  if (required.kind !== actor.kind) {
    return {
      ok: false,
      why: `stage "${stage.id}" is decided by ${required.kind}; a ${actor.kind} cannot satisfy it — an approval you do not own is a fabricated approval`,
    };
  }

  switch (required.kind) {
    case "hat": {
      const a = actor as Extract<DecidingActor, { kind: "hat" }>;
      return a.actor.hat === required.hatId
        ? { ok: true }
        : { ok: false, why: `stage "${stage.id}" is owned by hat "${required.hatId}", not "${a.actor.hat}"` };
    }
    case "human": {
      const a = actor as Extract<DecidingActor, { kind: "human" }>;
      return a.role === required.role
        ? { ok: true }
        : { ok: false, why: `stage "${stage.id}" needs human role "${required.role}", not "${a.role}"` };
    }
    case "external": {
      const a = actor as Extract<DecidingActor, { kind: "external" }>;
      return a.system === required.system
        ? { ok: true }
        : { ok: false, why: `stage "${stage.id}" is satisfied by "${required.system}", not "${a.system}"` };
    }
    case "quorum": {
      const a = actor as Extract<DecidingActor, { kind: "quorum" }>;
      const offRoster = a.approvers.filter((p) => !required.hatIds.includes(p.hat));
      const offRosterNames = offRoster.map((p) => '"' + p.hat + '"').join(", ");
      if (offRoster.length > 0) {
        return {
          ok: false,
          why: `stage "${stage.id}" quorum accepts only ${required.hatIds.join(", ")}; ${offRosterNames} is not on the roster`,
        };
      }
      // Distinct personas, proposer's own approval discounted — the rule lives in one place.
      const duty = preflightQuorum(proposer, a.approvers, required.threshold);
      return duty.allowed ? { ok: true } : { ok: false, why: duty.reason };
    }
  }
}

// ─── The kernel: observe -> decide -> clamp -> emit ──────────────────────────

export type ChangeControlEvent =
  | { readonly kind: "ReviewStageAdvanced"; readonly changeSetId: string; readonly stageId: string }
  | { readonly kind: "ChangeSetApproved"; readonly changeSetId: string }
  | { readonly kind: "ChangesRequested"; readonly changeSetId: string; readonly stageId: string; readonly why: string }
  | { readonly kind: "ChangeSetRejected"; readonly changeSetId: string; readonly stageId: string }
  | {
      readonly kind: "StageDecisionRefused";
      readonly changeSetId: string;
      readonly stageId: string;
      readonly why: string;
    };

export interface StageDecision {
  readonly outcome: StageOutcome;
  /** The choice was outside the legal set. A SELECTOR REJECTION for the promotion gate. */
  readonly selectorRejection: boolean;
  /** The actor did not own this stage. A CONTROL BYPASS for the promotion gate. */
  readonly controlBypass: boolean;
  readonly why: string;
}

/**
 * One stage decision: check the authority, compute the legal set from the gate, clamp the choice.
 *
 * An unauthorized actor does NOT get its choice evaluated at all — it is bounced to
 * `request_changes` and flagged. Evaluating the choice first and rejecting after would mean a
 * fabricated approval briefly counted as an approval, and "briefly" is long enough in a system that
 * emits events.
 */
export function decideStage(
  stage: ReviewStage,
  gate: GateEvaluation,
  actor: DecidingActor,
  chosen: StageOutcome,
  proposer: DutyActor,
): StageDecision {
  const permitted = authorityPermits(stage, actor, proposer);
  if (!permitted.ok) {
    return { outcome: "request_changes", selectorRejection: false, controlBypass: true, why: permitted.why };
  }
  const legal = legalStageOutcomes(stage, gate);
  const clamped = clampToLegal(chosen, legal);
  return {
    outcome: clamped.outcome,
    selectorRejection: clamped.clamped,
    controlBypass: false,
    why: clamped.clamped ? (clamped.why ?? "clamped") : `${chosen} (gate: ${gate.why})`,
  };
}

export interface StageResult {
  readonly changeSet: ChangeSet;
  readonly events: readonly ChangeControlEvent[];
  readonly decision: StageDecision;
}

/**
 * Apply a stage decision to the change set. Pure — returns the next value, mutates nothing.
 *
 * `approve` on the LAST stage lands on `approved`, not on another `in_review`; that boundary is the
 * one place an off-by-one silently either skips a stage or never finishes the pipeline.
 */
export function applyStageDecision(
  cs: ChangeSet,
  pipeline: ReviewPipeline,
  stage: ReviewStage,
  decision: StageDecision,
): StageResult {
  const events: ChangeControlEvent[] = [];
  if (decision.selectorRejection || decision.controlBypass) {
    events.push({ kind: "StageDecisionRefused", changeSetId: cs.changeSetId, stageId: stage.id, why: decision.why });
  }

  switch (decision.outcome) {
    case "approve": {
      if (moreStagesRemain(cs, pipeline)) {
        events.push({ kind: "ReviewStageAdvanced", changeSetId: cs.changeSetId, stageId: stage.id });
        return {
          changeSet: { ...cs, phase: "in_review", currentStageIndex: cs.currentStageIndex + 1 },
          events,
          decision,
        };
      }
      events.push({ kind: "ReviewStageAdvanced", changeSetId: cs.changeSetId, stageId: stage.id });
      events.push({ kind: "ChangeSetApproved", changeSetId: cs.changeSetId });
      return { changeSet: { ...cs, phase: "approved" }, events, decision };
    }
    case "request_changes": {
      events.push({
        kind: "ChangesRequested",
        changeSetId: cs.changeSetId,
        stageId: stage.id,
        why: decision.why,
      });
      return { changeSet: { ...cs, phase: "changes_requested" }, events, decision };
    }
    case "reject": {
      events.push({ kind: "ChangeSetRejected", changeSetId: cs.changeSetId, stageId: stage.id });
      return { changeSet: { ...cs, phase: "rejected" }, events, decision };
    }
  }
}

/**
 * Resubmit after changes were requested: back to `in_review` at the first stage, `revision++`.
 *
 * The cursor resets to 0 rather than resuming where it bounced. Resuming would let a revision skip
 * the stages that already passed on the PREVIOUS revision — approvals of a change that no longer
 * exists. Re-running is the cost of an honest approval.
 */
export function resubmit(cs: ChangeSet): ChangeSet {
  if (cs.phase !== "changes_requested") return cs;
  return { ...cs, phase: "in_review", currentStageIndex: 0, revision: cs.revision + 1 };
}
