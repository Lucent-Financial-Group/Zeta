// poll-pr-gate-batch.test.ts — DST coverage for the multi-PR refresh tool.
//
// Exercises the pure-function surface (`summarize`) and the orchestration
// boundary (`pollAllBounded` with injected `pollFn`) deterministically:
// no `gh` spawn, no network, no clock dependency. Output is reproducible
// across runs because every input is fixed and every random/time source
// is excluded by construction.
//
// Per Aaron 2026-05-01 (the rule this tool was written to satisfy):
// *"DST is bascically impossible there [in bash], not in ts."* These
// tests are the worked-example proof that a TS tool ported from a bash
// equivalent can carry DST grade-A coverage that the bash form
// structurally cannot.
//
// Runs via `bun test tools/github/poll-pr-gate-batch.test.ts`.

import { describe, expect, test } from "bun:test";
import {
  pollAllBounded,
  summarize,
  type BatchSummary,
  type GateReport,
  type PollOutcome,
} from "./poll-pr-gate-batch";

// Fixed-shape factory keeps tests terse + deterministic. Every field
// has a default; tests override only what they're asserting on.
function mkReport(over: Partial<GateReport> = {}): GateReport {
  return {
    number: 1,
    state: "OPEN",
    gate: "CLEAN",
    checks: { ok: 5, inProgress: 0, pending: 0, failed: 0 },
    requiredChecks: { ok: 5, inProgress: 0, pending: 0, failed: 0 },
    unresolvedThreads: 0,
    autoMerge: "none",
    mergeCommit: null,
    warnings: [],
    nextAction: "none",
    ...over,
  };
}

describe("summarize", () => {
  test("empty input produces empty aggregates", () => {
    const s: BatchSummary = summarize([]);
    expect(s.byGate).toEqual({});
    expect(s.byNextAction).toEqual({});
    expect(s.byState).toEqual({});
    expect(s.actionable).toEqual([]);
    expect(s.warnings).toEqual([]);
  });

  test("counts each axis independently", () => {
    const s = summarize([
      mkReport({ number: 1, gate: "CLEAN", state: "MERGED", nextAction: "verify-merge" }),
      mkReport({ number: 2, gate: "BLOCKED", state: "OPEN", nextAction: "resolve-threads" }),
      mkReport({ number: 3, gate: "BLOCKED", state: "OPEN", nextAction: "wait-ci" }),
      mkReport({ number: 4, gate: "DIRTY", state: "OPEN", nextAction: "rebase" }),
    ]);
    expect(s.byGate).toEqual({ CLEAN: 1, BLOCKED: 2, DIRTY: 1 });
    expect(s.byNextAction).toEqual({
      "verify-merge": 1,
      "resolve-threads": 1,
      "wait-ci": 1,
      rebase: 1,
    });
    expect(s.byState).toEqual({ MERGED: 1, OPEN: 3 });
  });

  test("actionable excludes 'none' and 'verify-merge'", () => {
    // The actionable contract: a PR is actionable iff there's a
    // concrete next step the loop can take. MERGED PRs (nextAction
    // verify-merge) are terminal-success; CLOSED PRs (nextAction
    // none) are terminal-no-op. Both excluded from actionable.
    const s = summarize([
      mkReport({ number: 10, nextAction: "verify-merge" }),
      mkReport({ number: 11, nextAction: "none" }),
      mkReport({ number: 12, nextAction: "wait-ci" }),
      mkReport({ number: 13, nextAction: "resolve-threads" }),
      mkReport({ number: 14, nextAction: "rebase" }),
      mkReport({ number: 15, nextAction: "fix-failed-checks" }),
    ]);
    expect(s.actionable).toEqual([12, 13, 14, 15]);
  });

  test("warnings prefix per-PR with #N: marker", () => {
    const s = summarize([
      mkReport({ number: 100, warnings: ["non-required check failed: foo"] }),
      mkReport({ number: 101, warnings: ["non-required check failed: bar", "non-required check failed: baz"] }),
      mkReport({ number: 102, warnings: [] }),
    ]);
    expect(s.warnings).toEqual([
      "#100: non-required check failed: foo",
      "#101: non-required check failed: bar",
      "#101: non-required check failed: baz",
    ]);
  });

  test("preserves input order in actionable list", () => {
    // Order matters for the loop's prioritisation (older PRs first =
    // smaller numbers first). Verify summarize doesn't sort or
    // reorder under the hood.
    const s = summarize([
      mkReport({ number: 999, nextAction: "wait-ci" }),
      mkReport({ number: 100, nextAction: "wait-ci" }),
      mkReport({ number: 500, nextAction: "wait-ci" }),
    ]);
    expect(s.actionable).toEqual([999, 100, 500]);
  });
});

