import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";

import {
  ChangeSetPhase,
  ExternalSystem,
  OrgEventKind,
  ReactionPlanStatus,
  ScheduleBlockState,
  WorkItemState,
  MemoryPhase,
  MemoryTier,
  type ChangeSet,
  type MemoryEnvelope,
  type OrgEvent,
  type ProjectionRef,
} from "../../../packages/domain/src/index.ts";
import { buildHatDefinitions, buildInternalOnlyPipeline, buildGitHubGatedPipeline, ExternalDecision, type ChangeControlPort } from "../../../packages/application/src/index.ts";
import {
  createWorkOsCadenceLane,
  createMemoryMaintenanceCadenceLane,
  createChangeControlCadenceLane,
  createConformanceCadenceLane,
  createAbandonedRunBindingScanCadenceLane,
  createDeadLetterClassifierCadenceLane,
  createStaleReactionPlanScanCadenceLane,
  createStrandedScheduleScanCadenceLane,
} from "../src/org-cadence-lanes.ts";

const NOW = Date.parse("2026-05-30T00:00:00Z");
let seq = 0;
const createId = (p: string) => `${p}-${++seq}`;

const someIntake = async () => ({ projectId: "proj-1", initiativeId: "init-1", initiativeBranch: "feat/auto" });

test("work-os lane drives one living-loop cycle and reports the final state", async () => {
  const events: OrgEvent[] = [];
  const lane = createWorkOsCadenceLane({ organizationId: "org-lfg", hats: buildHatDefinitions(), now: () => NOW, createId, intake: someIntake, appendEvent: async (e) => { events.push(e); } });
  const result = await lane.runOnce();
  equal(result.failures.length, 0);
  ok(result.status.startsWith("work-os:"));
  ok(events.length > 0, "the living loop emitted org_events");
});

test("work-os lane stays IDLE (no cycle, no events) when intake returns null", async () => {
  const events: OrgEvent[] = [];
  const lane = createWorkOsCadenceLane({ organizationId: "org-lfg", hats: buildHatDefinitions(), now: () => NOW, createId, intake: async () => null, appendEvent: async (e) => { events.push(e); } });
  const result = await lane.runOnce();
  equal(result.status, "work-os:idle");
  equal(result.failures.length, 0);
  equal(events.length, 0, "an idle tick emits no org_events (no synthetic flood)");
});

test("work-os lane CATCHES errors into failures (never throws)", async () => {
  const lane = createWorkOsCadenceLane({ organizationId: "org-lfg", hats: buildHatDefinitions(), now: () => NOW, createId, intake: someIntake, appendEvent: async () => { throw new Error("sink down"); } });
  const result = await lane.runOnce();
  equal(result.status, "degraded");
  ok(result.failures[0]!.message.includes("work-os lane"));
});

function memEnvelope(memoryId: string, phase: MemoryPhase, freshnessAt: string, confidence: number): MemoryEnvelope {
  return {
    memoryId, organizationId: "org-lfg", tier: MemoryTier.Work, scope: "work-1", key: "k", protected: false, writtenBy: "system", writtenAt: "2026-05-30T00:00:00Z",
    state: { memoryId, organizationId: "org-lfg", phase, confidence, weight: 0.5, freshnessAt, reinforcementCount: 1, outcome: { successCount: 8, failureCount: 0, inconclusiveCount: 0, workItemsObserved: [] }, utility: { injectedCount: 6, citedCount: 5 }, crossScope: { distinctScopes: [], firstObservedAt: "2026-05-30T00:00:00Z", lastObservedAt: "2026-05-30T00:00:00Z" } },
  };
}

test("memory-maintenance lane recomputes + persists updates + emits the cycle event", async () => {
  const aged = memEnvelope("m-old", MemoryPhase.Active, new Date(NOW - 90 * 86_400_000).toISOString(), 0.2);
  aged.state.outcome = { successCount: 0, failureCount: 6, inconclusiveCount: 0, workItemsObserved: [] };
  aged.state.utility = { injectedCount: 12, citedCount: 0 };
  const upserts: string[] = [];
  const events: OrgEvent[] = [];
  const lane = createMemoryMaintenanceCadenceLane({
    organizationId: "org-lfg", now: () => NOW, createId,
    reader: { listAll: async () => [aged] },
    writer: { upsert: async (r) => { upserts.push(r.memoryId); } },
    appendEvent: async (e) => { events.push(e); },
  });
  const result = await lane.runOnce();
  equal(result.failures.length, 0);
  ok(result.status.includes("recomputed"));
  ok(upserts.includes("m-old"));
  ok(events.some((e) => e.kind === "memory_maintenance_cycle"));
});

