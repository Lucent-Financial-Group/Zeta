/**
 * Q4 of the Clifford-GPU hold, plus the two arithmetics the reservoir/sphere-packing
 * thread turns on (2026-08-26).
 *
 * ## Why this file exists
 *
 * `docs/research/2026-08-26-cga-is-m2-of-the-in-tree-clifford-q4-answered-*.md` makes four
 * computed claims. A research document whose numbers cannot be re-run is an assertion with
 * a citation attached, so the numbers live here and the falsifiers live next door.
 *
 *   1. **Q4** -- CGA(3D) = Cl(4,1) is not a rival to the in-tree Cl(3,0); it is
 *      `M_2(Cl(3,0))`, one step up the suspension ladder `Cl(p+1,q+1) ~= M_2(Cl(p,q))`.
 *   2. **The conformal embedding** carries ANY squared-distance function into an algebra
 *      where the inner product IS that function, in any dimension: `P(x).P(y) = -1/2 |x-y|^2`.
 *   3. **The curvature budget** `sum (6-k) F_k = 12` for every closed trivalent polyhedron
 *      -- which is why a cube (6 squares) closes and a hexagon tiling never does.
 *   4. **alpha\* = 1/2 log2(2pi/e)** and `sqrt(e/2pi)` are the same constant, so the LP-rate
 *      and exponent statements of the sphere-packing result agree.
 *
 * ## The transcription hazard, and how it is pinned
 *
 * `classify` below is a TRANSCRIPTION of `src/Core/CliffordPeriodicity.fs`, which is the
 * authority. There is no dotnet in every environment that needs to check this, so the
 * transcription is guarded three ways rather than trusted:
 *
 *   - `dimensionOfType(classify(p,q)) === 2^(p+q)` for every signature -- the same invariant
 *     the F# module uses. A permuted table row cannot survive it.
 *   - four independently-known small cases (`Cl(0,1)~=C`, `Cl(0,2)~=H`, `Cl(1,3)~=M_2(H)`,
 *     `Cl(3,1)~=M_4(R)`) -- the same four the F# test suite pins against.
 *   - the suspension isomorphism, which is a structural property no single-row typo
 *     preserves.
 *
 * If `CliffordPeriodicity.fs` ever changes, this file is a SECOND opinion that must be
 * updated with it -- it is deliberately not a re-export, because a re-export would agree
 * with the F# module by construction and check nothing (the vacuity class).
 *
 * ## What is NOT here
 *
 * No Clifford-GPU code, lowering, classifier or measurement -- those are held by
 * `081M0R18878087G0R001XY5A2J` until Q1/Q2/Q3/Q5 come back. This file computes
 * classifications and inner products; it does not implement an algebra.
 *
 * Anchors: Atiyah, Bott & Shapiro, *Clifford Modules* (Topology 3, 1964) -- the mod-8 clock;
 * Lawson & Michelsohn, *Spin Geometry* I.4 -- the table; Hestenes & Sobczyk (1984) and
 * Dorst, Fontijne & Mann (2007) -- the conformal (null-cone) embedding; Euler's polyhedron
 * formula for the budget. Cited from standing knowledge, not page-checked in this pass.
 */

// ---------------------------------------------------------------------------------------
// 1. The Atiyah-Bott-Shapiro clock (transcribed from src/Core/CliffordPeriodicity.fs)
// ---------------------------------------------------------------------------------------

/** The division algebra a Clifford algebra's Morita class is built over. */
export type Ground = "R" | "C" | "H";

/** Morita type of `Cl(p,q)`: `M_n(K)`, doubled when split (`s = 1` or `s = 5`). */
export interface CliffordType {
  readonly ground: Ground;
  readonly matrixDim: number;
  readonly isSplit: boolean;
}

/**
 * `p - q (mod 8)`, normalised into `0..7`.
 *
 * JS `%` is remainder, not modulus: `(-2) % 8 === -2`. Every table lookup below indexes on
 * this value, so an unnormalised remainder would silently pick the wrong row for any
 * signature with `q > p` -- which is most of them in physics. The `+ 8` is load-bearing,
 * exactly as the `+ 8` in the F# original is.
 */
export function signatureClass(p: number, q: number): number {
  return (((p - q) % 8) + 8) % 8;
}

