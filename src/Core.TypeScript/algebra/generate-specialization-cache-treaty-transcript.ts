#!/usr/bin/env bun
/**
 * generate-specialization-cache-treaty-transcript.ts — the TypeScript half of the
 * `SpecializationCache` treaty, and the last of the six unpinned pairs the sweep found.
 *
 * ── WHAT THE TWO SIDES ACTUALLY SHARE ────────────────────────────────────────
 * Less than the matching name suggests, and saying so is part of the treaty rather than a caveat
 * on it:
 *
 *   F#  `SpecializationCache<'TInput,'TOutput>(specializer)` — generic over ANY specializer. No IR,
 *       no Futamura projection, no mix. Just the caching discipline.
 *   TS  the same caching discipline, PLUS `specialize(ir)` — the actual 1st Futamura projection
 *       over a mix IR — and a multi-IR registry. Neither has an F# counterpart.
 *
 * So the treaty pins the **cache state machine**, which is the whole of the F# module and the part
 * of the TypeScript one that claims to be the same idea. Pinning `specialize` would be pinning a
 * TypeScript-only feature against nothing, which is worse than leaving it unpinned: it would look
 * like cross-language coverage while checking one implementation against itself.
 *
 * ── THE PROPERTY WORTH PINNING, AND WHY IT IS SUBTLE ─────────────────────────
 * **Errors are never cached.** Both modules say so in a comment, in capitals. It is the one rule
 * here that is easy to get wrong in a way nothing notices: a cache that remembers a failure looks
 * *more* correct on the happy path (fewer regenerations) and turns a transient specializer fault
 * into a permanent one. A failing call must increment BOTH `misses` and `errors`, clear the cache,
 * and rethrow — so the very next call retries and can succeed.
 *
 * ── WHAT CANNOT BE PINNED, STATED PLAINLY ────────────────────────────────────
 * GC. F# holds the specialized function in a `WeakReference`; TypeScript in a `WeakRef` with a
 * `FinalizationRegistry`. Whether a collection happens between two calls is not observable,
 * reproducible, or the same across runtimes, so there is NO vector for it. Every script below uses
 * `invalidate()` — the deterministic door to the same code path — and the counters therefore
 * describe a run in which nothing was collected. TypeScript's `regenerations` counter is fed only by
 * the finalization callback and so is deliberately absent from the transcript: it has no F#
 * counterpart and no deterministic value.
 *
 * Usage: bun src/Core.TypeScript/algebra/generate-specialization-cache-treaty-transcript.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSpecializationCache, type CacheableIr, type SpecializedMix } from "./specialization-cache";

/** The IR is inert here: the treaty supplies its own specializer, so nothing reads these fields. */
const INERT_IR: CacheableIr = { generator: "treaty", width: 64, ops: [] };

/**
 * The specialized function both languages build: `x -> x * 2 + 1`.
 *
 * Deliberately trivial and deliberately small. The treaty is about WHEN the specializer runs, not
 * what it computes, and every value below stays far inside both `int64` and `bigint` so the
 * arithmetic cannot become the thing under test.
 */
const SPECIALIZED = (x: bigint): bigint => x * 2n + 1n;

type Step =
  { readonly op: "run"; readonly input: number } | { readonly op: "invalidate" } | { readonly op: "failNext" };

interface Script {
  readonly name: string;
  readonly why: string;
  readonly steps: readonly Step[];
}

const SCRIPTS: readonly Script[] = [
  {
    name: "first call specializes, the rest hit",
    why: "the baseline: one miss, then hits — a cache that missed every time would still be correct and would be pointless",
    steps: [
      { op: "run", input: 1 },
      { op: "run", input: 2 },
      { op: "run", input: 3 },
    ],
  },
  {
    name: "invalidate forces exactly one regeneration",
    why: "the deterministic door to the GC path — one miss after, then hits again, not a permanent miss",
    steps: [
      { op: "run", input: 1 },
      { op: "run", input: 2 },
      { op: "invalidate" },
      { op: "run", input: 3 },
      { op: "run", input: 4 },
    ],
  },
  {
    name: "invalidate before any call is not an extra miss",
    why: "invalidating an empty cache must be a no-op, not an event",
    steps: [{ op: "invalidate" }, { op: "run", input: 5 }, { op: "run", input: 6 }],
  },
  {
    name: "two invalidations in a row cost one regeneration",
    why: "the counter tracks regenerations, not invalidate calls",
    steps: [
      { op: "run", input: 1 },
      { op: "invalidate" },
      { op: "invalidate" },
      { op: "run", input: 2 },
      { op: "run", input: 3 },
    ],
  },
  {
    name: "AN ERROR IS NEVER CACHED",
    why: "the rule both modules state in capitals: a failing call increments misses AND errors, clears the cache, and rethrows — so the next call retries and succeeds",
    steps: [{ op: "failNext" }, { op: "run", input: 1 }, { op: "run", input: 2 }, { op: "run", input: 3 }],
  },
  {
    name: "an error after a warm cache does not poison it",
    why: "the failure clears the cache, so the following call is a MISS that succeeds — never a hit on a stale function, never a permanent failure",
    steps: [
      { op: "run", input: 1 },
      { op: "run", input: 2 },
      { op: "invalidate" },
      { op: "failNext" },
      { op: "run", input: 3 },
      { op: "run", input: 4 },
      { op: "run", input: 5 },
    ],
  },
  {
    name: "two failures in a row each count",
    why: "errors are invocations, not identities — a specializer failing twice is visibly not a specializer failing once",
    steps: [
      { op: "failNext" },
      { op: "run", input: 1 },
      { op: "failNext" },
      { op: "run", input: 2 },
      { op: "run", input: 3 },
    ],
  },
];

interface Observation {
  readonly step: number;
  readonly op: string;
  /** The result as a decimal string, or null when the step threw or produced no value. */
  readonly result: string | null;
  readonly threw: boolean;
  readonly hits: number;
  readonly misses: number;
  readonly errors: number;
}

function runScript(script: Script): Observation[] {
  let failNext = false;
  const specializeFn = (_ir: CacheableIr): SpecializedMix => {
    if (failNext) {
      failNext = false;
      throw new Error("specializer failed (treaty fixture)");
    }
    return SPECIALIZED;
  };

  const cache = createSpecializationCache(INERT_IR, specializeFn);
  const out: Observation[] = [];

  script.steps.forEach((step, i) => {
    let result: string | null = null;
    let threw = false;

    if (step.op === "invalidate") {
      cache.invalidate();
    } else if (step.op === "failNext") {
      failNext = true;
    } else {
      try {
        result = cache.run(BigInt(step.input)).toString();
      } catch {
        threw = true;
      }
    }

    out.push({
      step: i,
      op: step.op,
      result,
      threw,
      hits: cache.stats.hits,
      misses: cache.stats.misses,
      errors: cache.stats.errors,
    });
  });

  return out;
}

const vectors = SCRIPTS.map((s) => ({
  vectorType: "CacheScript",
  name: s.name,
  why: s.why,
  steps: s.steps,
  expected: runScript(s),
}));

const out = join(import.meta.dir, "specialization-cache-treaty-transcript.json");
writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${String(vectors.length)} vectors to ${out}`);
for (const v of vectors) {
  const last = v.expected[v.expected.length - 1];
  console.log(
    `  ${v.name.padEnd(48)} hits=${String(last?.hits ?? 0)} misses=${String(last?.misses ?? 0)} errors=${String(last?.errors ?? 0)}`,
  );
}
