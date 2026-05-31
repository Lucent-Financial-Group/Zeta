import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

import {
  ControlPlaneFlagKind,
  ControlPlaneScopeKind,
  RunLifecyclePhase,
  RunScope,
} from "../../../packages/application/src/index.ts";
import { RecordingTelemetry, TelemetryMetricKind } from "../../../packages/observability/src/index.ts";
import type { CockroachGenericSqlExecutor } from "../../../packages/state-cockroach/src/cockroach-sql-executor.ts";
import { composeOrgCadenceLoops } from "../src/org-cadence-composition.ts";
import type { CadenceLaneTickRecord } from "../src/cadence-lane.ts";

test("org cadence composition can disable legacy work-os and run the observe-act work-item lane", async () => {
  const records: CadenceLaneTickRecord[] = [];
  let observeActCommands = 0;
  let legacyIntakeCalls = 0;

  const handle = composeOrgCadenceLoops({
    executor: createEmptyCockroachExecutor(),
    organizationId: "org-lfg",
    now: () => Date.parse("2026-05-31T12:00:00.000Z"),
    createId: (prefix) => `${prefix}-composition-test`,
    sleep: async () => {},
    maxTicksPerLane: 1,
    observer: { record: (record) => records.push(record) },
    workOsDriver: "observe-act",
    intake: async () => {
      legacyIntakeCalls += 1;
      throw new Error("legacy work-os intake should be disabled");
    },
    observeActWorkItems: async () => ({
      runId: "1",
      projectId: "project-1",
      workItemId: "work-1",
      scope: RunScope.WorkItem,
      phase: RunLifecyclePhase.AwaitingGate,
      hasGateApproval: true,
      hasEvidence: false,
      hatId: "release_operator",
      hatAssignmentId: "99",
      agentId: "agent-release-1",
    }),
    observeActRunCommand: async () => {
      observeActCommands += 1;
      return { status: "accepted" };
    },
    observeActAuthorizeSlot: async () => ({ status: "allowed" }),
    observeActDispatchTool: async () => {
      throw new Error("observe-act composition test should not dispatch MCP");
    },
  });

  await handle.done;

  ok(records.some((record) => record.lane === "observe-act-work-item"));
  equal(records.some((record) => record.lane === "work-os"), false);
  equal(legacyIntakeCalls, 0);
  equal(observeActCommands, 1);
});

test("org cadence composition shadow mode runs observe-act beside legacy work-os", async () => {
  const records: CadenceLaneTickRecord[] = [];
  let observeActCommands = 0;
  let legacyIntakeCalls = 0;

  const handle = composeOrgCadenceLoops({
    executor: createEmptyCockroachExecutor(),
    organizationId: "org-lfg",
    now: () => Date.parse("2026-05-31T12:00:00.000Z"),
    createId: (prefix) => `${prefix}-composition-shadow-test`,
    sleep: async () => {},
    maxTicksPerLane: 1,
    observer: { record: (record) => records.push(record) },
    workOsDriver: "observe-act-shadow",
    intake: async () => {
      legacyIntakeCalls += 1;
      return null;
    },
    observeActWorkItems: async () => ({
      runId: "1",
      projectId: "project-1",
      workItemId: "work-1",
      scope: RunScope.WorkItem,
      phase: RunLifecyclePhase.AwaitingGate,
      hasGateApproval: true,
      hasEvidence: false,
      hatId: "release_operator",
      hatAssignmentId: "99",
      agentId: "agent-release-1",
    }),
    observeActRunCommand: async () => {
      observeActCommands += 1;
      return { status: "accepted" };
    },
    observeActAuthorizeSlot: async () => ({ status: "allowed" }),
    observeActDispatchTool: async () => {
      throw new Error("observe-act composition test should not dispatch MCP");
    },
  });

  await handle.done;

  ok(records.some((record) => record.lane === "work-os"));
  ok(records.some((record) => record.lane === "observe-act-work-item"));
  equal(legacyIntakeCalls, 1);
  equal(observeActCommands, 1);
});

