#!/usr/bin/env bun
/**
 * generate-erasure-charge-treaty-transcript.ts — the TypeScript half of the `ErasureCharge` treaty.
 *
 * ── WHY THIS PAIR ────────────────────────────────────────────────────────────
 * The last of the six unpinned F#↔TypeScript pairs the sweep found, alongside `SpecializationCache`.
 * `ErasureCharge` is the module that decides **what an operation costs** — and, more importantly,
 * what happens when nobody knows. Its whole design is a refusal: an unmeasured operation must not
 * charge zero, so a total is a `Complete` reading or a `LowerBound` carrying its named holes, and
 * there is no accessor anywhere that hands back the number alone.
 *
 * A refusal implemented twice is exactly the thing worth pinning. If one side folds an unmeasured
 * posting to zero while the other carries a hole, the two runtimes disagree about whether an
 * account is trustworthy — and the disagreement is invisible, because both return a number.
 *
 * ── THE DIVERGENCE RISKS, EACH WITH VECTORS ──────────────────────────────────
 *
 * 1. **Hole ORDER.** F#'s `Ledger.Holes` is `Map.toList` — an ordered map, so holes come out sorted
 *    by key. TypeScript's `settle` built its holes in a JS `Map` and returned insertion order. Those
 *    differ whenever the first-seen order is not ordinal order, and `renderReading` joins hole keys
 *    into a human-facing line, so the same account renders differently in the two runtimes. Worse
 *    for §7 DST: a reading whose rendering depends on the order postings arrived is not replayable
 *    in the observable sense.
 *
 * 2. **Observation order.** F#'s `Account.Observations` sorts with `String.CompareOrdinal`,
 *    explicitly and with a comment saying never a culture collation. TypeScript's `settleAll`
 *    returned a `Map` in insertion order.
 *
 * 3. **`Charged 0` must be unrepresentable.** Both sides require `fibre > 1 && ppm > 0` before
 *    charging, so a zero charge can only arrive through `Free`, which requires a MEASURED fibre of
 *    1. A side that relaxed either guard would let an unmeasured operation reach zero by a second
 *    route.
 *
 * 4. **Fail-closed on self-contradiction.** `Reversible` over a wide fibre, `Erasing` over a fibre
 *    of 1, `Unmeasured` carrying a sweep, and `Unmeasured` with a blank reason must all be
 *    `Malformed` and land in the hole set — never contribute a quiet zero.
 *
 * ── WHAT IS DELIBERATELY NOT PINNED, AND WHY ─────────────────────────────────
 * The COMPLAINT PROSE. F# formats the classification through its DU (`Reversible`), TypeScript
 * through its string literal (`reversible`), so the two texts differ in case and always will. These
 * are independently worded diagnostics for a human reader, not protocol — locking them would force
 * one language to spell its own type system's vocabulary the other's way, for no gain.
 *
 * What IS pinned about a hole is everything a consumer acts on: that it exists, its KEY, its ORDER,
 * and its DISPOSITION KIND. The transcript carries the prose too, so a reader can see both, and the
 * F# test asserts the prose is non-empty and mentions the fibre and ppm — a real property, rather
 * than byte equality that would be a lie about what the two modules promise.
 *
 * Usage: bun src/Core.TypeScript/algebra/generate-erasure-charge-treaty-transcript.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { dispositionOf, settle, settleAll } from "./erasure-charge";
import { profileKey, type ErasureProfile } from "./erasure-class";

// ── The corpus ──────────────────────────────────────────────────────────────

const sweep = (domain: string, largestFibre: number, bitsErasedPpm: number) =>
  ({ kind: "exhaustive-sweep", domain, largestFibre, bitsErasedPpm }) as const;

const bounded = (model: string, largestFibre: number, bitsErasedPpm: number) =>
  ({ kind: "bounded-model-sweep", model, largestFibre, bitsErasedPpm }) as const;

const unswept = (reason: string) => ({ kind: "no-admissible-measurement", reason }) as const;

const PROFILES: Record<string, ErasureProfile> = {
  // ── the two measured, well-formed cases ──
  free: {
    representation: "InMemoryDeltaLog",
    operation: "AppendAsync",
    observation: "log-read-surface",
    recoveryChannel: "the entry is still readable by replay",
    classification: "reversible",
    evidence: sweep("all 4-entry logs", 1, 0),
  },
  chargedSmall: {
    representation: "InMemoryDeltaLog",
    operation: "TruncateAsync",
    observation: "log-read-surface",
    recoveryChannel: "nothing — the entries are unlinked",
    classification: "erasing",
    evidence: sweep("all 4-entry logs", 2, 1_000_000),
  },
  chargedLarge: {
    representation: "Spine",
    operation: "consolidate",
    observation: "log-read-surface",
    recoveryChannel: "nothing",
    classification: "erasing",
    evidence: bounded("fibre capped at 13 by the pinned quota", 13, 3_700_440),
  },

  // ── the hole: honestly unmeasured ──
  unmeasured: {
    representation: "ZetaFsDeltaLog",
    operation: "TruncateAsync",
    observation: "physical-medium",
    recoveryChannel: "unknown — the medium may or may not retain the blocks",
    classification: "unmeasured",
    evidence: unswept("a real filesystem is not enumerable; block reuse is the storage layer's business"),
  },

  // ── risk 4: four ways a declaration can contradict its own evidence ──
  malformedReversibleWideFibre: {
    representation: "Broken",
    operation: "claimsFreeButIsNot",
    observation: "log-read-surface",
    recoveryChannel: "claimed reversible over a fibre of 4",
    classification: "reversible",
    evidence: sweep("a domain where it collapses 4 to 1", 4, 2_000_000),
  },
  malformedErasingUnitFibre: {
    representation: "Broken",
    operation: "claimsCostButIsInjective",
    observation: "log-read-surface",
    recoveryChannel: "claimed erasing over an injective map",
    classification: "erasing",
    evidence: sweep("an injective domain", 1, 0),
  },
  malformedUnmeasuredWithSweep: {
    representation: "Broken",
    operation: "claimsUnknownButWasSwept",
    observation: "physical-medium",
    recoveryChannel: "claimed unmeasured while carrying a sweep",
    classification: "unmeasured",
    evidence: sweep("a domain that was in fact enumerated", 2, 1_000_000),
  },
  malformedUnmeasuredBlankReason: {
    // A hole must say WHY it is a hole. A blank reason is a hole with no accountability, so it
    // fails closed into `Malformed` rather than being accepted as an honest unknown.
    representation: "Broken",
    operation: "holeWithNoReason",
    observation: "physical-medium",
    recoveryChannel: "unknown",
    classification: "unmeasured",
    evidence: unswept("   "),
  },

  // ── a second observation, so the refusal-to-average has something to refuse ──
  otherObservationCharged: {
    representation: "GitDeltaLog",
    operation: "TruncateAsync",
    observation: "commit-dag",
    recoveryChannel: "the commit DAG still holds every entry",
    classification: "erasing",
    evidence: sweep("all 4-entry logs", 2, 1_000_000),
  },
  // Ordinally, "commit-dag" < "log-read-surface" < "physical-medium". Posting order below is
  // deliberately NOT that order, so risk 2 has something to catch.
  otherObservationFree: {
    representation: "GitDeltaLog",
    operation: "AppendAsync",
    observation: "commit-dag",
    recoveryChannel: "the commit is addressable",
    classification: "reversible",
    evidence: sweep("all 4-entry logs", 1, 0),
  },
};

/** A settle run: an ordered list of postings, named by the profile keys above. */
const SETTLE_RUNS: { readonly name: string; readonly postings: readonly string[] }[] = [
  { name: "nothing-posted", postings: [] },
  { name: "one-free", postings: ["free"] },
  { name: "one-charged", postings: ["chargedSmall"] },
  // Repeating a profile charges AGAIN — identity is idempotent, use is cumulative.
  { name: "same-charge-three-times", postings: ["chargedSmall", "chargedSmall", "chargedSmall"] },
  { name: "free-does-not-reduce-the-charge", postings: ["chargedSmall", "free", "free"] },
  { name: "two-different-charges", postings: ["chargedSmall", "chargedLarge"] },
  // One hole makes the WHOLE reading a lower bound, however much else was measured.
  { name: "one-hole-among-many-measured", postings: ["chargedSmall", "chargedLarge", "free", "unmeasured"] },
  // …and hitting it repeatedly keeps the hole SET at one while the posting count rises.
  { name: "the-same-hole-repeatedly", postings: ["unmeasured", "unmeasured", "unmeasured"] },
  {
    // RISK 1: these hole keys are posted in an order that is NOT their ordinal order.
    // "Broken::claimsFreeButIsNot::…" sorts before "ZetaFsDeltaLog::…", but is posted second.
    name: "holes-posted-out-of-ordinal-order",
    postings: ["unmeasured", "malformedReversibleWideFibre", "malformedErasingUnitFibre"],
  },
  {
    name: "every-malformed-shape",
    postings: [
      "malformedReversibleWideFibre",
      "malformedErasingUnitFibre",
      "malformedUnmeasuredWithSweep",
      "malformedUnmeasuredBlankReason",
    ],
  },
];