describe("pollAllBounded with injected pollFn", () => {
  test("returns outcomes in input order regardless of completion order", async () => {
    // DST contract: even if pollFn resolves out of order (worker
    // scheduling races), the `outcomes` array MUST be input-aligned
    // by index. Without this guarantee, the per-PR JSON in stdout
    // wouldn't match the input PR list, breaking caller assumptions.
    const completionOrder: number[] = [];
    const pollFn = (pr: number): Promise<PollOutcome> =>
      new Promise((res) => {
        // First-in-last-out staggered delay: PR 1 takes longest,
        // PR 5 finishes first. If outcomes were appended in
        // completion order, the order would be [5,4,3,2,1] not [1..5].
        const delay = (6 - pr) * 5;
        setTimeout(() => {
          completionOrder.push(pr);
          res({ number: pr, report: mkReport({ number: pr }) });
        }, delay);
      });
    const outcomes = await pollAllBounded([1, 2, 3, 4, 5], "o", "r", 5, pollFn);
    expect(outcomes.map((o) => o.number)).toEqual([1, 2, 3, 4, 5]);
    // And confirm the staggered scheduling actually ran out-of-order:
    expect(completionOrder).toEqual([5, 4, 3, 2, 1]);
  });

  test("respects concurrency bound — never more than N in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const pollFn = (pr: number): Promise<PollOutcome> =>
      new Promise((res) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        setTimeout(() => {
          inFlight--;
          res({ number: pr, report: mkReport({ number: pr }) });
        }, 10);
      });
    await pollAllBounded([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "o", "r", 3, pollFn);
    // The worker pool has 3 workers; peak should be exactly 3.
    expect(peak).toBe(3);
  });

  test("worker count clamped to PR count when prs.length < concurrency", async () => {
    // Prevents spawning useless idle workers when the input is
    // smaller than the requested concurrency.
    let peak = 0;
    let inFlight = 0;
    const pollFn = (pr: number): Promise<PollOutcome> =>
      new Promise((res) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        setTimeout(() => {
          inFlight--;
          res({ number: pr, report: mkReport({ number: pr }) });
        }, 10);
      });
    await pollAllBounded([42, 43], "o", "r", 16, pollFn);
    expect(peak).toBe(2);
  });

  test("empty PR list resolves immediately with empty outcomes", async () => {
    let called = false;
    const pollFn = (): Promise<PollOutcome> => {
      called = true;
      return Promise.resolve({ number: 0, report: mkReport() });
    };
    const outcomes = await pollAllBounded([], "o", "r", 4, pollFn);
    expect(outcomes).toEqual([]);
    expect(called).toBe(false);
  });

  test("propagates errors as PollError outcomes without throwing", async () => {
    // The loop must NEVER throw — a single PR's failure (auth,
    // rate-limit, JSON parse) shouldn't cascade and lose the other
    // PRs' results. Errors are surfaced as PollOutcome.error so the
    // caller can partition success/failure deterministically.
    const pollFn = (pr: number): Promise<PollOutcome> =>
      Promise.resolve(
        pr === 99
          ? { number: pr, error: { number: pr, exitCode: 2, stderr: "auth fail" } }
          : { number: pr, report: mkReport({ number: pr }) },
      );
    const outcomes = await pollAllBounded([1, 99, 2], "o", "r", 4, pollFn);
    expect(outcomes).toHaveLength(3);
    expect(outcomes[0]?.report?.number).toBe(1);
    expect(outcomes[1]?.error?.exitCode).toBe(2);
    expect(outcomes[2]?.report?.number).toBe(2);
  });
});