test("org cadence composition passes telemetry through every composed lane", async () => {
  const telemetry = new RecordingTelemetry();
  const expectedLanes = [
    "work-os",
    "memory-maintenance",
    "change-control",
    "release-queue",
    "doc-maintenance",
    "conformance",
    "stale-reaction-plan-scan",
    "stranded-schedule-scan",
    "abandoned-run-binding-scan",
    "dead-letter-classifier",
  ];

  const handle = composeOrgCadenceLoops({
    executor: createEmptyCockroachExecutor(),
    organizationId: "org-lfg",
    now: () => Date.parse("2026-05-31T12:00:00.000Z"),
    createId: (prefix) => `${prefix}-telemetry-test`,
    sleep: async () => {},
    maxTicksPerLane: 1,
    telemetry,
  });

  await handle.done;

  equal(telemetry.spans.filter((span) => span.name === "org.lane.tick").length, expectedLanes.length);
  equal(telemetry.metrics.filter((metric) => metric.name === "org_lane_ticks_total").length, expectedLanes.length);
  for (const lane of expectedLanes) {
    ok(
      telemetry.spans.some((span) =>
        span.name === "org.lane.tick" &&
        span.ended &&
        span.attributes["agentic.lane"] === lane,
      ),
      `missing org.lane.tick span for ${lane}`,
    );
    ok(
      telemetry.metrics.some((metric) =>
        metric.kind === TelemetryMetricKind.Counter &&
        metric.name === "org_lane_ticks_total" &&
        metric.attributes?.["agentic.lane"] === lane,
      ),
      `missing org_lane_ticks_total metric for ${lane}`,
    );
  }
});

test("org cadence control-plane ESTOP blocks work lanes while control lanes keep ticking", async () => {
  const records: CadenceLaneTickRecord[] = [];
  let observeActCommands = 0;

  const handle = composeOrgCadenceLoops({
    executor: createEmptyCockroachExecutor(),
    organizationId: "org-lfg",
    now: () => Date.parse("2026-05-31T12:00:00.000Z"),
    createId: (prefix) => `${prefix}-control-plane-test`,
    sleep: async () => {},
    maxTicksPerLane: 1,
    observer: { record: (record) => records.push(record) },
    workOsDriver: "observe-act",
    controlPlane: {
      flags: [{
        controlPlaneFlagId: "flag-estop",
        organizationId: "org-lfg",
        scope: { kind: ControlPlaneScopeKind.Organization },
        flag: ControlPlaneFlagKind.Estop,
        reason: "operator estop",
        setByHatId: "incident_commander",
        setAt: "2026-05-31T11:59:00.000Z",
      }],
    },
    observeActWorkItems: async () => {
      throw new Error("observe-act source should not run under ESTOP");
    },
    observeActRunCommand: async () => {
      observeActCommands += 1;
      return { status: "accepted" };
    },
    observeActDispatchTool: async () => ({ status: "dispatched" }),
  });

  await handle.done;

  const observeAct = records.find((record) => record.lane === "observe-act-work-item");
  const conformance = records.find((record) => record.lane === "conformance");
  const staleScan = records.find((record) => record.lane === "stale-reaction-plan-scan");
  equal(observeAct?.status, "observe-act-work-item:control-plane-denied");
  equal(observeAct?.failureCount, 1);
  equal(conformance?.status.startsWith("conformance:"), true);
  equal(staleScan?.status.startsWith("stale-reaction-plan-scan:"), true);
  equal(observeActCommands, 0);
});

function createEmptyCockroachExecutor(): CockroachGenericSqlExecutor {
  return {
    execute: async () => ({ rows: [] }),
    executeTransaction: async (operation) =>
      await operation({
        execute: async () => ({ rows: [] }),
      }),
  };
}
