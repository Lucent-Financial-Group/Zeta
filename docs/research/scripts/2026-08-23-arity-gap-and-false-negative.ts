/**
 * 2026-08-23-arity-gap-and-false-negative.ts
 *
 * MEASUREMENT for docs/research/2026-08-23-local-to-global-obstruction-*.md
 *
 * Two things are measured here, both with the SHIPPED semantic machinery in
 * src/Core.TypeScript/cover-acyclicity/witness.ts (never with GYO, and never with my nerve code):
 *
 *   (1) THE FALSE NEGATIVE. The cover {ABC},{ABD},{ACD} has a nerve with H^1 = 0 (measured in the
 *       companion script) yet is genuinely non-gluing. Exhibit the witness and check it. This is
 *       what makes "H^1 = 0" an ACQUITTAL THE INVARIANT IS NOT ENTITLED TO GIVE.
 *
 *   (2) THE ARITY GAP. For the 3-cycle, every PROPER sub-cover glues on the same local data while
 *       the whole does not. That is a proof - by cases, computed - that no conjunction of
 *       predicates each reading fewer than all 3 elements can decide global consistency.
 *
 * Run: bun docs/research/scripts/2026-08-23-arity-gap-and-false-negative.ts
 */

import type { Cover } from "../../../src/Core.TypeScript/cover-acyclicity/gyo.ts";
import {
  isGloballyConsistent,
  isPairwiseConsistent,
  naturalJoin,
  project,
  relationsEqual,
  type Instance,
  type Relation,
  type Tuple,
} from "../../../src/Core.TypeScript/cover-acyclicity/witness.ts";

const cov = (spec: Record<string, string>): Cover =>
  Object.entries(spec).map(([name, attrs]) => ({ name, attributes: attrs.split("") }));

// === (1) The parity witness on {ABC},{ABD},{ACD} ============================

const parity = (attrs: string): Relation => {
  const out: Tuple[] = [];
  for (let m = 0; m < 1 << attrs.length; m++) {
    const bits = [...attrs].map((_, i) => (m >> i) & 1);
    if (bits.reduce((a, b) => a ^ b, 0) === 0) {
      const t: Record<string, number> = {};
      attrs.split("").forEach((a, i) => {
        t[a] = bits[i]!;
      });
      out.push(t);
    }
  }
  return out;
};

const cover1 = cov({ R_ABC: "ABC", R_ABD: "ABD", R_ACD: "ACD" });
const inst1: Instance = { R_ABC: parity("ABC"), R_ABD: parity("ABD"), R_ACD: parity("ACD") };

console.log("=== (1) FALSE NEGATIVE of the nerve-only invariant ===");
console.log("cover {ABC},{ABD},{ACD}   (companion script measured: nerve H^0=1, H^1=0)");
console.log(`  each relation = even-parity triples, |R| = ${inst1.R_ABC!.length}`);
console.log(`  pairwise consistent? ${isPairwiseConsistent(cover1, inst1)}`);
console.log(`  globally consistent? ${isGloballyConsistent(cover1, inst1)}`);
const j1 = naturalJoin(cover1, inst1);
console.log(`  natural join has ${j1.length} tuples: ${JSON.stringify(j1)}`);
console.log(`  join projected to ABC = ${JSON.stringify(project(j1, ["A", "B", "C"]))}`);
console.log(`  ... equals R_ABC? ${relationsEqual(project(j1, ["A", "B", "C"]), inst1.R_ABC!, ["A", "B", "C"])}`);

// === (2) The arity gap on the 3-cycle =======================================

const neq: Relation = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
];
const rel = (p: string, q: string): Relation => neq.map((t) => ({ [p]: t.x!, [q]: t.y! }));

const full = cov({ R_AB: "AB", R_BC: "BC", R_CA: "CA" });
const instFull: Instance = { R_AB: rel("A", "B"), R_BC: rel("B", "C"), R_CA: rel("C", "A") };

console.log("\n=== (2) ARITY GAP on the 3-cycle {AB},{BC},{CA} ===");
console.log(
  `  whole cover: pairwise=${isPairwiseConsistent(full, instFull)} global=${isGloballyConsistent(full, instFull)}`,
);

const names = ["R_AB", "R_BC", "R_CA"] as const;
let allSubGlue = true;
for (const drop of names) {
  const sub = full.filter((e) => e.name !== drop);
  const si: Instance = Object.fromEntries(Object.entries(instFull).filter(([k]) => k !== drop));
  const g = isGloballyConsistent(sub, si);
  allSubGlue &&= g;
  console.log(
    `  drop ${drop}: sub-cover {${sub.map((e) => [...e.attributes].sort().join("")).join("},{")}}  pairwise=${isPairwiseConsistent(sub, si)} global=${g}  <- SAME local data`,
  );
}
console.log(`\n  every proper sub-cover glues on identical local data? ${allSubGlue}`);
console.log(`  therefore: no predicate P(instance) = AND_i p_i(R_i) can equal "globally consistent".`);
console.log(`  Proof (by the runs above): P must reject the whole instance, so some p_i(R_i)=false.`);
console.log(`  But dropping any OTHER element leaves a gluing instance containing that same R_i,`);
console.log(`  which P must accept, so every p_i(R_i)=true. Contradiction.`);

// The same for pairwise checks: pairwise consistency HOLDS and global fails.
console.log(
  `\n  arity-2 (pairwise) checks: pairwise=${isPairwiseConsistent(full, instFull)} while global=${isGloballyConsistent(full, instFull)}`,
);
console.log(`  => any SOUND check of arity <= 2 accepts a globally inconsistent instance. Arity gap = 3.`);
