/**
 * corporate/ — the CORPORATE REGISTER, composed over the canonical observe algebra.
 *
 * ── WHY THIS IS A SEPARATE PACKAGE AND NOT PART OF THE CORE ──────────────────
 * `docs/DECISIONS/2026-05-31-observe-act-16-direction-universal-action-grammar-local-no-cloud-llm.md`
 * settles the architecture question this package would otherwise beg. The same `observe.ts` keystone
 * runs in **two workflow registers**:
 *
 *   | register              | what it is                          | governance                     |
 *   |-----------------------|-------------------------------------|--------------------------------|
 *   | agentic-organization  | the CORPORATE workflow              | PR-gated, static, no self-mod  |
 *   | Agora                 | the SOVEREIGN workflow / society    | the ≥3-agent constitution gate |
 *
 * and the ADR is explicit about the direction of composition: *"the observe-algebra became
 * canonical; Max's corporate `Menu16` retrofits onto it."*
 *
 * So the canonical package is NOT an organization. It is the generic substrate, and a hierarchy is
 * one register's policy layered on top. Everything here imports from the core; **nothing in the core
 * may import from here** — enforced by `register-boundary.test.ts`, because an architecture stated
 * only in a header is a convention, and conventions are what this directory would quietly become
 * part of the moment one core module reached into it.
 *
 * ── WHAT WAS MISSING BEFORE THIS PACKAGE ─────────────────────────────────────
 * The core carried `HatLevel` (in `observe/room/hat-gate.ts`, which says outright that it *"mirrors
 * agentic-organization HatLevel"*) and nothing else of the organization. Six tiers and no graph:
 *
 *   | capability                                  | in the core before |
 *   |---------------------------------------------|--------------------|
 *   | hat levels                                  | yes                |
 *   | reporting graph, departments, named hats    | **no**             |
 *   | goal → initiative → project → task cascade  | **no**             |
 *   | schedules, working hours, busy, meetings    | **no**             |
 *   | upward communication, escalation routing    | **no**             |
 *   | deliberation artifacts, decision records    | **no**             |
 *   | resource procurement (the RMO)              | **no**             |
 */

export {
  buildOrgChart,
  directReportsOf,
  hatsAtLevel,
  LEVEL_RANK,
  LEVELS_SENIOR_FIRST,
  nearestSupervisorAtOrAbove,
  outranks,
  reportsUpTo,
  supervisorChainOf,
  supervisorOf,
  type HatLevel,
  type OrgChart,
  type OrgChartResult,
  type OrgHat,
} from "./org-chart";

export { Department, SEED_HATS } from "./org-seed";

export {
  blockAt,
  blocksFor,
  cadenceOwnerLevel,
  conflictsFor,
  EMPTY_CALENDAR,
  firstCommonFreeSlot,
  intervalsOverlap,
  isBusy,
  markMissed,
  mayAdjustSchedule,
  maySetCadence,
  meetingLegs,
  occupies,
  ScheduleBlockState,
  ScheduleBlockType,
  scheduleBlock,
  scheduleMeeting,
  setBlockState,
  type Calendar,
  type MeetingRequest,
  type ScheduleBlock,
  type ScheduleResult,
} from "./work-schedule";

export {
  abandonAnchor,
  AnchorState,
  AnchorType,
  decisionsOn,
  EMPTY_BOARD,
  ExpectedOutput,
  anchorById,
  openAnchor,
  openAnchorsFor,
  postToAnchor,
  postsOn,
  producedItsOutput,
  recordDecision,
  resolveAnchor,
  type AnchorBoard,
  type AnchorPost,
  type BoardResult,
  type DecisionRecord,
  type DiscussionAnchor,
  type EvidenceRef,
} from "./discussion-anchor";

