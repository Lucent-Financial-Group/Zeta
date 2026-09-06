/**
 * lane-parity.test.ts — the two `Lane` taxonomies really are one taxonomy.
 *
 * `state-machine.ts` declares its lane union under the comment
 *
 *   > Lane taxonomy (matches src/Core.TypeScript/dora-classify/classify.ts)
 *
 * and nothing checked that. A stated parity with no falsifier is the same class as a golden vector
 * nobody re-runs: it reads as a guarantee and constrains nothing. The two definitions can drift the
 * moment either file adds a lane, and the failure is quiet — `classifyPath` would return a lane the
 * agent loop's types say cannot exist, or the menu generator would weigh a lane the classifier never
 * produces.
 *
 * The check is COMPILE-TIME, because the taxonomies are types and a runtime test cannot enumerate a
 * type. `AssertNever` fails to typecheck when either exclusion is inhabited, so a divergence stops
 * the build rather than being noticed later — and the repo's tsc gate is what runs it.
 */

import { describe, expect, test } from "bun:test";
import { classifyPath, type Lane as ClassifyLane } from "../../dora-classify/classify";
import { isOperationalLane } from "./menu-generator";
import type { Lane as LoopLane } from "./state-machine";

/** Fails to compile unless `T` is `never`. */
type AssertNever<T extends never> = T;

/**
 * THE FALSIFIER. If either union gains a member the other lacks, one of these exclusions becomes
 * inhabited and `AssertNever` rejects it — a type error, in the gate, naming this file.
 */
export type LoopHasNothingExtra = AssertNever<Exclude<LoopLane, ClassifyLane>>;
export type ClassifyHasNothingExtra = AssertNever<Exclude<ClassifyLane, LoopLane>>;

/**
 * Every lane, listed once and typed as BOTH.
 *
 * The compile-time assertions above catch divergence between the unions; this catches the list
 * going stale against them, since a missing entry makes the `Record` below incomplete.
 */
const ALL_LANES: readonly LoopLane[] = [
  "operational",
  "verbatim-preservation",
  "memory",
  "heartbeat",
  "backlog-row",
  "shadow-work",
  "tooling-or-ci",
  "docs-general",
  "substrate-cascade",
  "mixed",
];

/** Exhaustive by construction: a missing key or a stray one is a type error. */
const EXHAUSTIVE: Readonly<Record<LoopLane, true>> = {
  operational: true,
  "verbatim-preservation": true,
  memory: true,
  heartbeat: true,
  "backlog-row": true,
  "shadow-work": true,
  "tooling-or-ci": true,
  "docs-general": true,
  "substrate-cascade": true,
  mixed: true,
};

describe("the loop's Lane and the classifier's Lane are one taxonomy", () => {
  test("the list is complete and matches the exhaustive record", () => {
    expect([...ALL_LANES].map(String).sort()).toEqual(Object.keys(EXHAUSTIVE).sort());
    expect(ALL_LANES.length).toBe(10);
  });

  test("a lane from the classifier is assignable to the loop's, and back", () => {
    // Not a tautology: these are two separately-declared unions in two files, and this assignment
    // is what would stop compiling if either drifted.
    const fromClassifier: ClassifyLane = classifyPath("src/Core.TypeScript/hygiene/x.ts");
    const intoLoop: LoopLane = fromClassifier;
    const back: ClassifyLane = intoLoop;
    expect(back).toBe(fromClassifier);
  });

  test("the classifier really does produce lanes the loop can weigh", () => {
    // Sampled across the prefix rules, so this exercises the classifier rather than one branch.
    const paths = [
      "docs/agent-heartbeats/2026-09-03.md",
      "docs/backlog/P1/x.md",
      "src/Core.TypeScript/hygiene/audit.ts",
      "docs/other/thing.md",
      "src/Core/Runtime.fs",
    ];
    const produced = new Set<LoopLane>();
    for (const p of paths) {
      const lane: LoopLane = classifyPath(p);
      expect(ALL_LANES).toContain(lane);
      produced.add(lane);
    }
    // More than one distinct lane, or the sample proved nothing about the taxonomy.
    expect(produced.size).toBeGreaterThan(1);
  });

  test("EXACTLY ONE lane is operational — the two-mandate split has a single pivot", () => {
    const operational = ALL_LANES.filter(isOperationalLane);
    expect(operational).toEqual(["operational"]);
  });
});
