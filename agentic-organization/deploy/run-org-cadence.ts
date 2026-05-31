/**
 * Prove TRACK A (Activate) in kind: the SAME cadence composition the always-on
 * worker drives (composeOrgCadenceLoops) advances real Cockroach state — the Work
 * OS living loop, the memory maintenance cycle, and change-control review — bounded
 * to a few ticks per lane. This is exactly what the deployed worker now runs on its
 * own cadences (A0 wired it into apps/workers/src/main.ts); here we run it bounded so
 * the effect is observable without waiting on the worker's intervals.
 *
 *   kubectl -n agentic-org port-forward svc/cockroach 26257:26257 &
 *   COCKROACH_DATABASE_URL=postgresql://root@localhost:26257/defaultdb?sslmode=disable \
 *     node --experimental-strip-types deploy/run-org-cadence.ts
 */

import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { env } from "node:process";

import { ChangeSetPhase, MemoryPhase, MemoryTier, ToolBundle, type ChangeSet, type MemoryRecord, type MemoryState } from "../packages/domain/src/index.ts";
import {
  ActionClass,
  PromptFlowGateKind,
  PromptFlowRunState,
  buildInternalOnlyPipeline,
  compilePromptFlowTasks,
  createContentAddressedEvidenceRef,
  createReputationOutcomeOrgEvent,
  materializeRmoCandidateReputation,
  projectReputationReadModelFromOrgEvents,
  rankRmoHatCandidates,
  selectRmoCandidateWithExploration,
  ReputationOutcomeClass,
  ReputationRiskTier,
  RunLifecyclePhase,
  RunScope,
} from "../packages/application/src/index.ts";
import {
  createCockroachCoreStateMigrations,
  createCockroachSqlExecutor,
  createCockroachMemoryStateStore,
  createCockroachChangeSetStore,
  createCockroachOrgEventStore,
  splitSqlStatements,
} from "../packages/state-cockroach/src/index.ts";
import { composeOrgCadenceLoops } from "../apps/workers/src/org-cadence-composition.ts";
import type { CockroachSqlClient } from "../packages/state-cockroach/src/cockroach-sql-executor.ts";

const connectionString = env.COCKROACH_DATABASE_URL ?? "postgresql://root@localhost:26257/defaultdb?sslmode=disable";
const ORG = "org-lfg";
const NOW = Date.now();
const NOW_ISO = new Date(NOW).toISOString();
const id = (p: string) => `${p}-${randomUUID()}`;