export {
  buildHatCommunicationBrief,
  evidenceSatisfies,
  routeSignal,
  sendSupervisorSignal,
  SIGNAL_POLICY,
  SignalTool,
  type HatCommunicationBrief,
  type SendSignalInput,
  type SendSignalResult,
  type SignalRouting,
  type SignalToolPolicy,
  type SupervisorSignal,
} from "./supervisor-signal";

export {
  accountableHatsFor,
  acceptGoal,
  assign,
  CASCADE_RUNGS,
  cascadeChainOf,
  childrenOf,
  decompose,
  EMPTY_CASCADE,
  isDelivered,
  nextRung,
  nodeById,
  ownerForRung,
  rungFor,
  setState,
  unstaffedTasks,
  WorkState,
  WorkType,
  type Cascade,
  type CascadeNode,
  type CascadeResult,
  type CascadeRung,
} from "./goal-cascade";

export {
  createScheduleMenuPolicy,
  workIsInScopeDuring,
  type CorporateLoopBinding,
} from "./loop-policy";

export {
  firstContributorUnder,
  runOrgCycle,
  type OrgCycleDeps,
  type OrgCyclePlan,
  type OrgCycleReport,
} from "./org-cycle";

export { completionsFrom, projectFor } from "./work-projection";

export {
  chooseWithinLegal,
  firstLegalChooser,
  preferChooser,
  type OrgChoice,
  type OrgChooser,
} from "./org-decision";

export {
  allGatesPassed,
  evaluateGate,
  GateKind,
  GateOutcome,
  gateOwners,
  gateProgress,
  isPassing,
  legalGateOutcomes,
  legalGateOutcomesFor,
  mayEvaluate,
  nextLegalGate,
  ORDERED_GATES,
  RecoveryPath,
  recoveryPathFor,
  runGateChain,
  type GateEvaluation,
  type GateResult,
  type GateRunResult,
} from "./quality-gate";

export {
  bounceBackCount,
  churnGate,
  DEFAULT_CHURN_THRESHOLD,
  decideEscalation,
  detectChurn,
  EscalationAction,
  EscalationTrigger,
  escalationDeciderFor,
  escalationEffect,
  hasEscalationAuthority,
  legalEscalationActions,
  type EscalationChange,
  type EscalationEffect,
  type EscalationInput,
  type EscalationResult,
} from "./escalation";

export {
  activeAuthorityFor,
  advanceAll,
  advanceBinding,
  approveBinding,
  beginBinding,
  BindingPhase,
  bindingForHat,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_TTL_MS,
  DEFAULT_WARMUP_MS,
  isAuthorizing,
  isTerminal,
  mayTakeHat,
  planSuccession,
  releaseBinding,
  revokeBinding,
  SuccessionPolicy,
  TERMINAL_PHASES,
  timingFor,
  type BindingResult,
  type BindingTiming,
  type HatBinding,
  type SuccessionPlan,
} from "./hat-binding";

export { bindWearerToLoop, type WearerBinding } from "./loop-policy";

export {
  DEFAULT_DECAY,
  DEFAULT_PRIOR,
  decayedWeight,
  explorationBonus,
  OutcomeClass,
  rankingScore,
  summarize,
  UNIFORM_PRIOR,
  whitewashingPays,
  whitewashThreshold,
  type BetaPrior,
  type DecayPolicy,
  type ReputationKey,
  type ReputationObservation,
  type ReputationSummary,
} from "./reputation";

export {
  assignHat,
  DEFAULT_MAX_ACTIVE_HATS,
  eligibleFor,
  rankCandidates,
  type AssignInput,
  type AssignmentOutcome,
  type Candidate,
  type EligibilityResult,
  type Ineligible,
  type RankedCandidate,
} from "./assignment-engine";

export { preferWhere } from "./org-decision";

export {
  computeRecommendation,
  decidePriority,
  legalPriorityClassesFor,
  normalizeInput,
  orderByPriority,
  outranksPriority,
  PRIORITY_ORDER,
  PriorityClass,
  priorityRank,
  wasOverridden,
  workable,
  type PriorityDecision,
  type PriorityInputs,
  type PriorityRecommendation,
  type PriorityResult,
} from "./prioritization";

