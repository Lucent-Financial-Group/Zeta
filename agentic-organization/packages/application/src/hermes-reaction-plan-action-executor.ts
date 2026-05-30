/**
 * Hermes-backed reaction-plan action executor — where the autonomous DATA PLANE
 * actually runs in the deployed worker.
 *
 * The reaction-plan executor claims a planned action and hands it here. We run
 * the action through a Hermes run (runWorkItemThroughHermes): the agent acts on
 * the work item, heartbeats, and — crucially — that heartbeat is persisted to
 * durable state through the agent-heartbeat writer, so the deterministic
 * keep-alive engine can SEE the agent is alive and reassign it if it goes
 * silent. This closes the loop: a task event drives a reaction plan, which runs
 * an agent, whose liveness the control plane watches.
 *
 * Pure composition over injected ports; Result-as-DU. (The agent's decision is
 * the in-process Hermes runtime today; a real agent/LLM backend swaps in behind
 * the same HermesRuntime port without touching this wiring.)
 */

import type { ReactionPlanAction } from "../../domain/src/index.ts";
import type { HermesRuntime } from "../../hermes/src/index.ts";
import type { Memory } from "../../memory/src/index.ts";
import {
  ReactionPlanExecutionStatus,
  type ReactionPlanActionExecutionContext,
  type ReactionPlanActionExecutionResult,
  type ReactionPlanActionExecutorPort,
} from "../../runtime/src/index.ts";
import type { EphemeralComposerPort } from "./observe.ts";
import {
  createFirstLegalOptionComposer,
  decideReactionAction,
  summarizeReactionDecision,
  type ReactionDecisionSummary,
} from "./reaction-decision.ts";
import { runWorkItemThroughHermes, type AgentHeartbeatWriter, type WorkItemRunRequest } from "./orchestrate-run.ts";

export type HermesReactionPlanActionExecutorDeps = {
  /** fresh per execution — the run lifecycle (launch -> heartbeat -> complete) is bounded to one action */
  createHermesRuntime: () => HermesRuntime;
  createMemory: () => Memory;
  /** persists agent liveness so the keep-alive engine sees the agent (Cockroach store in production) */
  agentHeartbeatWriter: AgentHeartbeatWriter;
  agentHeartbeatDeadlineMs: number;
  generateId: (prefix: string) => string;
  /**
   * The agent's decision intelligence. Defaults to the deterministic
   * first-legal-option policy; a real LLM/sandbox backend implements the same
   * EphemeralComposerPort and swaps in here without touching any other wiring.
   */
  composer?: EphemeralComposerPort;
  /** clock for the decision readout; defaults to wall-clock. */
  now?: () => string;
};

export function createHermesReactionPlanActionExecutor(
  deps: HermesReactionPlanActionExecutorDeps,
): ReactionPlanActionExecutorPort {
  return {
    executeReactionPlanAction: async (
      action: ReactionPlanAction,
      context: ReactionPlanActionExecutionContext,
    ): Promise<ReactionPlanActionExecutionResult> => {
      // The agent makes a REAL decision: the deterministic kernel computes the
      // legal options; the composer chooses among them. A decision the kernel
      // can't legalize fails the run honestly (retryable) — no fabricated work.
      const decision = decideReactionAction({
        action,
        composer: deps.composer ?? createFirstLegalOptionComposer(),
        now: deps.now ?? (() => new Date().toISOString()),
      });
      const summary = summarizeReactionDecision(decision);
      if (summary.kind === "feedback") {
        return {
          status: ReactionPlanExecutionStatus.Failed,
          failure: {
            message: `agent could not decide a legal move: ${summary.feedback.reason} - ${summary.feedback.message}`,
            retryable: true,
          },
        };
      }

      const request = mapActionToRunRequest(action, context, deps.generateId, summary);

      const result = await runWorkItemThroughHermes(request, {
        hermes: deps.createHermesRuntime(),
        memory: deps.createMemory(),
        agentHeartbeatWriter: deps.agentHeartbeatWriter,
        agentHeartbeatDeadlineMs: deps.agentHeartbeatDeadlineMs,
      });

      if (result.outcome === "ok") {
        return {
          status: ReactionPlanExecutionStatus.Succeeded,
          result: {
            message: `agent run ${result.run.runId} ${summary.actionSummary} for work item ${action.workItemId}`,
            createdWorkItemIds: [],
            createdDiscussionAnchorIds: [],
          },
        };
      }

      // the agent run could not complete — retryable so the reaction-plan executor
      // re-claims it on the next cycle (the keep-alive lease guards against pile-up)
      return {
        status: ReactionPlanExecutionStatus.Failed,
        failure: {
          message: `hermes run feedback: ${result.feedback.reason} - ${result.feedback.message}`,
          retryable: true,
        },
      };
    },
  };
}

function mapActionToRunRequest(
  action: ReactionPlanAction,
  context: ReactionPlanActionExecutionContext,
  generateId: (prefix: string) => string,
  decision: Extract<ReactionDecisionSummary, { kind: "summary" }>,
): WorkItemRunRequest {
  return {
    organizationId: action.organizationId,
    workItemId: action.workItemId,
    agentId: generateId(`agent-${action.requiredHat}`),
    sessionId: context.claimId,
    hatAssignmentId: generateId(`hat-${action.requiredHat}`),
    promptFlowRunId: context.reactionPlanId,
    projectId: action.projectId,
    priorContextNeeded: true,
    // the run records the agent's COMPUTED decision, not a fixed string
    actionSummary: decision.actionSummary,
    evidenceRefs: [action.triggerEventId],
    learned: decision.learned,
  };
}
