/**
 * Org cadence composition (A0) — wires the proven cycles (Work OS, memory
 * maintenance, change control) as concurrent CadenceLanes driven on their own
 * intervals, exactly like the keep-alive loop. main.ts calls this once and stops
 * it after the work loop finishes, keeping the entrypoint thin (single
 * responsibility: lane wiring lives here, not in main).
 *
 * Each lane runs on a configurable interval; a slow lane never delays another
 * (independent loops), and a thrown/degraded tick is isolated by the driver.
 */

import {
  buildDefaultChangeControlPolicy,
  buildInternalOnlyPipeline,
  buildHatDefinitions,
  applyAutonomyPolicy,
  createCommandHandlerRegistry,
  createCommandPipeline,
  createHatAuthorityPort,
  createObserveLifecycleTransitionHandler,
  createScheduleBlockCommandAuthority,
  RunLifecyclePhase,
  RunScope,
  ObserveCommandType,
  type CommandResult,
  type ChangeControlPort,
  type ObserveLifecycleTransitionCommand,
  type ReleaseBatchEvaluation,
} from "../../../packages/application/src/index.ts";
import { AutonomyLevel, WorkItemState, type AutonomyPolicy, type ChangeSet } from "../../../packages/domain/src/index.ts";
import { createCommandAuthorizationPort, createPolicyDecisionObservationPort } from "../../../packages/policy/src/index.ts";
import {
  createCockroachOrgEventStore,
  createCockroachMemoryStateStore,
  createCockroachChangeSetStore,
  createCockroachWorkIntakeSource,
  createCockroachDocUnitStore,
  createCockroachRecoveryScanReader,
  createCockroachDurableStateAdapters,
  CockroachTableName,
} from "../../../packages/state-cockroach/src/index.ts";
import type { TelemetryPort } from "../../../packages/observability/src/index.ts";
import type { CockroachGenericSqlExecutor } from "../../../packages/state-cockroach/src/cockroach-sql-executor.ts";
import { runCadenceLane, type CadenceLane, type CadenceLaneObserver } from "./cadence-lane.ts";
import {
  createWorkOsCadenceLane,
  createObserveActWorkItemCadenceLane,
  createMemoryMaintenanceCadenceLane,
  createChangeControlCadenceLane,
  createReleaseQueueCadenceLane,
  createDocMaintenanceCadenceLane,
  createConformanceCadenceLane,
  createAbandonedRunBindingScanCadenceLane,
  createDeadLetterClassifierCadenceLane,
  createStaleReactionPlanScanCadenceLane,
  createStrandedScheduleScanCadenceLane,
  type ObserveActCommandRunner,
  type ObserveActMenuSelector,
  type ObserveActSlotAuthorizer,
  type ObserveActToolDispatcher,
  type ObserveActWorkItemSource,
  type WorkIntakeSource,
} from "./org-cadence-lanes.ts";

export type OrgCadenceIntervals = {
  workOsMs: number;
  memoryMaintenanceMs: number;
  changeControlMs: number;
  releaseQueueMs: number;
  docMaintenanceMs: number;
  conformanceMs: number;
  staleReactionPlanScanMs: number;
  strandedScheduleScanMs: number;
  abandonedRunBindingScanMs: number;
  deadLetterClassifierMs: number;
};

export const OrgCadenceIntervalDefault: OrgCadenceIntervals = {
  workOsMs: 60_000,
  memoryMaintenanceMs: 6 * 60 * 60 * 1000, // 6h (memory decay is slow)
  changeControlMs: 30_000,
  releaseQueueMs: 30_000,
  docMaintenanceMs: 6 * 60 * 60 * 1000, // 6h (doc lifecycle is slow, like memory)
  conformanceMs: 60_000,
  staleReactionPlanScanMs: 60_000,
  strandedScheduleScanMs: 60_000,
  abandonedRunBindingScanMs: 60_000,
  deadLetterClassifierMs: 60_000,
};