export {
  createPlannedExecutor,
  deriveTestCases,
  ExecutionMode,
  failedFeatures,
  gateOutcomeFor,
  isFailing,
  regressionsIn,
  RunOutcome,
  runQaCycle,
  TestCaseStatus,
  untestedCases,
  type BrdInput,
  type QaCycleInput,
  type QaCycleReport,
  type Regression,
  type TestCase,
  type TestExecutor,
  type TestRun,
} from "./qa";

export {
  addShard,
  approvalCount,
  approveShard,
  ClaimState,
  claimById,
  claimIsStale,
  claimShard,
  completeClaim,
  emptyQueue,
  hasQuorum,
  heartbeat,
  mergeShard,
  readout,
  readyShards,
  reapStaleClaims,
  releaseClaim,
  ShardState,
  shardById,
  type ClaimInput,
  type QueueReadout,
  type ShardApproval,
  type WorkClaim,
  type WorkQueue,
  type WorkShard,
} from "./work-market";

export {
  externalRefOf,
  ingest,
  IntakeKind,
  IntakeState,
  INTAKE_PATH,
  normalize,
  receive,
  requirementsFor,
  Severity,
  triage,
  type ExternalEvent,
  type IntakeItem,
  type IntakeRefusal,
  type IntakeResult,
  type NormalizedIntake,
} from "./intake";

export {
  agentsFromChart,
  gateStaffing,
  runOrgRuntime,
  staffingReadout,
  type OrgAgent,
  type OrgRuntimeDeps,
  type OrgRuntimeReport,
} from "./org-runtime";

export {
  anchorIsCloseable,
  cascadeHealth,
  chartHealth,
  churnHealth,
  deliberationDebt,
  escalationPreview,
  gateHealth,
  meetingHealth,
  moreUrgent,
  orgStatus,
  priorityBoard,
  qaHealth,
  queueHealth,
  reputationExposure,
  scheduleHealth,
  shardHolder,
  type OrgStatus,
  type StatusInput,
} from "./org-status";

export {
  approvePendingBinding,
  beat,
  briefFor,
  cadenceAuthority,
  cancelBlock,
  decideGate,
  dropAnchor,
  escalationOptions,
  gateOptionsFor,
  handBack,
  ingestThenTriage,
  menuForHatNow,
  normalizedSignal,
  previewSignal,
  priorityOptions,
  proposedOwner,
  revokeHat,
  validateChart,
  type AdminResult,
} from "./org-admin";

export {
  disagreementsWith,
  factsFor,
  project,
  projectAll,
  type OrgFacts,
  type Projection,
  type ProjectionInput,
} from "./change-control";

export {
  ActionClass,
  permittedActions,
  preflightApproval,
  preflightGateEvaluation,
  preflightHatAction,
  type GuardrailResult,
  type PreflightInput,
} from "./hat-guardrails";

export {
  actorsIn,
  countByKind,
  decidedBy,
  decidedUnder,
  emit,
  eventsFor,
  ofKind,
  OrgEventKind,
  render,
  unattributed,
  type EmitInput,
  type OrgEvent,
} from "./org-event";

export { NO_PROPOSER } from "./quality-gate";

export {
  advanceBatch,
  AuthorityScope,
  batchesInScope,
  BatchState,
  blockBatch,
  isTerminalBatch,
  LEGAL_NEXT,
  membersOf,
  movement,
  MovementAction,
  observeForHat,
  pauseBatch,
  planCapacity,
  resumeBatch,
  rollUp,
  rollUpAll,
  stalledItems,
  type BatchMetrics,
  type BatchPause,
  type BatchResult,
  type NamedDependency,
  type WorkBatch,
} from "./work-batch";

