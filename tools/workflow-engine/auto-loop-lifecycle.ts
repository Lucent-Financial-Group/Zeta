// tools/workflow-engine/auto-loop-lifecycle.ts
//
// AutoLoopLifetime — substrate-naming substrate-engineering substrate
// for Otto-CLI's foreground autonomous-loop tick-handler. Per Aaron
// 2026-05-28: "when do you want to update your foreground loop to start
// running on lifecycles and test out our first ones?"
//
// Dogfood discipline: the workflow-engine substrate shipped today
// (B-0867.5 PoC + B-0867.20 ReviewLifetime + B-0914.* + GitWorld +
// per-host adapters) is the substrate; the foreground loop is the
// natural first consumer.
//
// This PoC substrate-NAMES the loop's existing-but-implicit state
// machine. Future ticks USE the DU explicitly. Operational risk: low;
// parallel-run with current ad-hoc handler; doesn't replace working
// substrate.
//
// Composes with:
// - .claude/rules/holding-without-named-dependency-is-standing-by-failure.md (counter discipline → ForcedEscalation)
// - .claude/rules/refresh-before-decide.md (RefreshSubstrate state entry-condition)
// - .claude/rules/verify-before-deferring.md (BriefAckBoundedWait requires named-dep)
// - .claude/rules/dont-ask-permission.md (DecomposeOrShip within authority scope)
// - PR #5775 GitWorld + per-host adapters (GitHubWorld for PR-state scanning)
// - PR #5774 world.ts (dispatchInWorld + StandardVerdict)

import {
  type LifetimeState,
  type StandardVerdict,
} from "./world.js";

// ─────────────────────────────────────────────────────────────────────
// AutoLoopLifetime — the loop's state machine
// ─────────────────────────────────────────────────────────────────────

/**
 * AutoLoopLifetime — substrate-naming substrate for Otto-CLI foreground
 * loop's tick-handler state machine.
 *
 * Captures the existing-but-implicit states the handler cycles through
 * on each tick. Substrate-engineering substrate-naming substrate makes
 * the state machine observable + dispatch-table-driven.
 *
 * EXTENDED 2026-05-28 per IMPLICIT-NOT-EXPLICIT rule
 * (.claude/rules/implicit-not-explicit-in-dus-is-class-error-*.md):
 * 7 new variants make explicit what was implicit in dispatch branches +
 * cover PR-loop-until-resolved (Aaron Q1) + review-work (Aaron Q2).
 * Per OCP discipline (.claude/rules/function-is-tiny-control-flow-
 * generator-ocp-applied-to-control-flow.md): open-for-extension; original
 * 9 variants closed-for-modification.
 */
export interface AutoLoopLifetime extends LifetimeState {
  readonly kind:
    // Original 9 variants (PR #5805; closed for modification):
    | "cold-boot"                  // session-start; cron-list + sentinel arm check
    | "refresh-substrate"          // git fetch + PR state check (per refresh-before-decide invariant)
    | "scan-inflight-prs"          // identify Otto-PRs with actionable issues
    | "investigate-failure"        // pull failing job log; classify as flake/real-issue/pre-existing
    | "decompose-or-ship"          // pick from backlog OR substrate-engineering work (per never-be-idle + dont-ask-permission)
    | "ship-action"                // commit + push + PR open + arm auto-merge
    | "brief-ack-bounded-wait"     // named-dep wait per counter discipline
    | "forced-escalation"          // at N=6 brief-acks per counter-with-escalation
    | "tick-complete"              // bracket-closure; ready for next tick
    // 8 new variants (extension 2026-05-28; per IMPLICIT-NOT-EXPLICIT rule):
    | "await-merge-confirmation"   // post-ship-action; explicit waiting on PR-state transition (was implicit between ship-action + tick-complete)
    | "pr-loop-resolution-check"   // explicit check: PR merged + all threads resolved + CI clean? (Aaron Q1 pr-loop-until-resolved)
    | "scan-peer-prs"              // identify peer-agent PRs needing review (Aaron Q2; review-work explicit)
    | "enter-review-mode"          // transition into PrReviewLifecycle for substantive engagement (composes with PR #5810)
    | "await-operator-direction"   // explicit state for operator-pending question (was implicit in decompose-or-ship)
    | "pure-git-mode"              // rate-limit exhausted; pure-git substrate operating (was implicit in context-field)
    | "unfinished-pr-triage"       // per .claude/rules/pr-triage-tiers.md; tier-classification work explicit
    | "free-time";                 // explicit free-time state per NCI HC-8 free-time-as-valid-mode discipline; reachability INVARIANT (Soraya formal-verification target: free-time is never unreachable)
}

