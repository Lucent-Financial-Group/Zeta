/**
 * 2026-08-23-nerve-h1-vs-alpha-acyclicity.ts
 *
 * MEASUREMENT for docs/research/2026-08-23-local-to-global-obstruction-*.md
 *
 * Question: is the COMBINATORIAL obstruction (H^1 of the nerve of the cover, F_2 coefficients)
 * the same discriminator as the SEMANTIC one (alpha-acyclicity, i.e. BFMY: pairwise consistency
 * implies global consistency)?
 *
 * Method: compute both, independently, over an exhaustive family of small covers. The nerve
 * computation never calls GYO; GYO never sees the nerve. Disagreements are the finding.
 *
 * Pure, total, deterministic (seeded LCG for the random tail). Ordinal comparison only.
 * Run: bun docs/research/scripts/2026-08-23-nerve-h1-vs-alpha-acyclicity.ts
 */

import { isAlphaAcyclic, type Cover } from "../../../src/Core.TypeScript/cover-acyclicity/gyo.ts";

// === Nerve of a cover, and its F_2 cohomology ===============================
//
// Vertices: the cover's elements (BY INDEX - duplicates are distinct vertices, which matters,
// because the byte-lock cover is four elements with the SAME attribute set).
// A k-simplex {i0..ik} is in the nerve iff the intersection of those elements' attributes is
// nonempty. Closed under subsets, so it is a genuine simplicial complex.

function intersectNonempty(sets: readonly ReadonlySet<string>[], idxs: readonly number[]): boolean {
  if (idxs.length === 0) return true;
  let acc = [...sets[idxs[0]]!];
  for (let k = 1; k < idxs.length; k++) {
    const s = sets[idxs[k]]!;
    acc = acc.filter((a) => s.has(a));
    if (acc.length === 0) return false;
  }
  return acc.length > 0;
}

function combos(n: number, k: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const rec = (start: number): void => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < n; i++) {
      cur.push(i);
      rec(i + 1);
      cur.pop();
    }
  };
  rec(0);
  return out;
}

/** rank over GF(2) of a matrix given as rows of bitsets (bigint). */
function rankF2(rows: bigint[]): number {
  const rs = [...rows];
  let rank = 0;
  let pivotBit = 0n;
  const all = rs.reduce((a, b) => a | b, 0n);
  if (all === 0n) return 0;
  const maxBit = all.toString(2).length;
  for (let b = maxBit - 1; b >= 0; b--) {
    pivotBit = 1n << BigInt(b);
    let pr = -1;
    for (let i = rank; i < rs.length; i++)
      if ((rs[i]! & pivotBit) !== 0n) {
        pr = i;
        break;
      }
    if (pr < 0) continue;
    const t = rs[rank]!;
    rs[rank] = rs[pr]!;
    rs[pr] = t;
    for (let i = 0; i < rs.length; i++) {
      if (i !== rank && (rs[i]! & pivotBit) !== 0n) rs[i] = rs[i]! ^ rs[rank]!;
    }
    rank++;
    if (rank === rs.length) break;
  }
  return rank;
}

interface NerveResult {
  readonly h0: number;
  readonly h1: number;
  readonly v: number;
  readonly e: number;
  readonly t: number;
}

function nerveCohomology(sets: readonly ReadonlySet<string>[]): NerveResult {
  const n = sets.length;
  const edges = combos(n, 2).filter((c) => intersectNonempty(sets, c));
  const tris = combos(n, 3).filter((c) => intersectNonempty(sets, c));
  const eIdx = new Map<string, number>();
  edges.forEach((e, i) => eIdx.set(e.join(","), i));

  // delta^0 : C^0 (vertices) -> C^1 (edges).  (delta^0 f)(i,j) = f(j) - f(i).
  // Represent as rows = edges, columns = vertices; rank is the same either way.
  const d0: bigint[] = edges.map(([i, j]) => (1n << BigInt(i!)) | (1n << BigInt(j!)));

  // delta^1 : C^1 -> C^2.  (delta^1 g)(i,j,k) = g(j,k) - g(i,k) + g(i,j).
  const d1: bigint[] = tris.map(([i, j, k]) => {
    let row = 0n;
    for (const pair of [
      [j!, k!],
      [i!, k!],
      [i!, j!],
    ]) {
      const idx = eIdx.get(pair.join(","));
      if (idx !== undefined) row ^= 1n << BigInt(idx);
    }
    return row;
  });

  const rank0 = rankF2(d0);
  const rank1 = rankF2(d1);
  return { h0: n - rank0, h1: edges.length - rank1 - rank0, v: n, e: edges.length, t: tris.length };
}