function changeSet(phase: ChangeSetPhase, currentStageIndex: number, revision = 2): ChangeSet {
  return { changeSetId: "cs-1", organizationId: "org-lfg", workItemId: "work-1", proposerHatId: "code_author", title: "t", targetRef: "feat/x", phase, pipelineId: "internal-only", currentStageIndex, artifacts: [{ kind: "code_diff", path: "a.ts", diff: "+x", language: "ts" }], projections: [], revision, openedAt: "2026-05-30T00:00:00Z", updatedAt: "2026-05-30T00:00:00Z" };
}

test("change-control lane advances an in_review ChangeSet one stage and persists it", async () => {
  const cs = changeSet(ChangeSetPhase.InReview, 0);
  const upserts: ChangeSet[] = [];
  const events: OrgEvent[] = [];
  const lane = createChangeControlCadenceLane({
    organizationId: "org-lfg", now: () => NOW, createId,
    reader: { listByOrgPhase: async (_o, phase) => (phase === ChangeSetPhase.InReview ? [cs] : []) },
    writer: { upsert: async (c) => { upserts.push(c); } },
    pipelineFor: () => buildInternalOnlyPipeline("org-lfg"),
    appendEvent: async (e) => { events.push(e); },
  });
  const result = await lane.runOnce();
  equal(result.failures.length, 0);
  ok(result.status.includes("advanced"));
  ok(upserts.length > 0);
  ok(events.some((e) => e.kind === "review_stage_advanced" || e.kind === "stage_approved"));
});

test("change-control lane drives an EXTERNAL stage through the live port (projects once + pulls the decision)", async () => {
  const pipeline = buildGitHubGatedPipeline("org-lfg");
  const externalIndex = pipeline.stages.findIndex((s) => s.authority.kind === "external");
  const cs: ChangeSet = { ...changeSet(ChangeSetPhase.InReview, externalIndex), pipelineId: pipeline.pipelineId };

  let projects = 0;
  let pulls = 0;
  const ref: ProjectionRef = { system: ExternalSystem.GitHub, externalId: "99", url: "https://github.com/o/r/pull/99", lastSyncedState: "open", syncedAt: "2026-05-30T00:00:00Z" };
  const externalPort: ChangeControlPort = {
    system: ExternalSystem.GitHub,
    project: async () => { projects += 1; return ref; },
    pull: async () => { pulls += 1; return { decision: ExternalDecision.Approved, merged: false, detail: "approved" }; },
    push: async () => {},
    merge: async () => {},
  };

  const upserts: ChangeSet[] = [];
  const lane = createChangeControlCadenceLane({
    organizationId: "org-lfg", now: () => NOW, createId,
    reader: { listByOrgPhase: async (_o, phase) => (phase === ChangeSetPhase.InReview ? [cs] : []) },
    writer: { upsert: async (c) => { upserts.push(c); } },
    pipelineFor: () => pipeline,
    appendEvent: async () => {},
    externalPort,
  });
  const result = await lane.runOnce();

  equal(result.failures.length, 0);
  equal(projects, 1, "the live port projected a real PR for the external stage");
  ok(pulls >= 1, "the external decision was PULLED from the port, not auto-approved");
  ok(upserts.some((c) => c.projections.some((p) => p.externalId === "99")), "the projection ref was persisted onto the ChangeSet");
});

test("change-control lane is a no-op (0 advanced) when nothing is in review", async () => {
  const lane = createChangeControlCadenceLane({
    organizationId: "org-lfg", now: () => NOW, createId,
    reader: { listByOrgPhase: async () => [] },
    writer: { upsert: async () => {} },
    pipelineFor: () => buildInternalOnlyPipeline("org-lfg"),
    appendEvent: async () => {},
  });
  const result = await lane.runOnce();
  equal(result.status, "change-control:0advanced");
});