/** Classify `Cl(p,q)` up to Morita type. Throws on a negative signature. */
export function classify(p: number, q: number): CliffordType {
  if (p < 0 || q < 0) throw new RangeError(`negative signature Cl(${p},${q})`);
  const n = p + q;
  const s = signatureClass(p, q);
  const expo =
    s === 0 || s === 2 ? n / 2
    : s === 1 || s === 3 || s === 7 ? (n - 1) / 2
    : s === 4 || s === 6 ? (n - 2) / 2
    : (n - 3) / 2; // s === 5
  const ground: Ground = s <= 2 ? "R" : s === 3 || s === 7 ? "C" : "H";
  return {
    ground,
    matrixDim: 2 ** Math.max(0, Math.floor(expo)),
    isSplit: s === 1 || s === 5,
  };
}

/** Real dimension of `Cl(p,q)` -- `2^(p+q)` by construction, independent of signature. */
export function realDimension(p: number, q: number): number {
  return 2 ** (p + q);
}

/** Real dimension implied by a Morita type -- `n^2 * dim_R(K)`, doubled when split. */
export function dimensionOfType(t: CliffordType): number {
  const k = t.ground === "R" ? 1 : t.ground === "C" ? 2 : 4;
  const d = t.matrixDim * t.matrixDim * k;
  return t.isSplit ? 2 * d : d;
}

/** Human-readable Morita type, e.g. `M_4(C)` or `M_2(R) (+) same`. */
export function showType(t: CliffordType): string {
  return `M_${t.matrixDim}(${t.ground})${t.isSplit ? " (+) same" : ""}`;
}

/**
 * Clock position of the even subalgebra `Cl^0(p,q) ~= Cl(p, q-1)` -- one tick forward.
 * Returns `null` for `q = 0`, which is a refusal rather than a wrap (there is no `q-1`).
 *
 * This is what shows CGA rotors are QUATERNIONIC: `Cl^0(4,1) ~= Cl(4,0)` lands on `s = 4`,
 * while `Cl(3,0)`'s own rotors are complex. The rotor path does not transfer up the
 * suspension ladder even though the algebra does.
 */
export function evenSubalgebraClass(p: number, q: number): number | null {
  return q === 0 ? null : signatureClass(p, q - 1);
}

// ---------------------------------------------------------------------------------------
// 2. The conformal (null-cone) embedding, in arbitrary dimension
// ---------------------------------------------------------------------------------------

/**
 * A conformal vector in `Cl(n+1,1)`: the Euclidean part, plus coefficients on the two null
 * directions `n0` and `ninf` (`n0^2 = ninf^2 = 0`, `n0 . ninf = -1`).
 */
export interface ConformalVector {
  readonly x: readonly number[];
  /** coefficient of `n0` */
  readonly a: number;
  /** coefficient of `ninf` */
  readonly b: number;
}

/** `P(x) = x + 1/2 |x|^2 ninf + n0` -- the null-cone embedding of a point of `R^n`. */
export function embedPoint(x: readonly number[]): ConformalVector {
  return { x: [...x], a: 1, b: 0.5 * x.reduce((s, v) => s + v * v, 0) };
}

/**
 * The `Cl(n+1,1)` inner product. Euclidean part is the dot product; the null pair
 * contributes `-(a1*b2 + b1*a2)` because `n0 . ninf = -1`.
 */
export function conformalDot(p: ConformalVector, q: ConformalVector): number {
  if (p.x.length !== q.x.length) {
    throw new RangeError(`dimension mismatch: ${p.x.length} vs ${q.x.length}`);
  }
  let s = 0;
  for (let i = 0; i < p.x.length; i += 1) s += (p.x[i] ?? 0) * (q.x[i] ?? 0);
  return s - (p.a * q.b + p.b * q.a);
}

/** Squared Euclidean distance -- the quantity `conformalDot` must reproduce. */
export function squaredDistance(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length) throw new RangeError(`dimension mismatch: ${x.length} vs ${y.length}`);
  let s = 0;
  for (let i = 0; i < x.length; i += 1) s += ((x[i] ?? 0) - (y[i] ?? 0)) ** 2;
  return s;
}

// ---------------------------------------------------------------------------------------
// 3. The curvature budget
// ---------------------------------------------------------------------------------------

