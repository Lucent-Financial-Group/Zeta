/**
 * merge-receipt.test.ts — falsifiers for "a merge needs a receipt, and a missing tool is not one".
 *
 * The defect these lock out: `codegen-executor.ts` fell back to a local `git merge` + `git push
 * origin main` when the `gh` CLI was absent from PATH — bypassing the pull request entirely, and
 * triggered by the loop LOSING the ability to ask whether merging was allowed.
 */

import { describe, expect, test } from "bun:test";
import type { CheckSummary, PrGateState } from "../forge-host/types";
import {
  authorizeMerge,
  describeGateRefusal,
  lifecycleFromGateState,
  mergePermitted,
  rowForPr,
  type PrGateReader,
} from "./merge-receipt";

const GREEN: CheckSummary = { ok: 12, inProgress: 0, pending: 0, failed: 0 };

function gateState(patch: Partial<PrGateState> = {}): PrGateState {
  return {
    number: 42,
    state: "open",
    gate: "clean",
    checks: GREEN,
    requiredChecks: GREEN,
    unresolvedThreads: 0,
    autoMerge: "none",
    mergeCommit: null,
    warnings: [],
    nextAction: "merge",
    ...patch,
  } as PrGateState;
}

const ROW = rowForPr(42, "a pull request");

describe("lifecycleFromGateState — the forge's answer, walked through the verified machine", () => {
  test("clean gate + green required checks + no threads = Approved", () => {
    expect(lifecycleFromGateState(ROW, gateState()).tag).toBe("Approved");
  });

  test("an unresolved review thread means the review is NOT finished", () => {
    // THE case `mergeStateStatus === "clean"` cannot see: a PR can be perfectly mergeable while a
    // reviewer's thread has never been answered.
    const state = lifecycleFromGateState(ROW, gateState({ unresolvedThreads: 1 }));
    expect(state.tag).toBe("RevisionRequested");
  });

  test("a failing required check keeps it in review", () => {
    const state = lifecycleFromGateState(ROW, gateState({ requiredChecks: { ...GREEN, failed: 1 } }));
    expect(state.tag).toBe("InReview");
  });

  test("required checks still running keep it in review — pending AND in-progress both count", () => {
    expect(lifecycleFromGateState(ROW, gateState({ requiredChecks: { ...GREEN, pending: 1 } })).tag).toBe("InReview");
    expect(lifecycleFromGateState(ROW, gateState({ requiredChecks: { ...GREEN, inProgress: 1 } })).tag).toBe(
      "InReview",
    );
  });

  test("a non-clean forge gate keeps it in review, whatever the checks say", () => {
    for (const gate of ["blocked", "dirty", "unstable", "unknown"] as const) {
      expect(lifecycleFromGateState(ROW, gateState({ gate })).tag).toBe("InReview");
    }
  });
});

describe("mergePermitted — asked of the machine, not restated here", () => {
  test("Approved may merge", () => {
    expect(mergePermitted(lifecycleFromGateState(ROW, gateState())).permitted).toBe(true);
  });

  test("every non-Approved state the gate can produce refuses", () => {
    const refusing = [
      gateState({ unresolvedThreads: 3 }),
      gateState({ requiredChecks: { ...GREEN, failed: 2 } }),
      gateState({ gate: "blocked" }),
    ];
    for (const g of refusing) {
      const verdict = mergePermitted(lifecycleFromGateState(ROW, g));
      expect(verdict.permitted).toBe(false);
      if (!verdict.permitted) expect(verdict.why).toContain("illegal transition");
    }
  });
});

describe("authorizeMerge — being unable to ask is not permission", () => {
  test("NO reader at all is a refusal", async () => {
    // THE removed fallback, in one assertion: the old path merged by another route exactly here.
    const a = await authorizeMerge(42, "t", undefined);
    expect(a.permitted).toBe(false);
    expect(a.why).toContain("not permission");
  });

  test("a reader that FAILS is a refusal, not a pass", async () => {
    const reader: PrGateReader = async () => ({ ok: false, why: "auth-failure: token expired" });
    const a = await authorizeMerge(42, "t", reader);
    expect(a.permitted).toBe(false);
    expect(a.why).toContain("token expired");
  });

  test("a reader that reports Approved permits the merge", async () => {
    const reader: PrGateReader = async () => ({ ok: true, gate: gateState() });
    const a = await authorizeMerge(42, "t", reader);
    expect(a.permitted).toBe(true);
    expect(a.state?.tag).toBe("Approved");
  });

  test("unresolved threads refuse, and the reason names them", async () => {
    const reader: PrGateReader = async () => ({ ok: true, gate: gateState({ unresolvedThreads: 2 }) });
    const a = await authorizeMerge(42, "t", reader);
    expect(a.permitted).toBe(false);
    expect(a.why).toContain("2 unresolved review thread");
    expect(a.why).toContain("the review is not finished");
  });

  test("the receipt is read for the PR number that was asked about", async () => {
    const asked: number[] = [];
    const reader: PrGateReader = async (n) => {
      asked.push(n);
      return { ok: true, gate: gateState({ number: n }) };
    };
    await authorizeMerge(1337, "t", reader);
    expect(asked).toEqual([1337]);
  });
});

describe("describeGateRefusal — the operator learns WHY", () => {
  test("it names threads, failing checks, running checks and the gate", () => {
    const why = describeGateRefusal(
      gateState({
        unresolvedThreads: 1,
        requiredChecks: { ok: 1, inProgress: 2, pending: 1, failed: 3 },
        gate: "blocked",
      }),
    );
    expect(why).toContain("1 unresolved review thread");
    expect(why).toContain("3 required check(s) failing");
    expect(why).toContain("3 required check(s) still running");
    expect(why).toContain('merge gate "blocked"');
  });

  test("it never produces an empty explanation", () => {
    expect(describeGateRefusal(gateState()).length).toBeGreaterThan(0);
  });
});
