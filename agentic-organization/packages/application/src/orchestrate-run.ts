/**
 * Orchestrate a work item through a Hermes run with memory attribution.
 *
 * This is where the deterministic CONTROL PLANE and the autonomous DATA PLANE
 * meet in one composition:
 *   - launch a Hermes run (the agent acts autonomously inside its sandbox)
 *   - recall scoped prior context if needed (Hindsight, attributed)
 *   - record what the agent did + retain what it learned (attributed, sticky)
 *   - complete the run with evidence
 * The run's heartbeat is what the deterministic keep-alive engine reads to decide
 * the agent is alive; a silent run is caught by keep-alive's staleness detection.
 * So determinism guarantees the agent is watched + kept moving, while the run
 * itself is autonomous. Pure composition over injected ports; Result-as-DU.
 */

import type { HermesRun, HermesRuntime, HermesRuntimeFeedbackReason } from "../../hermes/src/index.ts";
import type { Memory, MemoryAttribution, MemoryRecord } from "../../memory/src/index.ts";

/** Why an orchestrated run could not complete — preserves the Hermes reason DU. */
export type OrchestrationFeedbackReason = HermesRuntimeFeedbackReason;

export type WorkItemRunRequest = {
  workItemId: string;
  agentId: string;
  sessionId: string;
  hatAssignmentId: string;
  promptFlowRunId: string;
  projectId: string;
  /** whether the agent needs prior scoped context recalled before acting */
  priorContextNeeded: boolean;
  /** what the agent did (becomes the run outcome summary) */
  actionSummary: string;
  evidenceRefs: readonly string[];
  /** what the agent learned (retained as memory); empty string = nothing to retain */
  learned: string;
};

export type WorkItemRunDeps = {
  hermes: HermesRuntime;
  memory: Memory;
};

export type WorkItemRunResult =
  | {
      outcome: "ok";
      run: HermesRun;
      recalledCount: number;
      retained: MemoryRecord | undefined;
    }
  | { outcome: "feedback"; feedback: { reason: OrchestrationFeedbackReason; message: string } };

function attributionOf(request: WorkItemRunRequest): MemoryAttribution {
  return {
    agentId: request.agentId,
    hatAssignmentId: request.hatAssignmentId,
    projectId: request.projectId,
    workItemId: request.workItemId,
    promptFlowRunId: request.promptFlowRunId,
  };
}

export async function runWorkItemThroughHermes(
  request: WorkItemRunRequest,
  deps: WorkItemRunDeps,
): Promise<WorkItemRunResult> {
  // 1. launch the run (autonomous data plane)
  const launched = await deps.hermes.launchRun({
    workItemId: request.workItemId,
    agentId: request.agentId,
    sessionId: request.sessionId,
    hatAssignmentId: request.hatAssignmentId,
    promptFlowRunId: request.promptFlowRunId,
  });
  if (launched.outcome === "feedback") {
    return { outcome: "feedback", feedback: { reason: launched.feedback.reason, message: launched.feedback.message } };
  }

  const attribution = attributionOf(request);

  // 2. recall scoped prior context if the agent needs it
  let recalledCount = 0;
  if (request.priorContextNeeded) {
    const recalled = await deps.memory.recall(attribution);
    recalledCount = recalled.memories.length;
  }

  // 3. heartbeat the run (the agent is actively working — keep-alive sees this).
  // A heartbeat failure means the run vanished mid-flight; surface it rather than
  // proceed to retain/complete against a dead run (no silent Result swallow).
  const beat = await deps.hermes.heartbeat(launched.run.runId);
  if (beat.outcome === "feedback") {
    return { outcome: "feedback", feedback: { reason: beat.feedback.reason, message: beat.feedback.message } };
  }

  // 4. retain what was learned (attributed, sticky); skip if nothing learned
  let retained: MemoryRecord | undefined;
  if (request.learned.trim().length > 0) {
    const retainResult = await deps.memory.retain(attribution, request.learned);
    retained = retainResult.memory;
  }

  // 5. complete the run with evidence
  const completed = await deps.hermes.completeRun(launched.run.runId, {
    summary: request.actionSummary,
    evidenceRefs: request.evidenceRefs,
  });
  if (completed.outcome === "feedback") {
    return { outcome: "feedback", feedback: { reason: completed.feedback.reason, message: completed.feedback.message } };
  }

  return { outcome: "ok", run: completed.run, recalledCount, retained };
}