export type ComposeOrgCadenceInput = {
  executor: CockroachGenericSqlExecutor;
  organizationId: string;
  now: () => number;
  createId: (prefix: string) => string;
  intervals?: Partial<OrgCadenceIntervals>;
  /** sleep that wakes early when the cadence is stopped (the stop check is supplied) */
  sleep: (ms: number, isStopRequested: () => boolean) => Promise<void>;
  observer?: CadenceLaneObserver;
  /**
   * pending-work source for the Work OS lane. Defaults to the Cockroach intake source
   * (claims a `proposed` initiative → `active`, dequeue-once). Tests/proofs override it.
   */
  intake?: WorkIntakeSource;
  /**
   * live external review port (L0). When present, the change-control lane projects real
   * PRs/cards for `external` stages and pulls the decision; absent → internal-only.
   */
  externalPort?: ChangeControlPort;
  /**
   * the tenant's autonomy dial (C1). Applied to every change-control pipeline so WHICH stages
   * require a human is config, not hardcoded. Defaults to assisted (the QA sign-off stays human).
   */
  autonomy?: AutonomyPolicy;
  /**
   * real release gate for approved ChangeSets. If omitted, the release queue idles when empty
   * and degrades instead of applying approved work on metadata alone.
   */
  releaseBatchEvaluator?: (batch: readonly ChangeSet[]) => ReleaseBatchEvaluation;
  telemetry?: TelemetryPort;
  /**
   * Defaults to the legacy hardcoded Work OS loop. Shadow runs observe-act next
   * to legacy; primary replaces legacy with the universal observe.ts controller.
   */
  workOsDriver?: "legacy" | "observe-act" | "observe-act-shadow" | "observe-act-primary";
  observeActWorkItems?: ObserveActWorkItemSource;
  observeActRunCommand?: ObserveActCommandRunner;
  observeActDispatchTool?: ObserveActToolDispatcher;
  observeActSelectSlot?: ObserveActMenuSelector;
  observeActAuthorizeSlot?: ObserveActSlotAuthorizer;
  /** bound each lane for tests/proofs; unbounded in the worker */
  maxTicksPerLane?: number;
};

export type OrgCadenceHandle = {
  stop: () => void;
  done: Promise<unknown>;
};

const unavailableObserveActToolDispatcher: ObserveActToolDispatcher = async () => {
  throw new Error("observe-act tool dispatcher unavailable");
};

export function composeOrgCadenceLoops(input: ComposeOrgCadenceInput): OrgCadenceHandle {
  const intervals = { ...OrgCadenceIntervalDefault, ...input.intervals };
  const orgEvents = createCockroachOrgEventStore({ executor: input.executor });
  const memoryState = createCockroachMemoryStateStore({ executor: input.executor });
  const changeSets = createCockroachChangeSetStore({ executor: input.executor });
  const docUnits = createCockroachDocUnitStore({ executor: input.executor });
  const recoveryScanReader = createCockroachRecoveryScanReader({ executor: input.executor });
  const policy = buildDefaultChangeControlPolicy(input.organizationId);
  const appendEvent = (e: Parameters<typeof orgEvents.append>[0]) => orgEvents.append(e);

  // real intake by default: claim a `proposed` initiative from Cockroach (dequeue-once);
  // the worker idles only when nothing is proposed — no synthetic flood, no manual runner.
  const intake =
    input.intake ??
    createCockroachWorkIntakeSource({
      executor: input.executor,
      organizationId: input.organizationId,
      nowIso: () => new Date(input.now()).toISOString(),
    });
  const hats = buildHatDefinitions();
  const legacyWorkLane = createWorkOsCadenceLane({
    organizationId: input.organizationId, hats, now: input.now, createId: input.createId, appendEvent,
    intake,
  });
  const observeActWorkLane = createObserveActWorkItemCadenceLane({
    organizationId: input.organizationId,
    hats,
    now: input.now,
    createId: input.createId,
    source: input.observeActWorkItems ?? createCockroachObserveActWorkItemSource(input),
    runCommand: input.observeActRunCommand ?? createCockroachObserveActCommandRunner(input, hats),
    dispatchTool: input.observeActDispatchTool ?? unavailableObserveActToolDispatcher,
    ...createOptionalObserveActSlotAuthorizer(input),
    ...(input.observeActSelectSlot === undefined ? {} : { selectSlot: input.observeActSelectSlot }),
    appendEvent,
  });
  const workLanes = workLanesFor(input.workOsDriver ?? "legacy", legacyWorkLane, observeActWorkLane);
  const memory = createMemoryMaintenanceCadenceLane({
    organizationId: input.organizationId, now: input.now, createId: input.createId,
    reader: memoryState, writer: memoryState, appendEvent,
  });
  // the autonomy dial as config (C1): apply the tenant policy to every resolved pipeline
  const autonomy: AutonomyPolicy = input.autonomy ?? { level: AutonomyLevel.Assisted, humanGatedStageIds: ["human-qa-signoff"] };
  const changeControl = createChangeControlCadenceLane({
    organizationId: input.organizationId, now: input.now, createId: input.createId,
    reader: changeSets, writer: changeSets,
    pipelineFor: (cs) => applyAutonomyPolicy(policy.pipelines[cs.pipelineId] ?? buildInternalOnlyPipeline(input.organizationId), autonomy),
    appendEvent,
    ...(input.externalPort ? { externalPort: input.externalPort } : {}),
  });
  const releaseQueue = createReleaseQueueCadenceLane({
    organizationId: input.organizationId,
    now: input.now,
    createId: input.createId,
    reader: changeSets,
    writer: changeSets,
    appendEvent,
    ...(input.releaseBatchEvaluator ? { evaluateBatch: input.releaseBatchEvaluator } : {}),
    runAtomically: async (operation) => {
      await input.executor.executeTransaction(async (transaction) => {
        const txExecutor: CockroachGenericSqlExecutor = {
          execute: transaction.execute,
          executeTransaction: async (nestedOperation) => await nestedOperation(transaction),
        };
        const txChangeSets = createCockroachChangeSetStore({ executor: txExecutor });
        const txOrgEvents = createCockroachOrgEventStore({ executor: txExecutor });
        await operation({
          writer: txChangeSets,
          appendEvent: (event) => txOrgEvents.append(event),
        });
      });
    },
  });
  const docMaintenance = createDocMaintenanceCadenceLane({
    organizationId: input.organizationId, now: input.now, createId: input.createId,
    reader: docUnits, writer: docUnits, appendEvent,
  });
  const conformance = createConformanceCadenceLane({
    organizationId: input.organizationId,
    reader: orgEvents,
    limit: 1_000,
    ...(input.telemetry === undefined ? {} : { telemetry: input.telemetry }),
  });
  const staleReactionPlans = createStaleReactionPlanScanCadenceLane({
    organizationId: input.organizationId,
    now: input.now,
    createId: input.createId,
    reader: recoveryScanReader,
    appendEvent,
  });
  const strandedSchedules = createStrandedScheduleScanCadenceLane({
    organizationId: input.organizationId,
    now: input.now,
    createId: input.createId,
    reader: recoveryScanReader,
    appendEvent,
  });
  const abandonedRunBindings = createAbandonedRunBindingScanCadenceLane({
    organizationId: input.organizationId,
    now: input.now,
    createId: input.createId,
    reader: recoveryScanReader,
    appendEvent,
  });
  const deadLetters = createDeadLetterClassifierCadenceLane({
    organizationId: input.organizationId,
    now: input.now,
    createId: input.createId,
    reader: recoveryScanReader,
    appendEvent,
  });

  const stopped = { value: false };
  const isStopRequested = () => stopped.value;
  const start = (lane: CadenceLane, intervalMs: number): Promise<unknown> =>
    runCadenceLane({
      lane, intervalMs, isStopRequested,
      sleep: (ms) => input.sleep(ms, isStopRequested), // sleep + loop check share ONE stop flag
      ...(input.observer ? { observer: input.observer } : {}),
      ...(input.telemetry ? { telemetry: input.telemetry } : {}),
      ...(input.maxTicksPerLane !== undefined ? { maxTicks: input.maxTicksPerLane } : {}),
    });

  const done = Promise.all([
    ...workLanes.map((lane) => start(lane, intervals.workOsMs)),
    start(memory, intervals.memoryMaintenanceMs),
    start(changeControl, intervals.changeControlMs),
    start(releaseQueue, intervals.releaseQueueMs),
    start(docMaintenance, intervals.docMaintenanceMs),
    start(conformance, intervals.conformanceMs),
    start(staleReactionPlans, intervals.staleReactionPlanScanMs),
    start(strandedSchedules, intervals.strandedScheduleScanMs),
    start(abandonedRunBindings, intervals.abandonedRunBindingScanMs),
    start(deadLetters, intervals.deadLetterClassifierMs),
  ]);

  return { stop: () => { stopped.value = true; }, done };
}