async function main(): Promise<void> {
  const pool = new Pool({ connectionString });
  const client: CockroachSqlClient = { query: async (sql, p) => ({ rows: (await pool.query(sql, p as unknown[])).rows }), transaction: async (op) => op(client) };
  const executor = createCockroachSqlExecutor({ client });
  for (const migration of createCockroachCoreStateMigrations()) {
    for (const s of splitSqlStatements(migration.sql)) await pool.query(s);
  }
  const orgEventStore = createCockroachOrgEventStore({ executor });

  // seed: an aged+useless memory (the maintenance lane should archive it) + an in_review ChangeSet
  const memId = id("mem-cadence");
  const at = NOW_ISO;
  const memRecord: MemoryRecord = { memoryId: memId, organizationId: ORG, tier: MemoryTier.Work, scope: "work-cadence", key: "old-note", value: "", protected: false, writtenBy: "system", writtenAt: at };
  const memState: MemoryState = { memoryId: memId, organizationId: ORG, phase: MemoryPhase.Active, confidence: 0.2, weight: 0.1, freshnessAt: new Date(NOW - 120 * 86_400_000).toISOString(), reinforcementCount: 1, outcome: { successCount: 0, failureCount: 5, inconclusiveCount: 0, workItemsObserved: [] }, utility: { injectedCount: 12, citedCount: 0 }, crossScope: { distinctScopes: [], firstObservedAt: at, lastObservedAt: at } };
  await createCockroachMemoryStateStore({ executor }).upsert(memRecord, memState);

  const csId = id("cs-cadence");
  const cs: ChangeSet = { changeSetId: csId, organizationId: ORG, workItemId: id("work"), proposerHatId: "code_author", title: "Cadence-driven change", targetRef: "feat/cadence", phase: ChangeSetPhase.InReview, pipelineId: buildInternalOnlyPipeline(ORG).pipelineId, currentStageIndex: 0, artifacts: [{ kind: "code_diff", path: "a.ts", diff: "+x", language: "ts" }], projections: [], revision: 2, openedAt: at, updatedAt: at };
  await createCockroachChangeSetStore({ executor }).upsert(cs);
  const reputationObservations = [
    reputationObservation("agent-observe-act", ReputationOutcomeClass.Quality, { kind: "binary" as const, success: true }, "evidence:agent-observe-act:quality-pass"),
    reputationObservation("agent-observe-act", ReputationOutcomeClass.Collaboration, { kind: "binary" as const, success: true }, "evidence:agent-observe-act:collaboration-pass"),
    reputationObservation("agent-explorer", ReputationOutcomeClass.Quality, { kind: "binary" as const, success: true }, "evidence:agent-explorer:quality-pass"),
    reputationObservation("agent-regressed", ReputationOutcomeClass.Quality, { kind: "binary" as const, success: false }, "evidence:agent-regressed:quality-fail"),
    reputationObservation("agent-regressed", ReputationOutcomeClass.Quality, { kind: "binary" as const, success: false }, "evidence:agent-regressed:quality-fail-2"),
  ];
  for (const [index, observation] of reputationObservations.entries()) {
    await orgEventStore.append(createReputationOutcomeOrgEvent({
      eventId: id(`evt-reputation-cadence-${index}`),
      observedAt: at,
      organizationId: ORG,
      observation,
      correlationId: "corr-reputation-cadence",
      causationId: "cause-reputation-cadence",
      traceId: "trace-reputation-cadence",
    }));
  }
  const seededEvents = await orgEventStore.listByOrganization(ORG, 200);
  const seededReputationEvents = seededEvents.filter((e) => e.kind === "reputation_outcome_observed");
  if (seededReputationEvents.length < reputationObservations.length) {
    throw new Error(`expected ${reputationObservations.length} durable reputation observations, found ${seededReputationEvents.length}`);
  }
  const reputationReadModel = projectReputationReadModelFromOrgEvents({ events: seededReputationEvents });
  const reputationRanked = rankRmoHatCandidates({
    hatId: "backend_implementer",
    candidates: ["agent-observe-act", "agent-explorer", "agent-regressed"].map((agentId) =>
      materializeRmoCandidateReputation({
        readModel: reputationReadModel,
        organizationId: ORG,
        agentId,
        hatId: "backend_implementer",
        workType: "code_change",
        currentLoad: 0,
        consecutiveAssignmentCount: agentId === "agent-observe-act" ? 4 : 0,
        recentSameHatAssignments: agentId === "agent-observe-act" ? 4 : 0,
      })),
  });
  const reputationSelection = selectRmoCandidateWithExploration({
    rankedCandidates: reputationRanked,
    riskTier: ReputationRiskTier.Normal,
    explorationSeed: "kind-reputation-proof",
    explorationRate: 1,
  });
  if (reputationSelection.outcome !== "selected") {
    throw new Error(`expected reputation-backed RMO selection, got ${reputationSelection.reason}`);
  }
  if (!reputationRanked.some((candidate) => candidate.reasonCodes.includes("posterior_reputation_evidence"))) {
    throw new Error("expected RMO candidates to carry posterior reputation evidence");
  }
  const testEvidenceRef = createContentAddressedEvidenceRef("test-result", { proof: "org-cadence", status: "green" });
  const diffEvidenceRef = createContentAddressedEvidenceRef("diff", { proof: "org-cadence", status: "reviewable" });
  const contextEvidenceRef = createContentAddressedEvidenceRef("context", { proof: "org-cadence", status: "loaded" });
  const promptFlowTasks = compilePromptFlowTasks({
    definitions: [{
      promptFlowId: "flow-backend-code-change",
      version: "1.0.0",
      name: "Backend code-change flow",
      ownerDepartmentId: "engineering",
      allowedHatIds: ["backend_implementer"],
      requiredScope: RunScope.WorkItem,
      reviewerHatIds: ["code_reviewer"],
      rollbackPolicy: { kind: "compensating_action", description: "revert patch and release claim" },
      phases: [
        {
          phaseId: "context",
          label: "Load backend context",
          actionClass: ActionClass.WriteDoc,
          permittedUniversalActions: ["load_context"],
          directions: ["Load work item", "Load initiative constraints"],
          requiredToolBundles: [ToolBundle.Task],
          toolInjections: [{ tool: "repo.search", args: { workItemId: "work-observe-act" } }],
          contextArtifactRefs: ["work:work-observe-act", "decision:observe-act"],
          requiredEvidenceRefs: [contextEvidenceRef],
          gate: { kind: PromptFlowGateKind.Evidence, requiredEvidenceRefs: [contextEvidenceRef] },
          timeoutSeconds: 300,
          retryLimit: 1,
          metrics: [{ id: "prompt_flow.context_artifacts", label: "context artifacts", value: 2, unit: "count" }],
        },
        {
          phaseId: "execute",
          label: "Execute backend change",
          actionClass: ActionClass.WriteCode,
          permittedUniversalActions: ["execute", "submit_evidence"],
          directions: ["Patch the smallest surface", "Run focused tests"],
          requiredToolBundles: [ToolBundle.Delivery],
          toolInjections: [{ tool: "repo.patch", args: { workItemId: "work-observe-act" } }],
          contextArtifactRefs: ["work:work-observe-act", "decision:observe-act"],
          requiredEvidenceRefs: [testEvidenceRef, diffEvidenceRef],
          gate: { kind: PromptFlowGateKind.Evidence, requiredEvidenceRefs: [testEvidenceRef, diffEvidenceRef] },
          timeoutSeconds: 900,
          retryLimit: 2,
          metrics: [{ id: "prompt_flow.required_evidence", label: "required evidence", value: 2, unit: "count" }],
        },
      ],
    }],
    runs: [{
      runId: "prompt-flow-run-observe-act",
      promptFlowId: "flow-backend-code-change",
      definitionVersion: "1.0.0",
      workItemId: "work-observe-act",
      scope: RunScope.WorkItem,
      currentPhaseId: "context",
      state: PromptFlowRunState.RunningPhase,
      priority: 100,
    }],
  });

  // run the SAME composition the worker drives, bounded to a few ticks per lane
  const laneTicks: { lane: string; tick: number; status: string }[] = [];
  const cadence = composeOrgCadenceLoops({
    executor, organizationId: ORG, now: () => NOW, createId: id,
    intervals: { workOsMs: 0, memoryMaintenanceMs: 0, changeControlMs: 0, docMaintenanceMs: 0 },
    sleep: async () => {},
    // synthetic pending work so the Work OS lane exercises in this bounded proof
    intake: async () => ({ projectId: id("proj"), initiativeId: id("init"), initiativeBranch: "feat/cadence-auto" }),
    workOsDriver: "observe-act-shadow",
    observeActWorkItems: async () => ({
      runId: "1",
      projectId: "proj-observe-act",
      workItemId: "work-observe-act",
      scope: RunScope.WorkItem,
      phase: RunLifecyclePhase.AwaitingGate,
      hasGateApproval: true,
      hasEvidence: false,
      hatId: "backend_implementer",
      hatAssignmentId: "99",
      agentId: "agent-observe-act",
      promptFlowTasks,
    }),
    observeActSelectSlot: () => 8,
    observeActRunCommand: async () => ({ status: "shadow_accepted" }),
    observeActDispatchTool: async () => {
      throw new Error("org-cadence observe-act shadow proof should not dispatch MCP");
    },
    maxTicksPerLane: 3,
    observer: { record: (r) => laneTicks.push({ lane: r.lane, tick: r.tick, status: r.status }) },
  });
  await cadence.done;

  const memAfter = await createCockroachMemoryStateStore({ executor }).get(memId);
  const csAfter = await createCockroachChangeSetStore({ executor }).get(csId);
  const events = await orgEventStore.listByOrganization(ORG, 1000);
  const recent = events.filter((e) => e.kind.startsWith("work_item") || e.kind.startsWith("memory_") || e.kind.startsWith("change_set") || e.kind.startsWith("review_") || e.kind.startsWith("stage_"));
  const observeActEvents = events.filter((e) => e.kind === "observe_act_tick");
  const reputationEvents = events.filter((e) => e.kind === "reputation_outcome_observed");

  console.log(JSON.stringify({
    orgCadence: {
      laneTicks,
      observeActShadow: {
        ticked: laneTicks.some((tick) => tick.lane === "observe-act-work-item"),
        evidenceRows: observeActEvents.length,
        lastEvidenceRefs: observeActEvents[0]?.evidenceRefs ?? [],
        promptFlowEvidenceRows: observeActEvents.filter((e) => e.evidenceRefs.some((ref) => ref.startsWith("observe-act:prompt_flow:"))).length,
      },
      seededMemory: { memoryId: memId, phaseAfter: memAfter?.state.phase, weightAfter: memAfter?.state.weight, surfaces: memAfter?.state.phase !== MemoryPhase.Archived },
      seededChangeSet: { changeSetId: csId, phaseAfter: csAfter?.phase, revisionAfter: csAfter?.revision },
      reputation: {
        durableSeededEventRows: seededReputationEvents.length,
        finalWindowEventRows: reputationEvents.length,
        ranked: reputationRanked.map((candidate) => ({
          agentId: candidate.agentId,
          rank: candidate.rank,
          score: candidate.score,
          qualityMean: candidate.posterior?.quality.mean,
          qualityLcb: candidate.posterior?.quality.lowerConfidenceBound,
          uncertainty: candidate.posterior?.quality.uncertainty,
          reasons: candidate.reasonCodes,
        })),
        selection: reputationSelection.outcome === "selected"
          ? { agentId: reputationSelection.selected.agentId, reason: reputationSelection.reason }
          : { reason: reputationSelection.reason },
      },
      orgEventsObservedFromLanes: recent.length,
    },
  }, null, 2));
  await pool.end();
}

await main();

function reputationObservation(
  agentId: string,
  outcomeClass: ReputationOutcomeClass,
  signal: { kind: "binary"; success: boolean },
  evidenceRef: string,
) {
  return {
    organizationId: ORG,
    agentId,
    hatId: "backend_implementer",
    workType: "code_change",
    outcomeClass,
    observedAt: NOW_ISO,
    signal,
    evidenceRef,
  };
}
