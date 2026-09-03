#!/usr/bin/env bun
/**
 * generate-io-boundary-treaty-transcript.ts — the cross-language treaty for the I/O boundary.
 *
 * ── WHY THIS PAIR, AND HOW IT WAS FOUND ──────────────────────────────────────
 * A systematic sweep of the 535 F# modules against the 1411 TypeScript ones found 68 concepts
 * implemented in BOTH languages. 62 are pinned by a treaty or golden vectors. Six were not:
 *
 *   ErasureCharge · IndexedZSet · IoBoundary · RecoverableSpine · SnapshotStore · SpecializationCache
 *
 * An unpinned pair is two implementations of one idea with nothing checking they agree — the exact
 * divergence the four-oracle byte-lock discipline exists to price. `IoBoundary` is the one taken
 * first because it is the §13 noninterference membrane: it decides what leaves the interior. If the
 * two sides disagreed, one of them would leak a fact the other retracted.
 *
 * ── THE DIVERGENCE RISK THAT MADE IT WORTH DOING ─────────────────────────────
 * F# `IoBoundary.fuse` DELEGATES to `FusionReconstruction.fuse`. TypeScript `fuse` REIMPLEMENTS the
 * filter inline (`entry.w > 0`). They agree today — I read both — and "they agree today" is a
 * statement with a shelf life. That is what a treaty converts into a statement that stays true.
 *
 * The second risk is ORDER. Both sides keep an ascending-key-sorted Z-set, but F# gets its order
 * from `'K : comparison` (ordinal for strings) while TypeScript takes an explicit `compare`. A
 * `localeCompare` anywhere on the TS side would reorder mixed-case keys and the exterior arrays
 * would differ. The string vectors below are deliberately case-mixed so that difference cannot hide.
 *
 * ── WHAT IS NOT IN THE TREATY ────────────────────────────────────────────────
 * `input` and `genesis` take a caller-supplied ledger, so they are covered through the ledgers every
 * vector already carries rather than as separate shapes. Nothing here is excluded for convenience.
 *
 * Usage: bun src/Core.TypeScript/io-boundary/generate-io-boundary-treaty-transcript.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as IO from "./io-boundary";
import * as ZSet from "../z-set/z-set";

/** A ledger key: the string ledgers and the numeric ones share one transcript. */
type Key = string | number;

/** Ordinal, like F#'s structural comparison on strings. NOT `localeCompare`. */
const cmpStr: ZSet.Compare<Key> = (a, b) => {
  const x = String(a);
  const y = String(b);
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
};

const cmpNum: ZSet.Compare<Key> = (a, b) => Number(a) - Number(b);

interface Entry {
  readonly e: Key;
  readonly w: number;
}

type LedgerSpec = readonly Entry[];

function ledgerOf(spec: LedgerSpec, numeric: boolean): ZSet.ZSet<Key> {
  const entries = spec.map((x) => ({ e: x.e, w: x.w }));
  return ZSet.ofEntries(numeric ? cmpNum : cmpStr, entries);
}

interface FuseVector {
  readonly vectorType: "Fuse";
  readonly numeric: boolean;
  readonly ledger: LedgerSpec;
  readonly expectedExterior: readonly (string | number)[];
  readonly expectedCount: number;
  readonly expectedIsEmpty: boolean;
}

interface ComposeVector {
  readonly vectorType: "ComposeThenFuse";
  readonly numeric: boolean;
  readonly left: LedgerSpec;
  readonly right: LedgerSpec;
  readonly expectedExterior: readonly (string | number)[];
}

interface ComposeAllVector {
  readonly vectorType: "ComposeAllThenFuse";
  readonly numeric: boolean;
  readonly ledgers: readonly LedgerSpec[];
  readonly expectedExterior: readonly (string | number)[];
}

interface ContainsVector {
  readonly vectorType: "Contains";
  readonly numeric: boolean;
  readonly ledger: LedgerSpec;
  readonly key: string | number;
  readonly expected: boolean;
}

interface EmitRetractVector {
  readonly vectorType: "EmitRetractThenFuse";
  readonly ops: readonly { readonly op: "emit" | "retract"; readonly key: string }[];
  readonly expectedExterior: readonly string[];
}

type Vector = FuseVector | ComposeVector | ComposeAllVector | ContainsVector | EmitRetractVector;

// ── The ledgers, chosen so each sharp edge has a vector ───────────────────────

const STRING_LEDGERS: readonly LedgerSpec[] = [
  [],
  [{ e: "a", w: 1 }],
  [{ e: "a", w: 0 }], // zero is ABSENT from the exterior, not "present with no weight"
  [{ e: "a", w: -1 }], // negative is absent
  [{ e: "a", w: 5 }], // multiplicity does NOT leak: one appearance, not five
  // Case-mixed, so an ordinal-vs-locale difference in the sort cannot hide.
  [
    { e: "B", w: 1 },
    { e: "a", w: 1 },
    { e: "A", w: 1 },
    { e: "b", w: 1 },
  ],
  [
    { e: "z", w: 3 },
    { e: "y", w: -2 },
    { e: "x", w: 1 },
    { e: "w", w: 0 },
  ],
  [
    { e: "k1", w: 1 },
    { e: "k2", w: -1 },
    { e: "k3", w: 2 },
  ],
];