export {
  ActionKind,
  batchesFromCascade,
  DEFAULT_MAX_STEPS,
  menuFor,
  runReactor,
  type PendingAction,
  type ReactorDeps,
  type ReactorReport,
} from "./org-reactor";

export {
  deriveDora,
  isFullyMeasured,
  median,
  renderDora,
  type DoraDerivation,
  type DoraInput,
  type UnmeasuredField,
} from "./dora";

export {
  candidatesFrom,
  contextFor,
  contributionOf,
  runAgentCycle,
  statusSurfaceFrom,
  trajectoryHeat,
  uncertaintyOf,
  type AgentCycleInput,
  type AgentCycleReport,
  type OrgStatusSurface,
  type SurfaceInput,
} from "./agent-loop-bridge";

export {
  appendRun,
  decidedUnder as decidedUnderStored,
  deliveryRate,
  eventsFor as storedEventsFor,
  mintRunId,
  readEvents,
  readRuns,
  type RunRecord,
} from "./org-store";

export {
  decideSupply,
  DEFAULT_LOAD_PER_WEARER,
  eligibleVoters,
  endorseRecommendation,
  MIN_VOTER_LEVEL,
  priorityWeight,
  quorumFor,
  requiredSupply,
  tallySupply,
  type HatSupplyDecision,
  type SupplyAction,
  type SupplyInput,
  type SupplyResult,
  type SupplyVote,
} from "./rmo";

export {
  authorityFor,
  Corrective,
  MEETING_SHARE_LIMIT,
  MISSED_RATE_LIMIT,
  pressureBoard,
  schedulePressure,
  type Pressure,
  type PressureComponents,
  type PressureInput,
} from "./schedule-pressure";

export {
  associateGoal,
  EMPTY_BOOK,
  goalsIn,
  idlePortfolios,
  MIN_OWNER_LEVEL,
  openPortfolio,
  portfolioById,
  portfolioHistory,
  PortfolioKind,
  portfolioOf,
  retirePortfolio,
  type Portfolio,
  type PortfolioBook,
  type PortfolioHistory,
} from "./portfolio";

export {
  factEvents,
  foldCalendar,
  foldCascade,
  foldGateEvaluations,
  foldOrganization,
  foldPortfolioBook,
  foldPriorities,
  foldRefusals,
  type FoldedOrganization,
} from "./org-fold";

export { main as runAgentMain, organizationSurface, resumedSurface, type AgentRunArgs } from "./run-agent";

// ── The ports where the organization touches reality ────────────────────────
// `Fidelity` and `fidelityOf` are the load-bearing pair: a run says which of its capabilities
// actually reached something, and `replayable` is derived from the set rather than declared.
export {
  EMPTY_REGISTRY,
  Fidelity,
  fidelityOf,
  Port,
  providersFor,
  register,
  registerAll,
  requireReplayable,
  resolve,
  resolveSet,
  type AnyProvider,
  type ChangeControlPort,
  type ChangeHandle,
  type FidelityReport,
  type IntakeSource,
  type PortResult,
  type ProviderMeta,
  type ProviderRegistry,
  type ProviderSet,
  type ReviewPort,
  type ReviewRequest,
  type ReviewVerdict,
  type TestRunner,
  type WorkExecutor,
  type WorkOutcome,
} from "./providers";
export {
  agentReview,
  autoApproveReview,
  commandReview,
  commandTestRunner,
  commandWorkExecutor,
  directoryIntake,
  directoryReview,
  gitChangeControl,
  inboxOrder,
  MAX_CAPTURED_OUTPUT,
  simulatedChangeControl,
  simulatedIntake,
  simulatedProviders,
  simulatedTestRunner,
  simulatedWorkExecutor,
} from "./adapters";
export { gateChooserFrom } from "./org-runtime";
export { parseArgs as parseOrgArgs, providersFromArgs, type Args as OrgRunArgs } from "./run-org";
