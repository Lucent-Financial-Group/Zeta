import { describe, expect, test } from "bun:test";
import {
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
  type TestCase,
  type TestExecutor,
  type TestRun,
} from "./qa";
import { GateOutcome } from "./quality-gate";

let seq = 0;
const createId = (p: string) => `${p}-${String(++seq).padStart(3, "0")}`;

const brd = (criteria: readonly string[]) => ({
  brdId: "brd-1",
  suiteId: "suite-1",
  authoredByHatId: "product_manager",
  acceptanceCriteria: criteria,
});

const tcase = (id: string, over: Partial<TestCase> = {}): TestCase => ({
  testCaseId: id,
  suiteId: "s",
  brdId: "b",
  title: id,
  criterion: id,
  executionMode: ExecutionMode.Api,
  status: TestCaseStatus.Active,
  authoredByHatId: "qa_engineer",
  ...over,
});

const run = (id: string, testCaseId: string, outcome: RunOutcome, finishedAtMs: number): TestRun => ({
  testRunId: id,
  testCaseId,
  outcome,
  evidence: [],
  startedAtMs: finishedAtMs,
  finishedAtMs,
  executorHatId: "qa_engineer",
});

describe("the BRD is the legal source of coverage", () => {
  test("one active case per acceptance criterion", () => {
    const cases = deriveTestCases(brd(["shows the total", "applies the coupon once"]), createId);
    expect(cases).toHaveLength(2);
    expect(cases[0]?.title).toContain("AC-1");
    expect(cases[1]?.title).toContain("AC-2");
    expect(cases.every((c) => c.status === TestCaseStatus.Active)).toBe(true);
    expect(cases.every((c) => c.brdId === "brd-1")).toBe(true);
  });

  test("a BRD with no criteria yields NO cases — an empty suite is visibly empty", () => {
    // Inventing a smoke test here would make an unspecified feature look covered.
    expect(deriveTestCases(brd([]), createId)).toHaveLength(0);
    expect(deriveTestCases(brd(["  ", ""]), createId)).toHaveLength(0);
  });

  test("the execution mode is carried, with a default", () => {
    expect(deriveTestCases(brd(["x"]), createId)[0]?.executionMode).toBe(ExecutionMode.BrowserAutomation);
    expect(
      deriveTestCases({ ...brd(["x"]), executionMode: ExecutionMode.Api }, createId)[0]?.executionMode,
    ).toBe(ExecutionMode.Api);
  });
});

describe("what counts as failing", () => {
  test("failed, flaky and ERRORED all count", () => {
    expect(isFailing(RunOutcome.Failed)).toBe(true);
    // An unreliable answer is not an answer.
    expect(isFailing(RunOutcome.Flaky)).toBe(true);
    // A run that could not be made tells you nothing; treating nothing as fine is how a harness
    // outage becomes a green release.
    expect(isFailing(RunOutcome.Errored)).toBe(true);
  });

  test("passed and skipped do not", () => {
    expect(isFailing(RunOutcome.Passed)).toBe(false);
    expect(isFailing(RunOutcome.Skipped)).toBe(false);
  });
});

describe("the planned executor makes its fallback explicit", () => {
  test("a planned case gets its planned outcome", async () => {
    const ex = createPlannedExecutor(new Map([["tc-1", RunOutcome.Failed]]), RunOutcome.Passed);
    const r = await ex.execute(tcase("tc-1"), { branch: "b" });
    expect(r.outcome).toBe(RunOutcome.Failed);
  });

  test("an UNPLANNED case takes the fallback the caller named", async () => {
    // The reference defaults it to Passed, turning "nobody thought about this case" into a green.
    const strict = createPlannedExecutor(new Map(), RunOutcome.Failed);
    expect((await strict.execute(tcase("tc-9"), { branch: "b" })).outcome).toBe(RunOutcome.Failed);
    const lax = createPlannedExecutor(new Map(), RunOutcome.Passed);
    expect((await lax.execute(tcase("tc-9"), { branch: "b" })).outcome).toBe(RunOutcome.Passed);
  });

  test("the evidence names the outcome it recorded", async () => {
    const ex = createPlannedExecutor(new Map([["tc-1", RunOutcome.Failed]]), RunOutcome.Passed);
    const r = await ex.execute(tcase("tc-1"), { branch: "b" });
    expect(r.evidence[0]?.ref).toContain("failed");
  });
});

