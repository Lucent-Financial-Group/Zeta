#!/usr/bin/env bun
/**
 * generate-hat-treaty-transcript.ts — emit the cross-language treaty for the Hat/Persona migration.
 *
 * THE MECHANISM, and why a transcript rather than "two careful implementations". `src/Core/Hat.fs`
 * and `src/Core/Persona.fs` are canonical; `hat.ts` / `persona.ts` / `action-grammar.ts` are the
 * TypeScript oracle. Two implementations of the same semantics drift the moment someone edits one,
 * and no amount of care prevents it — so the pairing is checked mechanically: this file computes
 * every expected value with the TS implementation, and `tests/Tests.FSharp/HatTreaty.Tests.fs`
 * replays the same inputs through the F# and asserts equality. Either side changing behaviour
 * reddens that test.
 *
 * Same shape as the `WorkflowEngine.fs` treaty already in the repo
 * (`workflow-treaty-transcript.json` + `WorkflowEngine.Tests.fs`), deliberately — a second
 * convention for the same job would be its own kind of drift.
 *
 * ── What is in the treaty, and what cannot be ────────────────────────────────
 * Everything serializable: the action lattice, the grid mapping and BOTH its boundary rules
 * (`single` masks, `ofGrid` clamps), hat addressing, the allow-list semantics including the
 * empty-means-unrestricted inversion, and the persona wearing algebra (wear/doff/wearAll/decide/
 * route/hatFlags/allowedActions/lenses/landmarks/controls).
 *
 * `Traversal` is EXCLUDED, and by nature rather than convenience: `Traversal.Traversal<'r>` carries
 * functions, which do not survive JSON. `Persona.traversals` is therefore the one ported function
 * with no treaty vector — stated here so the gap is a known limit rather than an unnoticed hole.
 *
 * Usage: bun src/Core.TypeScript/hat/generate-hat-treaty-transcript.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as AG from "./action-grammar";
import * as H from "./hat";
import * as P from "./persona";

type Ground = { readonly tag: "Constant"; readonly value: number } | { readonly tag: "Monotonic"; readonly value: number } | { readonly tag: "Erratic" };
type Lens = { readonly name: string; readonly cells: readonly string[] };
type TreatyHat = H.Hat<Lens, Ground, never>;

const vectors: unknown[] = [];

// ── fixtures ────────────────────────────────────────────────────────────────

const A_EMPTY = AG.bottom();
const A_FULL = AG.top();
const A_0 = AG.single(0);
const A_5 = AG.single(5);
const A_0_5 = AG.ofKeys([0, 5]);
const A_ODD = AG.ofKeys([1, 3, 5, 7, 9, 11, 13, 15]);

const ACTIONS: readonly AG.Action[] = [A_EMPTY, A_FULL, A_0, A_5, A_0_5, A_ODD];

const lensA: Lens = { name: "lens-a", cells: ["PC", "I"] };
const lensB: Lens = { name: "lens-b", cells: ["V0"] };

const hatUnrestricted: TreatyHat = {
  name: "architect",
  scope: "Meta",
  lenses: [lensA],
  landmarks: [["PC", { tag: "Constant", value: 7 }]],
  allowedActions: [], // EMPTY = UNRESTRICTED — the inversion the treaty must pin
  traversals: [],
  controls: ["reducer"],
};

const hatRestricted: TreatyHat = {
  name: "reducer",
  scope: "GameSpecific",
  lenses: [lensB],
  landmarks: [["V0", { tag: "Monotonic", value: -1 }]],
  allowedActions: [A_0, A_5],
  traversals: [],
  controls: [],
};

const hatAlsoRestricted: TreatyHat = {
  name: "critic",
  scope: "GameSpecific",
  lenses: [lensA, lensB],
  landmarks: [["I", { tag: "Erratic" }]],
  allowedActions: [A_5, A_0_5],
  traversals: [],
  controls: ["reducer", "architect"],
};

const HATS: readonly TreatyHat[] = [hatUnrestricted, hatRestricted, hatAlsoRestricted];

// ── ActionGrammar ───────────────────────────────────────────────────────────

for (const a of ACTIONS) {
  for (const b of ACTIONS) {
    vectors.push({
      vectorType: "Lattice",
      a,
      b,
      join: AG.join(a, b),
      meet: AG.meet(a, b),
      complementA: AG.complement(a),
      leqAB: AG.leq(a, b),
      weightA: AG.weight(a),
      keysA: AG.keys(a),
    });
  }
}

// Boundaries matter: `single` MASKS (k & 0xF) so 16 -> 0 and -1 -> 15.
for (const k of [0, 1, 5, 15, 16, 17, 31, -1, -16]) {
  vectors.push({ vectorType: "Single", k, expected: AG.single(k) });
}

// `ofGrid` CLAMPS — the opposite rule to `single`, on purpose.
for (const row of [-2, -1, 0, 1, 2, 3, 4, 9]) {
  for (const col of [-2, -1, 0, 1, 2, 3, 4, 9]) {
    vectors.push({ vectorType: "OfGrid", row, col, expected: AG.ofGrid(row, col) });
  }
}

for (const k of [0, 1, 4, 5, 7, 15]) {
  const [row, col] = AG.toGrid(k);
  vectors.push({ vectorType: "ToGrid", k, row, col });
}

// out-of-range keys are IGNORED by ofKeys (neither clamped nor masked)
for (const ks of [[], [0], [0, 5], [15], [16], [-1], [0, 16, 5, -3, 15]]) {
  vectors.push({ vectorType: "OfKeys", ks, expected: AG.ofKeys(ks) });
}

for (const k of [-1, 0, 5, 15, 16]) {
  for (const a of [A_EMPTY, A_FULL, A_0_5]) {
    vectors.push({ vectorType: "Holds", k, a, expected: AG.holds(k, a) });
  }
}

// ── Hat ─────────────────────────────────────────────────────────────────────

for (const hat of HATS) {
  for (const gameKey of ["g1", "chip8-fingerprint"]) {
    vectors.push({ vectorType: "HatAddress", gameKey, hat, expected: H.address(gameKey, hat) });
  }
  vectors.push({ vectorType: "HatLandmarkCells", hat, expected: H.landmarkCells(hat) });
  vectors.push({ vectorType: "HatIsPersona", hat, expected: H.isPersona(hat) });
  for (const other of ["reducer", "architect", "absent"]) {
    vectors.push({ vectorType: "HatControls", other, hat, expected: H.controls(other, hat) });
  }
  for (const action of ACTIONS) {
    vectors.push({ vectorType: "HatPermits", action, hat, expected: H.permits(action, hat) });
  }
  vectors.push({ vectorType: "HatRestrict", actions: ACTIONS, hat, expected: H.restrict(ACTIONS, hat) });
}

vectors.push({ vectorType: "HatPersonasOf", hats: HATS, expected: H.personas(HATS).map(h => h.name) });
vectors.push({ vectorType: "HatGameSpecificOf", hats: HATS, expected: H.gameSpecific(HATS).map(h => h.name) });

// ── Persona ─────────────────────────────────────────────────────────────────

type Op =
  | { readonly tag: "Wear"; readonly hatName: string }
  | { readonly tag: "Doff"; readonly hatName: string }
  | { readonly tag: "WearAll" }
  | { readonly tag: "Decide"; readonly chosen: readonly string[] };

const OP_SEQUENCES: readonly (readonly Op[])[] = [
  [],
  [{ tag: "Wear", hatName: "architect" }],
  // idempotence: wearing twice is wearing once
  [{ tag: "Wear", hatName: "architect" }, { tag: "Wear", hatName: "architect" }],
  // order: wear appends at the end
  [{ tag: "Wear", hatName: "reducer" }, { tag: "Wear", hatName: "architect" }],
  [{ tag: "Wear", hatName: "architect" }, { tag: "Doff", hatName: "architect" }],
  [{ tag: "Doff", hatName: "never-worn" }],
  [{ tag: "WearAll" }],
  // decide REPLACES the worn set, ordered by `available` — not by what was worn
  [{ tag: "WearAll" }, { tag: "Decide", chosen: ["critic", "architect"] }],
  [{ tag: "Wear", hatName: "critic" }, { tag: "Decide", chosen: [] }],
  [{ tag: "WearAll" }, { tag: "Doff", hatName: "architect" }],
];

function applyOps(ops: readonly Op[]): P.Persona<Lens, Ground, never> {
  let p = P.create<Lens, Ground, never>("otto");
  for (const op of ops) {
    if (op.tag === "Wear") {
      const hat = HATS.find(h => h.name === op.hatName);
      if (hat !== undefined) p = P.wear(hat, p);
    } else if (op.tag === "Doff") {
      p = P.doff(op.hatName, p);
    } else if (op.tag === "WearAll") {
      p = P.wearAll(HATS, p);
    } else {
      p = P.decide(op.chosen, HATS, p);
    }
  }
  return p;
}

for (const ops of OP_SEQUENCES) {
  const p = applyOps(ops);
  vectors.push({
    vectorType: "PersonaOps",
    ops,
    available: HATS,
    wornNames: p.worn.map(h => h.name),
    allowedActions: P.allowedActions(p),
    lenses: P.lenses(p),
    landmarks: P.landmarks(p),
    controls: P.controls(p),
    hatFlags: P.hatFlags(HATS, p),
  });
}

for (const scope of [P.Global, P.gameScoped("g1")]) {
  const p = P.withScope<Lens, Ground, never>(scope, P.create("otto"));
  vectors.push({ vectorType: "PersonaAddress", name: p.name, scope: p.scope, expected: P.address(p) });
}

// `route` — descending on (relevance, name), so equal relevance breaks by name DESCENDING.
const RELEVANCE: Record<string, number> = { architect: 0.9, reducer: 0.5, critic: 0.5 };
for (const k of [-1, 0, 1, 2, 3, 5]) {
  const p = P.route<Lens, Ground, never>(h => RELEVANCE[h.name] ?? 0, k, HATS, P.create("otto"));
  vectors.push({
    vectorType: "PersonaRoute",
    relevance: RELEVANCE,
    k,
    available: HATS,
    wornNames: p.worn.map(h => h.name),
  });
}

for (const privLength of [0, 1, 32]) {
  const p = P.withPrivate<Lens, Ground, never>(new Uint8Array(privLength), P.create("otto"));
  vectors.push({ vectorType: "PersonaRegularization", privLength, expected: P.regularization(p) });
}

const outputPath = join(import.meta.dir, "hat-treaty-transcript.json");
writeFileSync(outputPath, `${JSON.stringify(vectors, null, 2)}\n`, "utf-8");
console.log(`Successfully generated ${vectors.length} hat treaty vectors at ${outputPath}`);