/** A settleAll run: postings spanning several observations, in a deliberately non-ordinal order. */
const ACCOUNT_RUNS: { readonly name: string; readonly postings: readonly string[] }[] = [
  { name: "empty-account", postings: [] },
  {
    // RISK 2: "physical-medium" is posted first, "commit-dag" last — the reverse of ordinal order.
    name: "three-observations-posted-in-reverse-ordinal-order",
    postings: ["unmeasured", "chargedSmall", "free", "otherObservationCharged", "otherObservationFree"],
  },
  {
    // One observation complete, another a lower bound. The plural return type is the refusal to
    // average, so both readings must survive side by side.
    name: "one-observation-complete-another-not",
    postings: ["otherObservationCharged", "unmeasured"],
  },
];

const profileOf = (name: string): ErasureProfile => {
  const p = PROFILES[name];
  if (p === undefined) throw new Error(`unknown profile: ${name}`);
  return p;
};

/** The wire shape of a profile — everything F# needs to rebuild the identical declaration. */
const wireProfile = (p: ErasureProfile) => ({
  representation: p.representation,
  operation: p.operation,
  observation: p.observation,
  recoveryChannel: p.recoveryChannel,
  classification: p.classification,
  evidence: p.evidence,
});

const wireReading = (r: ReturnType<typeof settle>) => ({
  bitsPpm: r.bitsPpm,
  complete: r.complete,
  holeKeys: r.holes.map((h) => h.key),
  // Carried so a reader can see both languages' wording. NOT asserted byte-for-byte — see the
  // header: the two are independently authored diagnostics, and F# spells its own DU cases.
  holeWhy: r.holes.map((h) => h.why),
  chargedPostings: r.chargedPostings,
  freePostings: r.freePostings,
  holePostings: r.holePostings,
});