function createOptionalObserveActSlotAuthorizer(
  input: ComposeOrgCadenceInput,
): { authorizeSlot?: ObserveActSlotAuthorizer } {
  if (input.observeActAuthorizeSlot !== undefined) return { authorizeSlot: input.observeActAuthorizeSlot };
  return { authorizeSlot: createCockroachObserveActSlotAuthorizer(input) };
}

function workLanesFor(
  driver: NonNullable<ComposeOrgCadenceInput["workOsDriver"]>,
  legacy: CadenceLane,
  observeAct: CadenceLane,
): readonly CadenceLane[] {
  switch (driver) {
    case "legacy":
      return [legacy];
    case "observe-act-shadow":
      return [legacy, observeAct];
    case "observe-act":
    case "observe-act-primary":
      return [observeAct];
  }
}

type ObserveActWorkItemRow = {
  work_item_id: string;
  project_id: string;
  state: string;
  version: string | number;
  created_by_agent_id: string;
  created_by_hat_assignment_id: string;
};

function createCockroachObserveActWorkItemSource(
  input: Pick<ComposeOrgCadenceInput, "executor" | "organizationId" | "now">,
): ObserveActWorkItemSource {
  const stateAdapters = createCockroachDurableStateAdapters<CommandResult>({ executor: input.executor });
  return async () => {
    const result = await input.executor.execute<ObserveActWorkItemRow>({
      name: "claimable_observe_act_work_item",
      sql: `
        SELECT work_item_id, project_id, state, version, created_by_agent_id, created_by_hat_assignment_id
        FROM ${CockroachTableName.WorkItems}
        WHERE organization_id = $1
          AND state IN ($2, $3, $4, $5)
        ORDER BY updated_at ASC, created_at ASC
        LIMIT 1
      `.trim(),
      parameters: [
        input.organizationId,
        WorkItemState.Ready,
        WorkItemState.InProgress,
        WorkItemState.Review,
        WorkItemState.Blocked,
      ],
    });
    const row = result.rows[0];
    if (row === undefined) return null;
    const phase = observeActPhaseForWorkItemState(row.state);
    if (phase === undefined) return null;
    const evaluatedAt = new Date(input.now()).toISOString();
    const scheduleBlocks = await stateAdapters.workScheduleBlockAuthorityReader.findAuthorizingScheduleBlocks({
      agentId: row.created_by_agent_id,
      hatAssignmentId: row.created_by_hat_assignment_id,
      evaluatedAt,
    });
    return {
      runId: String(row.version),
      projectId: row.project_id,
      workItemId: row.work_item_id,
      scope: RunScope.WorkItem,
      phase,
      hasGateApproval: row.state === WorkItemState.Ready,
      hasEvidence: row.state === WorkItemState.InProgress || row.state === WorkItemState.Review,
      hatId: "release_operator",
      hatAssignmentId: row.created_by_hat_assignment_id,
      agentId: row.created_by_agent_id,
      scheduleBlocks,
    };
  };
}

