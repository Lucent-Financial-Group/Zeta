/**
 * corporate/qa.ts — the standing QA department: derive cases, run them, tell a regression from a
 * feature that never worked, and open defects.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `quality-gate.ts` has a `runtime_validation` gate whose outcome is chosen by an agent. That is the
 * right shape for an approval, and the wrong shape for a test: a gate that passes because someone
 * chose "approved" has verified nothing. This module is what the QA hat consults BEFORE it chooses —
 * real runs, real evidence, and a verdict derived from them.
 *
 * ── THE BRD IS THE LEGAL SOURCE OF COVERAGE ──────────────────────────────────
 * Cases are derived one-per-acceptance-criterion. QA cannot invent coverage outside the BRD, which
 * is what keeps "tested" and "does what was asked for" the same claim. A suite that grew its own
 * scenarios would drift into testing what the code does rather than what was specified.
 *
 * ── REGRESSION vs FAILED FEATURE ─────────────────────────────────────────────
 * Two different facts, and collapsing them loses the more actionable one:
 *
 *   - **regression** — the case PASSED before and fails now. Something that worked is broken; the
 *     change that broke it is findable, and the recovery is to look at what changed.
 *   - **failed feature** — the case has run and has NEVER passed. Nothing is broken; the feature was
 *     not built to its criterion yet, and the recovery is to finish it.
 *
 * ── THE ORDER OF RUNS IS TOTAL ───────────────────────────────────────────────
 * "Latest run" decides whether a case is currently failing, so the ordering has to be unambiguous.
 * The reference sorts by parsed ISO timestamp, which leaves runs recorded in the same millisecond —
 * an ordinary outcome for a batch — in whatever order they happened to arrive, making "latest"
 * arbitrary. Ties break on `testRunId` here so the same history always yields the same verdict.
 */

import { GateOutcome } from "./quality-gate";
import type { EvidenceRef } from "./discussion-anchor";

export const TestCaseStatus = {
  Active: "active",
  Retired: "retired",
  Draft: "draft",
} as const;

export type TestCaseStatus = (typeof TestCaseStatus)[keyof typeof TestCaseStatus];

export const ExecutionMode = {
  BrowserAutomation: "browser_automation",
  Api: "api",
  ComputerUse: "computer_use",
  Manual: "manual",
} as const;

export type ExecutionMode = (typeof ExecutionMode)[keyof typeof ExecutionMode];

export const RunOutcome = {
  Passed: "passed",
  Failed: "failed",
  /** Passed and failed on the same input. Not a pass — an unreliable answer is not an answer. */
  Flaky: "flaky",
  /** The run could not be made. Distinct from a failure: nothing was learned. */
  Errored: "errored",
  Skipped: "skipped",
} as const;

export type RunOutcome = (typeof RunOutcome)[keyof typeof RunOutcome];

/**
 * Outcomes that mean the case is NOT currently satisfied.
 *
 * `Errored` counts. A run that could not be made tells you nothing, and treating "nothing" as
 * "fine" is how an outage in the test harness becomes a green release.
 *
 * `Skipped` does NOT count as failing, and also does not count as passing — a skipped case is
 * absent from the evidence, which `failedFeatures` and `regressionsIn` both handle by looking for
 * an actual pass rather than for the absence of a failure.
 */
const NOT_SATISFIED: ReadonlySet<RunOutcome> = new Set([RunOutcome.Failed, RunOutcome.Flaky, RunOutcome.Errored]);

export function isFailing(outcome: RunOutcome): boolean {
  return NOT_SATISFIED.has(outcome);
}

export interface TestCase {
  readonly testCaseId: string;
  readonly suiteId: string;
  readonly brdId: string;
  readonly title: string;
  readonly criterion: string;
  readonly executionMode: ExecutionMode;
  readonly status: TestCaseStatus;
  readonly authoredByHatId: string;
}

export interface TestRun {
  readonly testRunId: string;
  readonly testCaseId: string;
  readonly outcome: RunOutcome;
  readonly evidence: readonly EvidenceRef[];
  readonly startedAtMs: number;
  readonly finishedAtMs: number;
  readonly executorHatId: string;
}

export interface Regression {
  readonly testCaseId: string;
  readonly lastPassedRunId: string;
  readonly failingRunId: string;
  readonly detectedAtMs: number;
}

