#!/usr/bin/env bun
/**
 * generate-indexed-z-set-treaty-transcript.ts — the TypeScript half of the `IndexedZSet` treaty.
 *
 * ── WHY THIS PAIR ────────────────────────────────────────────────────────────
 * The F#↔TypeScript sweep found six concepts implemented in both languages with nothing checking
 * they agree. `IoBoundary`, `SnapshotStore` and `RecoverableSpine` are now pinned. `IndexedZSet` is
 * the largest surface left (380 F# lines against 329 TypeScript) and it is the **DBSP core** — the
 * indexed relation every incremental join runs through. A divergence here is a divergence in the
 * query engine, not in a peripheral.
 *
 * ── FOUR REAL DIVERGENCE RISKS, EACH WITH VECTORS ────────────────────────────
 *
 * 1. **The implementations are not merely different code — they are different DATA STRUCTURES.**
 *    F# carries an `ImmutableArray` of groups PLUS a `PatriciaTree` trie, built only when the keys
 *    are integral; TypeScript carries a plain sorted array. Two representations of one idea is
 *    exactly the shape that agrees until it does not.
 *
 * 2. **Grouping equality differs in kind.** F# buckets with `Dictionary<'K,int>` under
 *    `EqualityComparer<'K>.Default`; TypeScript uses a JS `Map`, which is SameValueZero. Both then
 *    ORDER by a comparator. For ordinal string keys these agree — and that is a fact about the keys
 *    chosen, not about the code, so it is stated rather than assumed.
 *
 * 3. **Collation.** F# takes its key order from `'K : comparison`, ordinal for strings; TypeScript
 *    takes an explicit `compare`. The vectors are deliberately case-mixed, because `[B, a, A, b]`
 *    orders as `A, B, a, b` ordinally and `a, A, b, B` under a locale collation.
 *
 * 4. **The empty-group invariant.** A key whose values cancel to zero must DISAPPEAR, not survive as
 *    a group with an empty Z-set. If one side keeps it, `keyCount` and `isEmpty` disagree while
 *    every value in the structure is still identical — a divergence that reads as a counting bug
 *    long before anyone suspects the index.
 *
 * ── THE ONE PLACE THE TWO GENUINELY CANNOT AGREE, STATED UP FRONT ────────────
 * `join` multiplies weights. F# uses `Checked.(*)` on `int64` and THROWS on overflow; TypeScript
 * uses a JS number and silently loses integer precision above 2^53. There is no vector for that
 * case, because there is no agreeing answer to lock — one throws and the other lies. Naming it here
 * is the honest move: the treaty covers the arithmetic both sides can represent, and the boundary
 * is a known cliff rather than an untested region.
 *
 * Usage: bun src/Core.TypeScript/indexed-z-set/generate-indexed-z-set-treaty-transcript.ts
 */

import { writeFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import * as IZ from "./indexed-z-set";
import { ofEntries, toEntries, type Compare, type ZSet } from "../z-set/z-set";

/** Ordinal. Not `localeCompare` — see risk 3 above. */
const cmpStr: Compare<string> = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/** A source tuple: the flat `(key, value)` pair an index is built from. */
type Pair = readonly [string, string];

const cmpPair: Compare<Pair> = (a, b) => {
  const k = cmpStr(a[0], b[0]);
  return k === 0 ? cmpStr(a[1], b[1]) : k;
};

/** One flat source entry, as it appears in the transcript. */
interface SrcEntry {
  readonly k: string;
  readonly v: string;
  readonly w: number;
}

type Source = readonly SrcEntry[];

const zsetOf = (src: Source): ZSet<Pair> =>
  ofEntries(
    cmpPair,
    src.map((s) => ({ e: [s.k, s.v] as Pair, w: s.w })),
  );

const indexOf = (src: Source): IZ.IndexedZSet<string, string> =>
  IZ.indexWith(
    cmpStr,
    cmpStr,
    (p: Pair) => p[0],
    (p: Pair) => p[1],
    zsetOf(src),
  );

/** The wire shape of an index: groups in key order, each with its (value, weight) entries. */
const groupsOf = (i: IZ.IndexedZSet<string, string>) =>
  i.map((g) => ({ key: g.key, values: toEntries(g.values).map((e) => ({ e: e.e, w: e.w })) }));

/**
 * `toZSet` has DIFFERENT SIGNATURES on the two sides: F# returns `ZSet<'K * 'V>`, TypeScript takes a
 * `combine` and a comparator. So the treaty pins the (key, value) pairs and their ORDER, not the
 * signature — F# maps its tuples through the same joiner before comparing. `|` is the separator and
 * no vector key or value contains one, which is what keeps the string order equal to tuple order.
 */
const JOINER = "|";
const combined = (k: string, v: string): string => `${k}${JOINER}${v}`;

// ── The corpus ──────────────────────────────────────────────────────────────

const SOURCES: { readonly name: string; readonly src: Source }[] = [
  { name: "empty", src: [] },
  { name: "single", src: [{ k: "a", v: "x", w: 1 }] },
  {
    name: "two-keys",
    src: [
      { k: "a", v: "x", w: 1 },
      { k: "b", v: "y", w: 2 },
    ],
  },
  {
    name: "one-key-many-values",
    src: [
      { k: "a", v: "z", w: 1 },
      { k: "a", v: "x", w: 3 },
      { k: "a", v: "y", w: -2 },
    ],
  },
  {
    name: "duplicate-tuples-sum",
    src: [
      { k: "a", v: "x", w: 2 },
      { k: "a", v: "x", w: 5 },
    ],
  },
  {
    // Risk 4: this key's values cancel exactly, so the whole GROUP must vanish.
    name: "values-cancel-so-the-key-disappears",
    src: [
      { k: "a", v: "x", w: 3 },
      { k: "a", v: "x", w: -3 },
      { k: "b", v: "y", w: 1 },
    ],
  },
  {
    // …and here EVERY key cancels, so the index must be empty, not a list of empty groups.
    name: "everything-cancels",
    src: [
      { k: "a", v: "x", w: 1 },
      { k: "a", v: "x", w: -1 },
    ],
  },
  {
    // Risk 3: ordinal gives A, B, a, b — a locale collation gives a, A, b, B.
    name: "case-mixed-keys",
    src: [
      { k: "B", v: "x", w: 1 },
      { k: "a", v: "x", w: 1 },
      { k: "A", v: "x", w: 1 },
      { k: "b", v: "x", w: 1 },
    ],
  },
  {
    name: "case-mixed-values-under-one-key",
    src: [
      { k: "k", v: "B", w: 1 },
      { k: "k", v: "a", w: 1 },
      { k: "k", v: "A", w: 1 },
      { k: "k", v: "b", w: 1 },
    ],
  },
  {
    name: "negative-weights-only",
    src: [
      { k: "a", v: "x", w: -1 },
      { k: "b", v: "y", w: -4 },
    ],
  },
  {
    name: "wide",
    src: [
      { k: "k1", v: "v1", w: 1 },
      { k: "k2", v: "v2", w: 2 },
      { k: "k3", v: "v3", w: 3 },
      { k: "k1", v: "v9", w: -1 },
      { k: "k3", v: "v1", w: 7 },
    ],
  },
];

const PAIRS: readonly (readonly [string, string])[] = [
  ["empty", "single"],
  ["single", "single"],
  ["two-keys", "one-key-many-values"],
  ["one-key-many-values", "negative-weights-only"],
  ["wide", "two-keys"],
  ["case-mixed-keys", "wide"],
  // The pair that cancels an entire key across an `add`: a + (-a) must be empty.
  ["duplicate-tuples-sum", "duplicate-tuples-sum"],
];

const GET_KEYS = ["a", "b", "A", "B", "k1", "k3", "missing"];

interface Vector {
  readonly vectorType: string;
  readonly name: string;
  readonly [k: string]: unknown;
}

const byName = new Map(SOURCES.map((s) => [s.name, s.src]));
const srcOf = (name: string): Source => {
  const s = byName.get(name);
  if (s === undefined) throw new Error(`unknown source: ${name}`);
  return s;
};

const vectors: Vector[] = [];

for (const { name, src } of SOURCES) {
  const i = indexOf(src);
  vectors.push({
    vectorType: "IndexWith",
    name,
    src,
    expectedGroups: groupsOf(i),
    expectedKeyCount: IZ.keyCount(i),
    expectedTupleCount: IZ.tupleCount(i),
    expectedIsEmpty: IZ.isEmpty(i),
  });

  vectors.push({
    vectorType: "Neg",
    name,
    src,
    expectedGroups: groupsOf(IZ.neg(i)),
  });

  vectors.push({
    vectorType: "ToZSet",
    name,
    src,
    expectedPairs: toEntries(IZ.toZSet(cmpStr, combined, i)).map((e) => ({ e: e.e, w: e.w })),
  });

  for (const key of GET_KEYS) {
    vectors.push({
      vectorType: "Get",
      name: `${name}/${key}`,
      src,
      key,
      expectedValues: toEntries(IZ.get(cmpStr, i, key)).map((e) => ({ e: e.e, w: e.w })),
    });
  }
}

for (const [ln, rn] of PAIRS) {
  const a = indexOf(srcOf(ln));
  const b = indexOf(srcOf(rn));

  vectors.push({
    vectorType: "Add",
    name: `${ln}+${rn}`,
    left: srcOf(ln),
    right: srcOf(rn),
    expectedGroups: groupsOf(IZ.add(cmpStr, cmpStr, a, b)),
  });

  vectors.push({
    vectorType: "Sub",
    name: `${ln}-${rn}`,
    left: srcOf(ln),
    right: srcOf(rn),
    // a - a must be EMPTY, not a list of groups holding empty Z-sets.
    expectedGroups: groupsOf(IZ.sub(cmpStr, cmpStr, a, b)),
  });

  vectors.push({
    vectorType: "Join",
    name: `${ln}⋈${rn}`,
    left: srcOf(ln),
    right: srcOf(rn),
    // The per-key cartesian product with weights MULTIPLIED. All vectors stay far inside int64 and
    // 2^53 — see the overflow note in the header for the case deliberately not covered.
    expectedPairs: toEntries(
      IZ.join(cmpStr, cmpStr, (k, va: string, vb: string) => `${k}${JOINER}${va}${JOINER}${vb}`, a, b),
    ).map((e) => ({ e: e.e, w: e.w })),
  });
}

const out = pathJoin(import.meta.dir, "indexed-z-set-treaty-transcript.json");
writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${String(vectors.length)} vectors to ${out}`);
const byType = new Map<string, number>();
for (const v of vectors) byType.set(v.vectorType, (byType.get(v.vectorType) ?? 0) + 1);
for (const [k, n] of [...byType].sort()) console.log(`  ${k.padEnd(12)} ${String(n)}`);