const NUMERIC_LEDGERS: readonly LedgerSpec[] = [
  [],
  [{ e: 0, w: 1 }],
  [
    { e: 3, w: 1 },
    { e: 1, w: -1 },
    { e: 2, w: 0 },
    { e: -5, w: 4 },
  ],
];

const vectors: Vector[] = [];

for (const numeric of [false, true]) {
  for (const spec of numeric ? NUMERIC_LEDGERS : STRING_LEDGERS) {
    const inside = IO.input(ledgerOf(spec, numeric));
    const outside = IO.fuse(inside);
    vectors.push({
      vectorType: "Fuse",
      numeric,
      ledger: spec,
      expectedExterior: IO.toArray(outside),
      expectedCount: IO.count(outside),
      expectedIsEmpty: IO.isEmpty(outside),
    });
  }
}

// Compose BEFORE fusing — the whole point of the boundary: signed evidence cancels inside.
const COMPOSE_PAIRS: readonly (readonly [LedgerSpec, LedgerSpec])[] = [
  [[{ e: "a", w: 1 }], [{ e: "a", w: -1 }]], // cancels to absent
  [[{ e: "a", w: 1 }], [{ e: "a", w: 1 }]], // +2, still ONE appearance
  [[{ e: "a", w: 2 }], [{ e: "a", w: -1 }]], // +1, present
  [[{ e: "a", w: 1 }], [{ e: "b", w: -1 }]],
  [
    [
      { e: "b", w: 1 },
      { e: "A", w: 1 },
    ],
    [
      { e: "a", w: 1 },
      { e: "B", w: -1 },
    ],
  ],
  [[], [{ e: "a", w: 1 }]],
  [[{ e: "a", w: 1 }], []],
];

for (const [l, r] of COMPOSE_PAIRS) {
  const composed = IO.compose(cmpStr, IO.input(ledgerOf(l, false)), IO.input(ledgerOf(r, false)));
  vectors.push({
    vectorType: "ComposeThenFuse",
    numeric: false,
    left: l,
    right: r,
    expectedExterior: IO.toArray(IO.fuse(composed)),
  });
}

const COMPOSE_ALL: readonly (readonly LedgerSpec[])[] = [
  [],
  [[{ e: "a", w: 1 }]],
  [[{ e: "a", w: 1 }], [{ e: "a", w: -1 }], [{ e: "a", w: 1 }]],
  [[{ e: "a", w: 1 }], [{ e: "b", w: 1 }], [{ e: "a", w: -1 }], [{ e: "c", w: 2 }]],
];

for (const ledgers of COMPOSE_ALL) {
  const composed = IO.composeAll(
    cmpStr,
    ledgers.map((l) => IO.input(ledgerOf(l, false))),
  );
  vectors.push({
    vectorType: "ComposeAllThenFuse",
    numeric: false,
    ledgers,
    expectedExterior: IO.toArray(IO.fuse(composed)),
  });
}

for (const spec of STRING_LEDGERS) {
  for (const key of ["a", "A", "b", "zzz"]) {
    const outside = IO.fuse(IO.input(ledgerOf(spec, false)));
    vectors.push({
      vectorType: "Contains",
      numeric: false,
      ledger: spec,
      key,
      expected: IO.contains(cmpStr, key, outside),
    });
  }
}

// emit/retract compose exactly like any other signed evidence — pinned as its own shape because it
// is the boundary's stated purpose: "emits and retracts can cancel before observation".
const OP_RUNS: readonly (readonly { op: "emit" | "retract"; key: string }[])[] = [
  [{ op: "emit", key: "a" }],
  [
    { op: "emit", key: "a" },
    { op: "retract", key: "a" },
  ],
  [
    { op: "emit", key: "a" },
    { op: "emit", key: "a" },
    { op: "retract", key: "a" },
  ],
  [
    { op: "retract", key: "a" },
    { op: "emit", key: "a" },
  ],
  [
    { op: "emit", key: "b" },
    { op: "emit", key: "a" },
    { op: "retract", key: "b" },
    { op: "emit", key: "C" },
  ],
];

for (const ops of OP_RUNS) {
  const insides = ops.map((o) => (o.op === "emit" ? IO.emit(o.key) : IO.retract(o.key)));
  const composed = IO.composeAll(cmpStr, insides);
  vectors.push({
    vectorType: "EmitRetractThenFuse",
    ops,
    expectedExterior: IO.toArray(IO.fuse(composed)).map(String),
  });
}

const out = join(import.meta.dir, "io-boundary-treaty-transcript.json");
writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${String(vectors.length)} vectors to ${out}`);
const byType = new Map<string, number>();
for (const v of vectors) byType.set(v.vectorType, (byType.get(v.vectorType) ?? 0) + 1);
for (const [k, n] of [...byType].sort()) console.log(`  ${k.padEnd(22)} ${String(n)}`);