export interface BrdInput {
  readonly brdId: string;
  readonly suiteId: string;
  readonly authoredByHatId: string;
  readonly acceptanceCriteria: readonly string[];
  readonly executionMode?: ExecutionMode;
}

/**
 * One active case per acceptance criterion.
 *
 * A BRD with no criteria yields no cases, and that is the honest answer — an empty suite is visibly
 * empty, whereas inventing a smoke test would make an unspecified feature look covered.
 */
export function deriveTestCases(
  brd: BrdInput,
  createId: (prefix: string) => string,
): readonly TestCase[] {
  const mode = brd.executionMode ?? ExecutionMode.BrowserAutomation;
  return brd.acceptanceCriteria
    .map((criterion, i) => ({ criterion: criterion.trim(), i }))
    .filter(({ criterion }) => criterion !== "")
    .map(({ criterion, i }) => ({
      testCaseId: createId("tc"),
      suiteId: brd.suiteId,
      brdId: brd.brdId,
      title: `AC-${i + 1}: ${criterion}`,
      criterion,
      executionMode: mode,
      status: TestCaseStatus.Active,
      authoredByHatId: brd.authoredByHatId,
    }));
}

/** The execution port. The real runner is a browser, an API probe, or computer use. */
export interface TestExecutor {
  execute(
    testCase: TestCase,
    ctx: { readonly branch: string },
  ): Promise<{ readonly outcome: RunOutcome; readonly evidence: readonly EvidenceRef[] }>;
}

/**
 * A planned executor for tests and degraded mode.
 *
 * `fallback` is REQUIRED — the reference defaults an unplanned case to `Passed`, which turns
 * "nobody thought about this case" into a green. Making the caller name the fallback means a suite
 * that passes because of a gap in the plan is a decision somebody made, not an accident of the
 * default.
 */
export function createPlannedExecutor(
  plan: ReadonlyMap<string, RunOutcome>,
  fallback: RunOutcome,
): TestExecutor {
  return {
    async execute(testCase) {
      const outcome = plan.get(testCase.testCaseId) ?? fallback;
      return { outcome, evidence: [{ kind: "trace", ref: `planned:${testCase.testCaseId}:${outcome}` }] };
    },
  };
}

/** Runs for one case, in a TOTAL order — by finish time, then by id. */
function orderedRunsFor(history: readonly TestRun[], testCaseId: string): readonly TestRun[] {
  return history
    .filter((r) => r.testCaseId === testCaseId)
    .sort((a, b) =>
      a.finishedAtMs !== b.finishedAtMs
        ? a.finishedAtMs - b.finishedAtMs
        : a.testRunId < b.testRunId
          ? -1
          : a.testRunId > b.testRunId
            ? 1
            : 0,
    );
}

/**
 * Cases that PASSED and now fail.
 *
 * Requires an actual prior `Passed` — a case that has only ever errored is not a regression, it is a
 * case nobody has managed to run.
 */
export function regressionsIn(history: readonly TestRun[]): readonly Regression[] {
  const caseIds = [...new Set(history.map((r) => r.testCaseId))].sort();
  const out: Regression[] = [];
  for (const testCaseId of caseIds) {
    const ordered = orderedRunsFor(history, testCaseId);
    const latest = ordered[ordered.length - 1];
    if (latest === undefined || !isFailing(latest.outcome)) continue;
    for (let i = ordered.length - 2; i >= 0; i -= 1) {
      const prior = ordered[i];
      if (prior?.outcome === RunOutcome.Passed) {
        out.push({
          testCaseId,
          lastPassedRunId: prior.testRunId,
          failingRunId: latest.testRunId,
          detectedAtMs: latest.finishedAtMs,
        });
        break;
      }
    }
  }
  return out;
}

/**
 * Active cases that have run and have NEVER passed — the feature was not built to its criterion.
 *
 * A case with no runs at all is excluded: it is untested, which is a third state and a different
 * problem from a feature that does not work. `untestedCases` reports that one.
 */
export function failedFeatures(
  cases: readonly TestCase[],
  history: readonly TestRun[],
): readonly string[] {
  return cases
    .filter((c) => c.status === TestCaseStatus.Active)
    .filter((c) => {
      const runs = history.filter((r) => r.testCaseId === c.testCaseId);
      return runs.length > 0 && !runs.some((r) => r.outcome === RunOutcome.Passed);
    })
    .map((c) => c.testCaseId);
}