describe("REGRESSION and FAILED FEATURE are different facts", () => {
  test("passed then failed is a regression", () => {
    const history = [run("r1", "tc-1", RunOutcome.Passed, 10), run("r2", "tc-1", RunOutcome.Failed, 20)];
    const regs = regressionsIn(history);
    expect(regs).toHaveLength(1);
    expect(regs[0]?.lastPassedRunId).toBe("r1");
    expect(regs[0]?.failingRunId).toBe("r2");
  });

  test("NEVER passed is NOT a regression — nothing is broken, it was never built", () => {
    const history = [run("r1", "tc-1", RunOutcome.Failed, 10), run("r2", "tc-1", RunOutcome.Failed, 20)];
    expect(regressionsIn(history)).toHaveLength(0);
    expect(failedFeatures([tcase("tc-1")], history)).toEqual(["tc-1"]);
  });

  test("a case that only ever ERRORED is neither — nobody has managed to run it", () => {
    const history = [run("r1", "tc-1", RunOutcome.Errored, 10)];
    expect(regressionsIn(history)).toHaveLength(0);
    // It has run and never passed, so it is a failed feature — the honest reading.
    expect(failedFeatures([tcase("tc-1")], history)).toEqual(["tc-1"]);
  });

  test("passing again clears the regression", () => {
    const history = [
      run("r1", "tc-1", RunOutcome.Passed, 10),
      run("r2", "tc-1", RunOutcome.Failed, 20),
      run("r3", "tc-1", RunOutcome.Passed, 30),
    ];
    expect(regressionsIn(history)).toHaveLength(0);
    expect(failedFeatures([tcase("tc-1")], history)).toEqual([]);
  });

  test("the LATEST run decides, and the order is TOTAL", () => {
    // Same-millisecond runs are an ordinary outcome for a batch. Sorting by time alone leaves
    // "latest" to whatever order the array happened to be in.
    const a = [run("r1", "tc-1", RunOutcome.Passed, 10), run("r2", "tc-1", RunOutcome.Failed, 10)];
    const b = [run("r2", "tc-1", RunOutcome.Failed, 10), run("r1", "tc-1", RunOutcome.Passed, 10)];
    expect(regressionsIn(a)).toEqual(regressionsIn(b));
    expect(regressionsIn(a)).toHaveLength(1);
  });

  test("regressions are reported per case, and cases do not contaminate each other", () => {
    const history = [
      run("r1", "tc-1", RunOutcome.Passed, 10),
      run("r2", "tc-2", RunOutcome.Failed, 20),
    ];
    // tc-1 is fine; tc-2 never passed.
    expect(regressionsIn(history)).toHaveLength(0);
  });

  test("a RETIRED case is not a failed feature", () => {
    const history = [run("r1", "tc-1", RunOutcome.Failed, 10)];
    expect(failedFeatures([tcase("tc-1", { status: TestCaseStatus.Retired })], history)).toEqual([]);
  });

  test("UNTESTED is a third state, not a failure", () => {
    // Covered on paper, unverified in fact — a different problem from a feature that does not work.
    expect(failedFeatures([tcase("tc-1")], [])).toEqual([]);
    expect(untestedCases([tcase("tc-1")], [])).toEqual(["tc-1"]);
    expect(untestedCases([tcase("tc-1")], [run("r1", "tc-1", RunOutcome.Failed, 1)])).toEqual([]);
  });
});