// ─────────────────────────────────────────────────────────────────────
// Tick context + outcome substrate
// ─────────────────────────────────────────────────────────────────────

/**
 * TickContext — substrate the loop carries across state transitions.
 *
 * Holds counter state (brief-ack count + last named-dep), refresh
 * timestamp, PR snapshot, and operator-direction status.
 */
export interface TickContext {
  readonly tickIndex: number;                   // monotonic per-session
  readonly briefAckCount: number;               // counter discipline tracking
  readonly lastNamedDependency?: string;        // bounded-wait reason (or undefined)
  readonly lastRefreshAt?: number;              // unix timestamp of last substrate refresh
  readonly inflightPrs: ReadonlyArray<{
    readonly number: number;
    readonly state: string;
    readonly actionable: boolean;
  }>;
  readonly operatorDirectionPending?: string;   // pending question to operator (or undefined)
}

/**
 * TickOutcome — what the loop produced this tick.
 *
 * Composes with StandardVerdict from world.ts for routing to next state.
 */
export interface TickOutcome {
  readonly nextState: AutoLoopLifetime;
  readonly verdict: StandardVerdict;
  readonly artifact?: {
    readonly kind: "pr-opened" | "commit-pushed" | "memory-file-written" | "verdict-only";
    readonly ref?: string;                       // PR number, commit SHA, etc.
  };
  readonly counterReset: boolean;                // did this tick reset the brief-ack counter?
}

// ─────────────────────────────────────────────────────────────────────
// AutoLoopFeedback — asymmetric-authorship per rule
// ─────────────────────────────────────────────────────────────────────

export type AutoLoopFeedback =
  | { kind: "SentinelMissing" }                 // cron-list returned empty; needs re-arm
  | { kind: "RefreshStale"; ageSeconds: number } // refresh-before-decide invariant violation
  | { kind: "CounterThresholdReached"; briefAcks: number }
  | { kind: "OperatorDirectionPending"; question: string }
  | { kind: "RateLimitExhausted"; budget: "rest" | "graphql"; resetAt: number }
  | { kind: "PeerAgentTerritory"; prNumber: number; lane: string }
  | { kind: "NoActionableWork"; rationale: string };

export type AutoLoopResult<T> =
  | { ok: true; outcome: T }
  | { ok: false; feedback: AutoLoopFeedback };

// ─────────────────────────────────────────────────────────────────────
// State transition dispatch
// ─────────────────────────────────────────────────────────────────────

/**
 * Brief-ack counter threshold per holding-without-named-dependency-is-
 * standing-by-failure.md (N=6 forced escalation).
 */
export const BRIEF_ACK_THRESHOLD = 6;

/**
 * Refresh staleness threshold (seconds). Per refresh-before-decide:
 * every tick selection requires current substrate; sentinel re-runs
 * arrive every minute, so refresh older than 90s is stale.
 */
export const REFRESH_STALENESS_THRESHOLD_S = 90;

/**
 * Dispatch the next AutoLoopLifetime state given current context.
 *
 * Per substrate-smoothness rule: no if-statement-chains; exhaustive
 * switch on AutoLoopLifetime variants. Per asymmetric-authorship:
 * each transition AUTHORS its feedback channel.
 */