/** A face census: face-size -> how many faces of that size. */
export type FaceCensus = Readonly<Record<number, number>>;

const censusEntries = (f: FaceCensus): [number, number][] =>
  Object.entries(f).map(([k, n]) => [Number(k), n]);

/**
 * `sum (6 - k) * F_k`. For a closed TRIVALENT polyhedron this is always exactly 12 --
 * a curvature budget every such solid pays, however it distributes its face sizes.
 * Hexagons contribute 0 and therefore can never pay for closure.
 */
export function curvatureBudget(faces: FaceCensus): number {
  return censusEntries(faces).reduce((acc, [k, n]) => acc + (6 - k) * n, 0);
}

/** Face count, edge count, and `2E = sum k F_k`. */
export function faceCount(faces: FaceCensus): number {
  return censusEntries(faces).reduce((acc, [, n]) => acc + n, 0);
}
export function edgeCount(faces: FaceCensus): number {
  return censusEntries(faces).reduce((acc, [k, n]) => acc + k * n, 0) / 2;
}

/**
 * Euler characteristic of a TRIVALENT solid from its face census alone, using `3V = 2E`.
 * `chi = 2` is a sphere; `chi = 0` is a torus (what hexagons-only gives).
 *
 * Only valid for trivalent solids -- three faces at every vertex. Passing an octahedron
 * (four faces per vertex) yields a wrong V and therefore a wrong chi, which is why the
 * caller must know the solid is trivalent. The tests carry that case as a control.
 */
export function trivalentEulerCharacteristic(faces: FaceCensus): number {
  const twoE = censusEntries(faces).reduce((acc, [k, n]) => acc + k * n, 0);
  return twoE / 3 - twoE / 2 + faceCount(faces);
}

// ---------------------------------------------------------------------------------------
// 4. The sphere-packing constants
// ---------------------------------------------------------------------------------------

const log2 = (x: number): number => Math.log(x) / Math.LN2;

/**
 * `alpha* = 1/2 log2(2pi/e) = 0.6044...` -- the exponent in `Delta_d <= 2^(-(alpha*+o(1))d)`.
 * Reported as the first improvement to the general sphere-packing exponent since
 * Kabatianskii-Levenshtein 1978 (0.5990, cited from standing knowledge, not checked here).
 */
export const ALPHA_STAR: number = 0.5 * log2((2 * Math.PI) / Math.E);

/**
 * `sqrt(e/2pi)` -- the exact asymptotic rate of the Cohn-Elkies linear program,
 * `lim LP_d^(1/d)`. Equals `2^(-ALPHA_STAR)`: the rate statement and the exponent
 * statement are the same statement, which is the check `lpRateAgreesWithExponent` makes.
 *
 * Read as a CEILING: the LP cannot be pushed past this by better test functions.
 */
export const LP_RATE: number = Math.sqrt(Math.E / (2 * Math.PI));

/** `|2^(-alpha*) - sqrt(e/2pi)|` -- zero if the two statements agree. */
export function lpRateAgreesWithExponent(): number {
  return Math.abs(2 ** -ALPHA_STAR - LP_RATE);
}

// ---------------------------------------------------------------------------------------
// 5. Deterministic point sampling (noninterference: no ambient entropy)
// ---------------------------------------------------------------------------------------

/**
 * A seeded LCG. `Math.random()` would make the conformal check unreplayable, which
 * discipline #4 (DST) forbids and `.claude/rules/dv2-data-split-discipline-activated.md`
 * #7 names as an ambient-entropy leak.
 */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return (s / 4294967296) * 20 - 10;
  };
}