function observeActPhaseForWorkItemState(state: string): RunLifecyclePhase | undefined {
  switch (state) {
    case WorkItemState.Ready:
      return RunLifecyclePhase.AwaitingGate;
    case WorkItemState.InProgress:
      return RunLifecyclePhase.AwaitingEvidence;
    case WorkItemState.Review:
      return RunLifecyclePhase.AwaitingReview;
    case WorkItemState.Blocked:
      return RunLifecyclePhase.Blocked;
    default:
      return undefined;
  }
}

function createCockroachObserveActCommandRunner(
  input: Pick<ComposeOrgCadenceInput, "executor" | "createId" | "now">,
  hats: readonly ReturnType<typeof buildHatDefinitions>[number][],
): ObserveActCommandRunner {
  const stateAdapters = createCockroachDurableStateAdapters<CommandResult>({ executor: input.executor });
  const pipeline = createCommandPipeline<ObserveLifecycleTransitionCommand>({
    stateStoreFactory: stateAdapters.commandStateStoreFactory,
    commandAuthorizationPort: createCommandAuthorizationPort({
      hatAuthorityPort: createHatAuthorityPort({
        hatAssignmentAuthorityReader: stateAdapters.hatAssignmentAuthorityReader,
        hatDefinitions: hats,
        createId: input.createId,
      }),
    }),
    policyDecisionObservationPort: createPolicyDecisionObservationPort({
      store: stateAdapters.policyDecisionObservationStore,
    }),
    commandScheduleAuthorityPort: createScheduleBlockCommandAuthority({
      scheduleBlockReader: stateAdapters.workScheduleBlockAuthorityReader,
    }),
    handlerRegistry: createCommandHandlerRegistry<ObserveLifecycleTransitionCommand, CommandResult>([
      createObserveLifecycleTransitionHandler(),
    ]),
    workAnchorStateReader: stateAdapters.workAnchorStateStore,
    now: () => new Date(input.now()).toISOString(),
    createId: input.createId,
  });
  return async (commandType, command) => {
    if (commandType !== ObserveCommandType.LifecycleTransition) {
      return { status: "unsupported_command_type", commandType };
    }
    return await pipeline.execute(command as ObserveLifecycleTransitionCommand);
  };
}

function createCockroachObserveActSlotAuthorizer(
  input: Pick<ComposeOrgCadenceInput, "executor" | "now">,
): ObserveActSlotAuthorizer {
  const stateAdapters = createCockroachDurableStateAdapters<CommandResult>({ executor: input.executor });
  const authority = createScheduleBlockCommandAuthority({
    scheduleBlockReader: stateAdapters.workScheduleBlockAuthorityReader,
  });
  return async ({ organizationId, work, slot, evaluatedAt }) => {
    if (slot.impl?.kind !== "command") {
      return { status: "allowed" };
    }
    const decision = await authority.authorizeCommandSchedule({
      commandId: `observe-act-slot-${work.runId}-${slot.index}`,
      commandType: slot.impl.commandType,
      actor: {
        agentId: work.agentId,
        hatAssignmentId: work.hatAssignmentId,
      },
      scope: {
        organizationId,
        projectId: work.projectId,
        workItemId: work.workItemId,
      },
      evaluatedAt,
    });
    return decision.status === "denied"
      ? { status: "denied", reason: decision.reason, message: decision.message }
      : { status: "allowed" };
  };
}