describe("a QA cycle", () => {
  const cases = [tcase("tc-1"), tcase("tc-2")];

  test("it runs every active case and reports the tally", async () => {
    const report = await runQaCycle({
      cases,
      priorRuns: [],
      executor: createPlannedExecutor(new Map([["tc-2", RunOutcome.Failed]]), RunOutcome.Passed),
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });
    expect(report.runs).toHaveLength(2);
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.defects).toHaveLength(1);
    expect(report.defects[0]?.testCaseId).toBe("tc-2");
  });

  test("retired cases are not run", async () => {
    const report = await runQaCycle({
      cases: [tcase("tc-1", { status: TestCaseStatus.Retired })],
      priorRuns: [],
      executor: createPlannedExecutor(new Map(), RunOutcome.Passed),
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });
    expect(report.runs).toHaveLength(0);
  });

  test("AN EXECUTOR THAT THROWS does not abort the cycle", async () => {
    // One broken case must not stop the other nineteen being verified, and a cycle that died
    // halfway leaves no record of what it had already learned.
    const flaky: TestExecutor = {
      async execute(tc) {
        if (tc.testCaseId === "tc-1") throw new Error("browser died");
        return { outcome: RunOutcome.Passed, evidence: [] };
      },
    };
    const report = await runQaCycle({
      cases,
      priorRuns: [],
      executor: flaky,
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });
    expect(report.runs).toHaveLength(2);
    const errored = report.runs.find((r) => r.testCaseId === "tc-1");
    expect(errored?.outcome).toBe(RunOutcome.Errored);
    // …and the error is evidence.
    expect(errored?.evidence[0]?.ref).toContain("browser died");
    expect(report.failed).toBe(1);
  });

  test("prior runs are folded in, so a regression is visible across cycles", async () => {
    const report = await runQaCycle({
      cases: [tcase("tc-1")],
      priorRuns: [run("old", "tc-1", RunOutcome.Passed, 1)],
      executor: createPlannedExecutor(new Map([["tc-1", RunOutcome.Failed]]), RunOutcome.Passed),
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });
    expect(report.regressions).toHaveLength(1);
    expect(report.regressions[0]?.lastPassedRunId).toBe("old");
  });
});

describe("THE GATE VERDICT IS DERIVED FROM RUNS, not chosen", () => {
  const cycle = async (plan: Map<string, RunOutcome>, cases = [tcase("tc-1"), tcase("tc-2")]) =>
    runQaCycle({
      cases,
      priorRuns: [],
      executor: createPlannedExecutor(plan, RunOutcome.Passed),
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });

  test("all passing approves", async () => {
    const v = gateOutcomeFor(await cycle(new Map()));
    expect(v.outcome).toBe(GateOutcome.Approved);
    expect(v.reason).toContain("2/2");
  });

  test("any failure rejects, and names it a regression when it is one", async () => {
    const failing = gateOutcomeFor(await cycle(new Map([["tc-1", RunOutcome.Failed]])));
    expect(failing.outcome).toBe(GateOutcome.Rejected);
    expect(failing.reason).toContain("failure");

    const report = await runQaCycle({
      cases: [tcase("tc-1")],
      priorRuns: [run("old", "tc-1", RunOutcome.Passed, 1)],
      executor: createPlannedExecutor(new Map([["tc-1", RunOutcome.Failed]]), RunOutcome.Passed),
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });
    expect(gateOutcomeFor(report).reason).toContain("regression");
  });

  test("AN EMPTY SUITE IS REJECTED, never approved", async () => {
    // "No tests failed" is the most common way a check that cannot fail reports success.
    const empty = await cycle(new Map(), []);
    const v = gateOutcomeFor(empty);
    expect(v.outcome).toBe(GateOutcome.Rejected);
    expect(v.reason).toContain("empty suite");
  });

  test("an untested active case asks for changes rather than approving", async () => {
    const report = await runQaCycle({
      cases: [tcase("tc-1"), tcase("tc-2", { status: TestCaseStatus.Draft })],
      priorRuns: [],
      executor: createPlannedExecutor(new Map(), RunOutcome.Passed),
      branch: "b",
      qaHatId: "qa_engineer",
      createId,
      nowMs: 100,
    });
    // tc-2 is draft so it never runs; it is not active, so it is not untested either.
    expect(gateOutcomeFor(report).outcome).toBe(GateOutcome.Approved);

    // But an ACTIVE case that never ran is a gap.
    const gap = gateOutcomeFor({ ...report, untestedIds: ["tc-3"] });
    expect(gap.outcome).toBe(GateOutcome.ChangesRequested);
  });

  test("the verdict is never Waived — QA does not skip its own control", async () => {
    for (const plan of [new Map(), new Map([["tc-1", RunOutcome.Failed]])]) {
      expect(gateOutcomeFor(await cycle(plan as Map<string, RunOutcome>)).outcome).not.toBe(
        GateOutcome.Waived,
      );
    }
  });
});