// ---------------------------------------------------------------------------------------
// 6. DEGENERATE signatures Cl(p,q,r) -- where the ABS clock does not reach
// ---------------------------------------------------------------------------------------
//
// Added 2026-08-26 after Aaron surfaced the current Clifford-in-AI landscape. The single
// most-cited geometric-algebra architecture, Qualcomm's GATr, represents its inputs in a
// **16-dimensional projective** geometric algebra -- PGA(3D) = `Cl(3,0,1)`, which has a
// generator squaring to ZERO. Nothing in this repo could classify it: `CliffordPeriodicity.fs`
// takes `(p, q)` and there is no `r`, so the instrument had no coverage of the algebra the
// field's headline model actually uses.
//
// THE REASON IS NOT AN OVERSIGHT, AND SAYING SO PRECISELY MATTERS. A degenerate Clifford
// algebra is **not semisimple**: the null generators are nilpotent and generate a Jacobson
// radical. Atiyah-Bott-Shapiro classifies semisimple algebras up to Morita type over a
// division ring, so the clock is **inapplicable** here, not merely unimplemented. Extending
// `classify` to accept an `r` would have produced a confident wrong answer -- the failure
// mode this repo calls the vacuity class. The honest extension is a different function that
// says what IS true:
//
//     Cl(p,q,r)  ~=  Cl(p,q) (x) Lambda(R^r)          [the exterior algebra on r generators]
//     dim_R                  =  2^(p+q+r)
//     Cl(p,q,r) / rad        ~= Cl(p,q)               [quotient by the radical is semisimple]
//
// So a degenerate algebra is classified in two parts: a nilpotent part the clock cannot see,
// and a semisimple quotient it can. And the quotient is the payoff -- see
// `towerReduction` below.

/** A degenerate Clifford algebra `Cl(p,q,r)`: `r` generators square to zero. */
export interface DegenerateCliffordType {
  /** Total real dimension, `2^(p+q+r)`. */
  readonly realDimension: number;
  /** Dimension of the Jacobson radical (the nilpotent part the ABS clock cannot see). */
  readonly radicalDimension: number;
  /** The semisimple quotient `Cl(p,q,r)/rad ~= Cl(p,q)`, which the clock CAN classify. */
  readonly semisimpleQuotient: CliffordType;
  /** `true` when `r > 0` -- i.e. when the ABS clock is inapplicable to the algebra itself. */
  readonly isDegenerate: boolean;
}

/**
 * Classify `Cl(p,q,r)` as far as is honest: total dimension, radical dimension, and the
 * semisimple quotient.
 *
 * `r = 0` reduces to the ordinary case (empty radical, quotient is the algebra itself), so
 * this is a strict generalisation rather than a parallel code path.
 */
export function classifyDegenerate(p: number, q: number, r: number): DegenerateCliffordType {
  if (p < 0 || q < 0 || r < 0) throw new RangeError(`negative signature Cl(${p},${q},${r})`);
  const total = 2 ** (p + q + r);
  // rad(Cl(p,q) (x) Lambda(R^r)) = Cl(p,q) (x) rad(Lambda(R^r)); dim rad(Lambda) = 2^r - 1.
  const radical = 2 ** (p + q) * (2 ** r - 1);
  return {
    realDimension: total,
    radicalDimension: radical,
    semisimpleQuotient: classify(p, q),
    isDegenerate: r > 0,
  };
}

/**
 * The named geometric algebras of the current AI literature, and what each reduces to.
 *
 * THE POINT OF THIS TABLE: both live candidate towers are built over the SAME in-tree
 * algebra, by two different constructions.
 *
 *   PGA(3D) = Cl(3,0,1) ~= Cl(3,0) (x) Lambda(R^1)   dim 16   <- GATr's 16-dimensional space
 *   CGA(3D) = Cl(4,1)   ~= M_2(Cl(3,0))              dim 32
 *
 * Tensoring with an exterior algebra, or taking 2x2 matrices over it. Either way `Cl(3,0)`
 * -- the algebra already in `src/Core/Cl3.fs` -- is the entry type, so the in-tree work is
 * upstream of BOTH and is not a bet on one of them.
 */
export const TOWER_REDUCTION: readonly {
  readonly name: string;
  readonly signature: readonly [number, number, number];
  readonly construction: string;
}[] = [
  { name: "VGA(3D) / in-tree Cl3", signature: [3, 0, 0], construction: "Cl(3,0) itself" },
  { name: "PGA(3D) / GATr", signature: [3, 0, 1], construction: "Cl(3,0) (x) Lambda(R^1)" },
  { name: "CGA(3D)", signature: [4, 1, 0], construction: "M_2(Cl(3,0))" },
  { name: "PGA(2D)", signature: [2, 0, 1], construction: "Cl(2,0) (x) Lambda(R^1)" },
  { name: "STA", signature: [1, 3, 0], construction: "Cl(1,3) itself" },
];