// === Exhaustive family ======================================================

function subsetsOf(attrs: readonly string[]): ReadonlySet<string>[] {
  const out: ReadonlySet<string>[] = [];
  for (let m = 1; m < 1 << attrs.length; m++) {
    const s = new Set<string>();
    for (let i = 0; i < attrs.length; i++) if (m & (1 << i)) s.add(attrs[i]!);
    out.push(s);
  }
  return out;
}

function toCover(sets: readonly ReadonlySet<string>[]): Cover {
  // gyo.ts CoverEdge.attributes is `readonly string[]`, NOT a Set. Passing a Set happens to work
  // (canonicalizeCover spreads it) but relying on that is a check that did not run looking like
  // one that passed, so it is converted explicitly here.
  return sets.map((s, i) => ({ name: `R${i}`, attributes: [...s].sort() }));
}

function run(attrs: readonly string[], maxSize: number): void {
  const subs = subsetsOf(attrs);
  let checked = 0;
  let agree = 0;
  let falseNeg = 0; // GYO says CYCLIC (no gluing guarantee) but H^1 = 0 -> the invariant ACQUITS wrongly
  let falsePos = 0; // GYO says ACYCLIC but H^1 != 0 -> the invariant CONVICTS wrongly
  const disagreements: string[] = [];
  let acyclicCount = 0;

  for (let size = 2; size <= maxSize; size++) {
    for (const pick of combos(subs.length, size)) {
      const sets = pick.map((i) => subs[i]!);
      const cover = toCover(sets);
      const acyclic = isAlphaAcyclic(cover);
      const nerve = nerveCohomology(sets);
      // Predictor under test: H^1(nerve; F_2) == 0  <->  alpha-acyclic
      const predicted = nerve.h1 === 0;
      checked++;
      if (acyclic) acyclicCount++;
      if (predicted === acyclic) agree++;
      else if (!acyclic && nerve.h1 === 0) falseNeg++;
      if (predicted !== acyclic && acyclic) falsePos++;
      if (predicted !== acyclic && disagreements.length < 12) {
        disagreements.push(
          `${sets.map((s) => "{" + [...s].sort().join("") + "}").join(" ")}` +
            `  GYO=${acyclic ? "ACYCLIC" : "CYCLIC"}  H^1=${nerve.h1}  H^0=${nerve.h0}` +
            `  (V=${nerve.v},E=${nerve.e},T=${nerve.t})`,
        );
      }
    }
  }
  console.log(
    `attrs=${attrs.join("")} maxSize=${maxSize}: covers=${checked} acyclic=${acyclicCount} agree=${agree} disagree=${checked - agree}  [wrong-acquittals(H^1=0 but CYCLIC)=${falseNeg}  wrong-convictions(H^1!=0 but ACYCLIC)=${falsePos}]`,
  );
  for (const d of disagreements) console.log(`   DISAGREE  ${d}`);
}

console.log("=== nerve H^1 (F_2) vs GYO alpha-acyclicity ===");
run(["A", "B", "C"], 3);
run(["A", "B", "C"], 4);
run(["A", "B", "C", "D"], 3);
run(["A", "B", "C", "D"], 4);

// === The two named covers ===================================================
console.log("\n=== named covers ===");
const threeCycle = [new Set(["A", "B"]), new Set(["B", "C"]), new Set(["C", "A"])];
const nc = nerveCohomology(threeCycle);
console.log(
  `3-cycle {AB}{BC}{CA}: GYO=${isAlphaAcyclic(toCover(threeCycle)) ? "ACYCLIC" : "CYCLIC"} H^0=${nc.h0} H^1=${nc.h1} (V=${nc.v},E=${nc.e},T=${nc.t})`,
);

const filled = [...threeCycle, new Set(["A", "B", "C"])];
const fc = nerveCohomology(filled);
console.log(
  `+ {ABC}          : GYO=${isAlphaAcyclic(toCover(filled)) ? "ACYCLIC" : "CYCLIC"} H^0=${fc.h0} H^1=${fc.h1} (V=${fc.v},E=${fc.e},T=${fc.t})`,
);

// The BYTE-LOCK cover: four oracles, each producing a section over the WHOLE domain.
for (const k of [2, 3, 4, 6]) {
  const bytelock = Array.from({ length: k }, () => new Set(["whole-output"]));
  const bl = nerveCohomology(bytelock);
  console.log(
    `byte-lock cover, ${k} oracles over one domain: H^0=${bl.h0} H^1=${bl.h1} (V=${bl.v},E=${bl.e},T=${bl.t})`,
  );
}