interface Vector {
  readonly vectorType: string;
  readonly name: string;
  readonly [k: string]: unknown;
}

const vectors: Vector[] = [];

for (const [name, p] of Object.entries(PROFILES)) {
  const d = dispositionOf(p);
  vectors.push({
    vectorType: "Disposition",
    name,
    profile: wireProfile(p),
    key: profileKey(p),
    expectedKind: d.kind,
    expectedBitsPpm: d.kind === "charged" ? d.bitsPpm : null,
    expectedReason: d.kind === "unmeasured" ? d.reason : null,
  });
}

for (const run of SETTLE_RUNS) {
  const postings = run.postings.map(profileOf);
  vectors.push({
    vectorType: "Settle",
    name: run.name,
    postings: postings.map(wireProfile),
    expected: wireReading(settle(postings)),
  });
}

for (const run of ACCOUNT_RUNS) {
  const postings = run.postings.map(profileOf);
  const account = settleAll(postings);
  vectors.push({
    vectorType: "SettleAll",
    name: run.name,
    postings: postings.map(wireProfile),
    // The ORDER of these is part of the claim, not incidental — risk 2.
    expectedObservations: [...account.keys()],
    expectedReadings: [...account.values()].map(wireReading),
  });
}

const out = join(import.meta.dir, "erasure-charge-treaty-transcript.json");
writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${String(vectors.length)} vectors to ${out}`);
const byType = new Map<string, number>();
for (const v of vectors) byType.set(v.vectorType, (byType.get(v.vectorType) ?? 0) + 1);
for (const [k, n] of [...byType].sort()) console.log(`  ${k.padEnd(12)} ${String(n)}`);