test("doc-maintenance lane flags a stale unit + persists it + emits the cycle event", async () => {
  const { createDocMaintenanceCadenceLane } = await import("../src/org-cadence-lanes.ts");
  const { DocType, DocScopeKind, DocLifecycleState } = await import("../../../packages/domain/src/index.ts");
  const aged = {
    docUnitId: "du-old", organizationId: "org-lfg", sourceId: "s", type: DocType.Runbook, scopeKind: DocScopeKind.Department,
    scopeId: "eng", title: "Old runbook", summary: "", contentRef: "r", contentHash: "h", status: DocLifecycleState.Active,
    freshnessAt: new Date(NOW - 200 * 86_400_000).toISOString(), boundHatIds: [], boundStageIds: [],
    createdAt: new Date(NOW - 200 * 86_400_000).toISOString(), updatedAt: new Date(NOW - 200 * 86_400_000).toISOString(), version: 1,
  };
  const upserts: string[] = [];
  const events: OrgEvent[] = [];
  const lane = createDocMaintenanceCadenceLane({
    organizationId: "org-lfg", now: () => NOW, createId,
    reader: { listByOrgStatus: async (_o: string, status: string) => (status === DocLifecycleState.Active ? [aged] : []) },
    writer: { upsert: async (d: { docUnitId: string }) => { upserts.push(d.docUnitId); } },
    appendEvent: async (e: OrgEvent) => { events.push(e); },
  });
  const result = await lane.runOnce();
  equal(result.failures.length, 0);
  ok(result.status.includes("stale"));
  ok(upserts.includes("du-old"));
  ok(events.some((e) => e.kind === "doc_maintenance_cycle"));
});

function orgEvent(over: Partial<OrgEvent> = {}): OrgEvent {
  return {
    id: "evt-1",
    kind: OrgEventKind.WorkItemTransition,
    occurredAt: "2026-05-30T00:00:00.000Z",
    organizationId: "org-lfg",
    subjectId: "work-1",
    fromState: WorkItemState.Created,
    toState: WorkItemState.Intake,
    decision: "created to intake",
    supervisorChain: [],
    evidenceRefs: [],
    correlationId: "corr-1",
    causationId: "cause-1",
    traceId: "trace-1",
    ...over,
  };
}

test("conformance lane replays org_events and reports a clean theorem tick", async () => {
  const lane = createConformanceCadenceLane({
    organizationId: "org-lfg",
    limit: 100,
    reader: { listByOrganization: async () => [orgEvent()] },
  });

  const result = await lane.runOnce();

  equal(result.failures.length, 0);
  equal(result.status, "conformance:1checked/0violations/0skipped");
});

test("conformance lane degrades when replay finds an illegal durable transition", async () => {
  const lane = createConformanceCadenceLane({
    organizationId: "org-lfg",
    limit: 100,
    reader: { listByOrganization: async () => [orgEvent({ id: "evt-bypass", fromState: WorkItemState.Created, toState: WorkItemState.Done })] },
  });

  const result = await lane.runOnce();

  equal(result.status, "degraded");
  equal(result.failures.length, 1);
  ok(result.failures[0]!.message.includes("evt-bypass"));
});

test("stale-reaction-plan scan lane emits incident and completion events", async () => {
  const events: OrgEvent[] = [];
  const lane = createStaleReactionPlanScanCadenceLane({
    organizationId: "org-lfg",
    now: () => NOW,
    createId,
    staleAfterMs: 60_000,
    reader: {
      listStaleReactionPlanCandidates: async () => [
        {
          reactionPlanId: "rp-expired",
          organizationId: "org-lfg",
          status: ReactionPlanStatus.Claimed,
          createdAt: "2026-05-29T23:00:00.000Z",
          claimExpiresAt: "2026-05-29T23:59:00.000Z",
          attemptCount: 1,
        },
      ],
    },
    appendEvent: async (event) => {
      events.push(event);
    },
  });

  const result = await lane.runOnce();

  equal(result.failures.length, 0);
  equal(result.status, "stale-reaction-plan-scan:1incidents");
  deepEqual(events.map((event) => event.kind), [
    OrgEventKind.RecoveryIncidentDetected,
    OrgEventKind.RecoveryScanCompleted,
  ]);
  equal(events[0]?.subjectId, "rp-expired");
});