/** Active cases with no runs at all — covered on paper and unverified in fact. */
export function untestedCases(
  cases: readonly TestCase[],
  history: readonly TestRun[],
): readonly string[] {
  return cases
    .filter((c) => c.status === TestCaseStatus.Active)
    .filter((c) => !history.some((r) => r.testCaseId === c.testCaseId))
    .map((c) => c.testCaseId);
}

export interface QaCycleInput {
  readonly cases: readonly TestCase[];
  readonly priorRuns: readonly TestRun[];
  readonly executor: TestExecutor;
  readonly branch: string;
  readonly qaHatId: string;
  readonly createId: (prefix: string) => string;
  readonly nowMs: number;
}

export interface QaCycleReport {
  readonly runs: readonly TestRun[];
  readonly regressions: readonly Regression[];
  readonly failedFeatureIds: readonly string[];
  readonly untestedIds: readonly string[];
  /** One per fresh failure — what the QA hat files against the work. */
  readonly defects: readonly { readonly testCaseId: string; readonly evidence: readonly EvidenceRef[] }[];
  readonly passed: number;
  readonly failed: number;
}

/**
 * Run every active case once and report.
 *
 * An executor that THROWS produces an `Errored` run rather than aborting the cycle. One broken case
 * must not stop the other twenty from being verified, and the error becomes evidence — a cycle that
 * died halfway leaves no record of what it had already learned.
 */
export async function runQaCycle(input: QaCycleInput): Promise<QaCycleReport> {
  const runs: TestRun[] = [];

  for (const testCase of input.cases) {
    if (testCase.status !== TestCaseStatus.Active) continue;
    const startedAtMs = input.nowMs;
    let outcome: RunOutcome;
    let evidence: readonly EvidenceRef[];
    try {
      const result = await input.executor.execute(testCase, { branch: input.branch });
      outcome = result.outcome;
      evidence = result.evidence;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcome = RunOutcome.Errored;
      evidence = [{ kind: "trace", ref: `executor-threw:${message}` }];
    }
    runs.push({
      testRunId: input.createId("run"),
      testCaseId: testCase.testCaseId,
      outcome,
      evidence,
      startedAtMs,
      finishedAtMs: input.nowMs,
      executorHatId: input.qaHatId,
    });
  }

  const history = [...input.priorRuns, ...runs];
  const defects = runs
    .filter((r) => isFailing(r.outcome))
    .map((r) => ({ testCaseId: r.testCaseId, evidence: r.evidence }));

  return {
    runs,
    regressions: regressionsIn(history),
    failedFeatureIds: failedFeatures(input.cases, history),
    untestedIds: untestedCases(input.cases, history),
    defects,
    passed: runs.filter((r) => r.outcome === RunOutcome.Passed).length,
    failed: runs.filter((r) => isFailing(r.outcome)).length,
  };
}

/**
 * The verdict a QA hat brings to the `runtime_validation` gate.
 *
 * This is the whole point of the module: the gate's outcome becomes a function of runs rather than
 * of a choice. Three cases, and the third is the one that matters:
 *
 *   - anything failing → `Rejected`
 *   - everything passing, nothing untested → `Approved`
 *   - **nothing ran at all → `Rejected`**, never approved. An empty suite passes trivially, and
 *     "no tests failed" is the most common way a check that cannot fail reports success.
 */
export function gateOutcomeFor(report: QaCycleReport): { outcome: GateOutcome; reason: string } {
  if (report.runs.length === 0) {
    return { outcome: GateOutcome.Rejected, reason: "no test ran — an empty suite is not a passing suite" };
  }
  if (report.failed > 0) {
    const kind = report.regressions.length > 0 ? "regression" : "failure";
    return {
      outcome: GateOutcome.Rejected,
      reason: `${report.failed} ${kind}(s) across ${report.runs.length} run(s)`,
    };
  }
  if (report.untestedIds.length > 0) {
    return {
      outcome: GateOutcome.ChangesRequested,
      reason: `${report.untestedIds.length} active case(s) never ran`,
    };
  }
  return { outcome: GateOutcome.Approved, reason: `${report.passed}/${report.runs.length} passed` };
}
