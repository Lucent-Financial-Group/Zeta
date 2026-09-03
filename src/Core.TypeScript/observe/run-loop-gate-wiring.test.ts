/**
 * run-loop-gate-wiring.test.ts — the gates cannot be silently unwired.
 *
 * Every guard the loop consults is unit-tested in isolation, and the loop's `main()` is not
 * exported, so nothing checks that `main()` still ROUTES THROUGH them. That gap is the one this repo
 * names as its central failure mode: *"codified rules without a gate aren't a control."* A one-token
 * edit — passing `executor` instead of `gatedExecutor` — removes a control while every unit test
 * stays green.
 *
 * So these assert on the SOURCE, the way `ci/manifest-symmetry.test.ts` already does. That is a
 * weaker check than exercising the path, and it is the strongest one available without
 * restructuring `main()` into injectable pieces. Stated plainly so nobody mistakes it for a
 * behavioural test:
 *
 *   * it CANNOT tell whether the wiring is correct, only that it is present;
 *   * it CAN tell when someone removes it, which is the failure that actually happens.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOOP = readFileSync(join(import.meta.dir, "run-loop-real.ts"), "utf8");
const EXECUTOR = readFileSync(join(import.meta.dir, "codegen-executor.ts"), "utf8");

describe("the promotion gate is in the execute path", () => {
  test("`execute` is called with the GATED executor, never the raw one", () => {
    // The whole gate reduces to this argument. Passing `executor` here restores unconditional
    // dispatch with no test anywhere going red.
    const executeCalls = [...LOOP.matchAll(/await execute\(([^;]*?)\);/gs)].map((m) => m[1] ?? "");
    expect(executeCalls.length).toBeGreaterThan(0);
    for (const args of executeCalls) {
      expect(args).toContain("gatedExecutor");
    }
  });

  test("the gated executor is derived from the gate's decision", () => {
    expect(LOOP).toContain("executorForMode(gate.mode, executor)");
  });

  test("a dry run reports the gate too", () => {
    // "What would you pick" without "would it reach the world" is the less consequential half.
    const dryBlock = /if \(args\.dryRun\) \{([\s\S]*?)\n {2}\}/.exec(LOOP)?.[1] ?? "";
    expect(dryBlock).toContain("promotion-gate");
  });
});

describe("the control-plane halt is consulted before acting", () => {
  test("the loop reads the flags and can halt", () => {
    expect(LOOP).toContain("haltDecisionFromSource");
    expect(LOOP).toContain("halt.halted");
  });

  test("a halt blocks ACTING, not observing — a dry run still reports", () => {
    // The refusal is conditional on `!args.dryRun`, or `--dry-run` would stop being a way to ask
    // "what is this lane doing?" precisely when something has gone wrong enough to halt it.
    expect(LOOP).toMatch(/halt\.halted && !args\.dryRun/);
  });
});

describe("the merge path cannot reach the forge without a receipt", () => {
  test("the loop builds a PR-gate reader, and leaves it undefined when no forge resolved", () => {
    expect(LOOP).toContain("prGate");
    expect(LOOP).toContain("getPrGateState");
    // An ABSENT reader is what `authorizeMerge` refuses on, so the conditional is the control.
    expect(LOOP).toMatch(/forgeResult\.ok\s*\n?\s*\?/);
  });

  test("no local git merge to main survives in the merge executor", () => {
    // The deleted `mergeViaGit` bypass, pinned where it lived. Asserted as a CALL, not as the word:
    // forbidding the name outright would also forbid explaining why it is gone, and the explanation
    // is the part a future reader needs most.
    expect(EXECUTOR).not.toMatch(/mergeViaGit\s*\(/);
    expect(EXECUTOR).not.toMatch(/\[\s*"push"\s*,\s*"origin"\s*,\s*"main"\s*\]/);
  });

  test("the merge executor demands authorization before it does anything", () => {
    const authAt = EXECUTOR.indexOf("authorizeMerge(");
    const dryAt = EXECUTOR.indexOf("[dry-run] Would merge");
    expect(authAt).toBeGreaterThan(-1);
    // Before the dry-run report, so a dry run answers "would this be ALLOWED", not merely "tried".
    expect(dryAt).toBeGreaterThan(authAt);
  });

  test("a missing gh CLI refuses instead of routing around the forge", () => {
    // Scoped to `mergePullRequest`. The FIRST `ENOENT` in this file belongs to the codegen path
    // (the Claude CLI), and an unscoped `indexOf` asserted on that one instead — so a mutation
    // flipping the MERGE branch to `ok: true` survived. The mutation matrix caught it.
    const fnAt = EXECUTOR.indexOf("async function mergePullRequest");
    expect(fnAt).toBeGreaterThan(-1);
    const fn = EXECUTOR.slice(fnAt);
    const enoentAt = fn.indexOf('errCode === "ENOENT"');
    expect(enoentAt).toBeGreaterThan(-1);
    const branch = fn.slice(enoentAt, enoentAt + 400);
    expect(branch).toContain("ok: false");
    expect(branch).not.toContain("ok: true");
    expect(branch).toContain("cannot merge PR");
  });
});

describe("the room runner bounds the tick", () => {
  test("the loop ticks through a room rather than awaiting the participant directly", () => {
    expect(LOOP).toContain("createLoopRoom");
    expect(LOOP).toContain("tickRooms");
  });
});