test("recovery scan lanes fail open on transient reader errors", async () => {
  const lane = createStrandedScheduleScanCadenceLane({
    organizationId: "org-lfg",
    now: () => NOW,
    createId,
    graceMs: 60_000,
    reader: {
      listStrandedScheduleCandidates: async () => {
        throw new Error("cockroach timeout");
      },
    },
    appendEvent: async () => {},
  });

  const result = await lane.runOnce();

  equal(result.status, "degraded");
  equal(result.failures.length, 1);
  ok(result.failures[0]!.message.includes("stranded-schedule-scan lane"));
});

test("stranded-schedule scan lane reports ended capacity holds", async () => {
  const events: OrgEvent[] = [];
  const lane = createStrandedScheduleScanCadenceLane({
    organizationId: "org-lfg",
    now: () => NOW,
    createId,
    graceMs: 60_000,
    reader: {
      listStrandedScheduleCandidates: async () => [
        {
          workScheduleBlockId: "sched-1",
          organizationId: "org-lfg",
          workItemId: "work-1",
          assignedAgentId: "agent-1",
          assignedHatAssignmentId: "hat-1",
          state: ScheduleBlockState.Scheduled,
          startsAt: "2026-05-29T22:00:00.000Z",
          endsAt: "2026-05-29T23:00:00.000Z",
        },
      ],
    },
    appendEvent: async (event) => {
      events.push(event);
    },
  });

  const result = await lane.runOnce();

  equal(result.status, "stranded-schedule-scan:1incidents");
  equal(events.filter((event) => event.kind === OrgEventKind.RecoveryIncidentDetected).length, 1);
  equal(events.at(-1)?.kind, OrgEventKind.RecoveryScanCompleted);
});

test("abandoned-run-binding scan lane reports stale running Hermes runs", async () => {
  const events: OrgEvent[] = [];
  const lane = createAbandonedRunBindingScanCadenceLane({
    organizationId: "org-lfg",
    now: () => NOW,
    createId,
    heartbeatDeadlineMs: 60_000,
    reader: {
      listAbandonedRunBindingCandidates: async () => [
        {
          runId: "run-1",
          workItemId: "work-1",
          agentId: "agent-1",
          sessionId: "session-1",
          hatAssignmentId: "hat-1",
          promptFlowRunId: "prompt-1",
          state: "running",
          lastHeartbeatMs: NOW - 61_000,
        },
      ],
    },
    appendEvent: async (event) => {
      events.push(event);
    },
  });

  const result = await lane.runOnce();

  equal(result.status, "abandoned-run-binding-scan:1incidents");
  equal(events[0]?.subjectId, "run-1");
  equal(events.at(-1)?.kind, OrgEventKind.RecoveryScanCompleted);
});

test("dead-letter classifier lane reports terminal reaction-plan failures", async () => {
  const events: OrgEvent[] = [];
  const lane = createDeadLetterClassifierCadenceLane({
    organizationId: "org-lfg",
    now: () => NOW,
    createId,
    reader: {
      listDeadLetterCandidates: async () => [
        {
          deadLetterId: "rp-failed",
          organizationId: "org-lfg",
          createdAt: "2026-05-29T22:00:00.000Z",
          failedAt: "2026-05-29T23:00:00.000Z",
          failureMessage: "invalid durable reaction plan action",
          retryable: false,
          attemptCount: 1,
        },
      ],
    },
    appendEvent: async (event) => {
      events.push(event);
    },
  });

  const result = await lane.runOnce();

  equal(result.status, "dead-letter-classifier:1incidents");
  equal(events[0]?.subjectId, "rp-failed");
  ok(events[0]?.evidenceRefs.includes("classification:poison-payload"));
  equal(events.at(-1)?.kind, OrgEventKind.RecoveryScanCompleted);
});