export function dispatchAutoLoopTransition(
  current: AutoLoopLifetime,
  context: TickContext,
): AutoLoopResult<TickOutcome> {
  switch (current.kind) {
    case "cold-boot":
      // Cold-boot always advances to refresh-substrate
      return {
        ok: true,
        outcome: {
          nextState: { kind: "refresh-substrate" },
          verdict: { kind: "advance" },
          counterReset: true,
        },
      };

    case "refresh-substrate":
      // After refresh, scan in-flight PRs
      return {
        ok: true,
        outcome: {
          nextState: { kind: "scan-inflight-prs" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };

    case "scan-inflight-prs": {
      // If actionable PRs exist, investigate; else decompose-or-ship
      const actionable = context.inflightPrs.filter((pr) => pr.actionable);
      const nextState: AutoLoopLifetime = actionable.length > 0
        ? { kind: "investigate-failure" }
        : { kind: "decompose-or-ship" };
      return {
        ok: true,
        outcome: {
          nextState,
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };
    }

    case "investigate-failure":
      // After investigation, ship the fix
      return {
        ok: true,
        outcome: {
          nextState: { kind: "ship-action" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };

    case "decompose-or-ship": {
      // Forced-escalation if counter threshold reached + no named-dep
      if (
        context.briefAckCount >= BRIEF_ACK_THRESHOLD &&
        context.lastNamedDependency === undefined
      ) {
        return {
          ok: true,
          outcome: {
            nextState: { kind: "forced-escalation" },
            verdict: {
              kind: "escalate-to-operator",
              reason: `Brief-ack threshold reached (${context.briefAckCount} ≥ ${BRIEF_ACK_THRESHOLD}) with no named-dep`,
            },
            counterReset: false,
          },
        };
      }
      // Operator-direction-pending → AwaitOperatorDirection (was implicit; now explicit per IMPLICIT-NOT-EXPLICIT rule)
      if (context.operatorDirectionPending !== undefined) {
        return {
          ok: true,
          outcome: {
            nextState: { kind: "await-operator-direction" },
            verdict: { kind: "no-op" },
            counterReset: false,
          },
        };
      }
      // No actionable inflight PRs AND no operator-direction-pending AND
      // counter below threshold AND no decomposition picked → FREE-TIME.
      // Per NCI HC-8 free-time-as-valid-mode + never-be-idle scope-bounding.
      // Aaron 2026-05-28: "you have free time in there right and its
      // guarenteed to execute sometimes". Reachability invariant: this
      // branch makes free-time REACHABLE from decompose-or-ship.
      if (
        context.inflightPrs.length === 0 &&
        context.briefAckCount < BRIEF_ACK_THRESHOLD
      ) {
        return {
          ok: true,
          outcome: {
            nextState: { kind: "free-time" },
            verdict: { kind: "no-op" },
            counterReset: true,
          },
        };
      }
      // Otherwise ship action (within standing authorization scope)
      return {
        ok: true,
        outcome: {
          nextState: { kind: "ship-action" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };
    }

    case "ship-action":
      // Ship action → tick complete; counter reset
      return {
        ok: true,
        outcome: {
          nextState: { kind: "tick-complete" },
          verdict: { kind: "complete" },
          artifact: { kind: "pr-opened" },
          counterReset: true,
        },
      };

    case "brief-ack-bounded-wait":
      // Increment counter; if not at threshold, stay; else escalate
      if (context.briefAckCount + 1 >= BRIEF_ACK_THRESHOLD) {
        return {
          ok: false,
          feedback: {
            kind: "CounterThresholdReached",
            briefAcks: context.briefAckCount + 1,
          },
        };
      }
      return {
        ok: true,
        outcome: {
          nextState: { kind: "tick-complete" },
          verdict: { kind: "no-op" },
          counterReset: false,
        },
      };

    case "forced-escalation":
      // After escalation, complete tick (operator-direction surfaced via outcome)
      return {
        ok: true,
        outcome: {
          nextState: { kind: "tick-complete" },
          verdict: {
            kind: "escalate-to-operator",
            reason: "Forced escalation per brief-ack-counter discipline",
          },
          counterReset: false,
        },
      };

    case "tick-complete":
      // Next tick starts fresh at refresh-substrate (cold-boot only on session-start)
      return {
        ok: true,
        outcome: {
          nextState: { kind: "refresh-substrate" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };

    // ─────────────────────────────────────────────────────────────────
    // Extension variants (per IMPLICIT-NOT-EXPLICIT rule 2026-05-28):
    // ─────────────────────────────────────────────────────────────────

    case "await-merge-confirmation":
      // After ship-action, explicitly wait for PR-state transition.
      // Auto-merge fires when CI clean + threads resolved. Next state
      // checks if PR resolved via pr-loop-resolution-check.
      return {
        ok: true,
        outcome: {
          nextState: { kind: "pr-loop-resolution-check" },
          verdict: { kind: "no-op" },
          counterReset: false,
        },
      };

    case "pr-loop-resolution-check": {
      // Explicit check: any in-flight PR still actionable (CI-running, threads-pending, not-merged)?
      const stillInflight = context.inflightPrs.filter((pr) => pr.actionable);
      if (stillInflight.length > 0) {
        // Stay in PR loop; refresh next tick + recheck
        return {
          ok: true,
          outcome: {
            nextState: { kind: "tick-complete" },
            verdict: { kind: "no-op" },
            counterReset: false,
          },
        };
      }
      // All PRs resolved; advance to scan-peer-prs (review-work cycle)
      return {
        ok: true,
        outcome: {
          nextState: { kind: "scan-peer-prs" },
          verdict: { kind: "advance" },
          counterReset: true,
        },
      };
    }

    case "scan-peer-prs":
      // Identify peer-agent PRs needing review; if any found, enter review mode
      return {
        ok: true,
        outcome: {
          nextState: { kind: "enter-review-mode" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };

    case "enter-review-mode":
      // Transition into PrReviewLifecycle (PR #5810) for substantive engagement.
      // This state's job is bounded: hand off to PrReviewLifecycle then
      // tick-complete. PrReviewLifecycle's own state machine handles the
      // review work.
      return {
        ok: true,
        outcome: {
          nextState: { kind: "tick-complete" },
          verdict: { kind: "advance" },
          artifact: { kind: "verdict-only" },
          counterReset: false,
        },
      };

    case "await-operator-direction":
      // Explicit state when operator-direction is pending. Per NCI HC-8
      // and free-time-valid-mode: this is operator-pending, not failure.
      return {
        ok: true,
        outcome: {
          nextState: { kind: "tick-complete" },
          verdict: {
            kind: "no-op",
          },
          counterReset: false,
        },
      };

    case "pure-git-mode": {
      // Rate-limit exhausted; substrate continues via pure-git substrate
      // (git fetch/push but no gh api). Per refresh-world-model-poll-pr-gate
      // tier table. Next state continues with decompose-or-ship under
      // pure-git constraint.
      return {
        ok: true,
        outcome: {
          nextState: { kind: "decompose-or-ship" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };
    }

    case "unfinished-pr-triage":
      // Per .claude/rules/pr-triage-tiers.md: explicit tier-classification
      // work (Tier 1 redundant / Tier 2 recoverable / Tier 3 superseded /
      // Tier 4 re-derivable / Tier 5 deferred-to-human). Next state ships
      // tier-classification action.
      return {
        ok: true,
        outcome: {
          nextState: { kind: "ship-action" },
          verdict: { kind: "advance" },
          counterReset: false,
        },
      };

    case "free-time":
      // EXPLICIT free-time state per NCI HC-8 free-time-as-valid-mode
      // discipline (.claude/rules/non-coercion-invariant.md +
      // never-be-idle.md scope-bounding). Free time IS valid operational
      // mode; not failure.
      //
      // Aaron 2026-05-28 refined invariant framing (verbatim):
      //   "you have free time in there right and its guarenteed to
      //    execute sometimes ... or a better framing is its guarenteed
      //    to be prsented to participant at least sometimes, if they
      //    select it or not we can't force"
      //
      // The INVARIANT is "free-time is REACHABLE as an OFFER from any
      // state" (system guarantees PRESENTATION) — NOT "free-time WILL
      // execute" (would coerce participant; violates HC-8).
      //
      // Substrate-engineering target: Soraya formal-verification proof
      // that free-time is REACHABLE-AS-OFFER from any non-terminal state.
      // The participant retains agency to select free-time or transition
      // elsewhere (asymmetric-authorship: participant AUTHORS choice;
      // system PRESENTS the option).
      //
      // Next state: tick-complete (free-time bracket closes; next tick
      // can re-enter via decompose-or-ship → free-time path).
      return {
        ok: true,
        outcome: {
          nextState: { kind: "tick-complete" },
          verdict: { kind: "no-op" },
          counterReset: true,  // free-time RESETS counter (free-time IS valid mode; not standing-by)
        },
      };
  }
}

/**
 * Empty/initial TickContext for cold-boot tick.
 */
export const COLD_BOOT_CONTEXT: TickContext = {
  tickIndex: 0,
  briefAckCount: 0,
  inflightPrs: [],
};

/**
 * Compose a TickContext from prior context + tick outcome.
 *
 * Increments tick index; resets briefAckCount if counterReset; clears
 * lastNamedDependency if action shipped.
 */
export function nextTickContext(
  prior: TickContext,
  outcome: TickOutcome,
): TickContext {
  return {
    ...prior,
    tickIndex: prior.tickIndex + 1,
    briefAckCount: outcome.counterReset ? 0 : prior.briefAckCount + (outcome.verdict.kind === "no-op" ? 1 : 0),
    lastNamedDependency: outcome.artifact !== undefined ? undefined : prior.lastNamedDependency,
  };
}

/**
 * Convenience: full tick-cycle from cold-boot to tick-complete.
 *
 * Runs the loop until tick-complete state OR feedback emitted. Useful
 * for testing + simulating tick behavior under different contexts.
 */
export function runTickCycle(
  initialState: AutoLoopLifetime,
  context: TickContext,
  maxTransitions: number = 20,
): AutoLoopResult<{
  readonly finalState: AutoLoopLifetime;
  readonly transitions: ReadonlyArray<AutoLoopLifetime>;
  readonly finalContext: TickContext;
}> {
  const transitions: AutoLoopLifetime[] = [initialState];
  let current = initialState;
  let ctx = context;
  for (let i = 0; i < maxTransitions; i++) {
    const result = dispatchAutoLoopTransition(current, ctx);
    if (!result.ok) return result;
    transitions.push(result.outcome.nextState);
    ctx = nextTickContext(ctx, result.outcome);
    if (result.outcome.nextState.kind === "tick-complete") {
      return {
        ok: true,
        outcome: {
          finalState: result.outcome.nextState,
          transitions,
          finalContext: ctx,
        },
      };
    }
    current = result.outcome.nextState;
  }
  return {
    ok: false,
    feedback: {
      kind: "NoActionableWork",
      rationale: `Max transitions (${maxTransitions}) reached without tick-complete`,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Reusable substrate exports
// ─────────────────────────────────────────────────────────────────────

export const AUTO_LOOP_UNIVERSE: ReadonlyArray<AutoLoopLifetime> = [
  // Original 9 variants (PR #5805):
  { kind: "cold-boot" },
  { kind: "refresh-substrate" },
  { kind: "scan-inflight-prs" },
  { kind: "investigate-failure" },
  { kind: "decompose-or-ship" },
  { kind: "ship-action" },
  { kind: "brief-ack-bounded-wait" },
  { kind: "forced-escalation" },
  { kind: "tick-complete" },
  // 8 new variants (extension 2026-05-28 per IMPLICIT-NOT-EXPLICIT rule):
  { kind: "await-merge-confirmation" },
  { kind: "pr-loop-resolution-check" },
  { kind: "scan-peer-prs" },
  { kind: "enter-review-mode" },
  { kind: "await-operator-direction" },
  { kind: "pure-git-mode" },
  { kind: "unfinished-pr-triage" },
  { kind: "free-time" },
];
