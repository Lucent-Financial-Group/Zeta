// PROBE: which BNN / factor-graph operations, expressed over WeightedSet, survive a
// Cayley-Dickson doubling of the WEIGHT algebra 'W?
// Rungs: R -> C -> H -> O -> S. Each rung loses a known property.
// The claim under test: what survives is DERIVABLE from which properties each op CONSUMES.

type CD = number | { re: CD; im: CD };
const conj = (x: CD): CD => (typeof x === "number" ? x : { re: conj(x.re), im: neg(x.im) });
const neg = (x: CD): CD => (typeof x === "number" ? -x : { re: neg(x.re), im: neg(x.im) });
const add = (a: CD, b: CD): CD =>
  typeof a === "number" && typeof b === "number" ? a + b
  : { re: add((a as any).re, (b as any).re), im: add((a as any).im, (b as any).im) };
// Cayley-Dickson product: (a,b)(c,d) = (ac - d*b, da + b c*)
const mul = (x: CD, y: CD): CD => {
  if (typeof x === "number" && typeof y === "number") return x * y;
  const a = (x as any).re, b = (x as any).im, c = (y as any).re, d = (y as any).im;
  return { re: add(mul(a, c), neg(mul(conj(d), b))), im: add(mul(d, a), mul(b, conj(c))) };
};
const comps = (x: CD): number[] => (typeof x === "number" ? [x] : [...comps(x.re), ...comps(x.im)]);
const norm = (x: CD) => Math.sqrt(comps(x).reduce((s, v) => s + v * v, 0));
const dist = (a: CD, b: CD) => Math.max(...comps(add(a, neg(b))).map(Math.abs));

let seed = 424242;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
const rand = (dim: number): CD => (dim === 1 ? rnd() : { re: rand(dim / 2), im: rand(dim / 2) });

const RUNGS: [string, number][] = [["R (1)", 1], ["C (2)", 2], ["H (4)", 4], ["O (8)", 8], ["S (16)", 16]];
const TOL = 1e-9;
const N = 4000;

// Each row: an operation, and the algebraic law it CONSUMES.
const laws: [string, string, (d: number) => number][] = [
  ["WeightedSet.add  (BP/EP message Product = natparam fusion)", "Add commutative + associative",
    (d) => { let w = 0; for (let i = 0; i < N; i++) { const a = rand(d), b = rand(d), c = rand(d);
      w = Math.max(w, dist(add(a, b), add(b, a)), dist(add(add(a, b), c), add(a, add(b, c)))); } return w; }],
  ["WeightedSet.subtract (EP cavity / retraction a + (-a) = 0)", "Add group inverse",
    (d) => { let w = 0; for (let i = 0; i < N; i++) { const a = rand(d);
      w = Math.max(w, Math.max(...comps(add(a, neg(a))).map(Math.abs))); } return w; }],
  ["scale-CHAIN / inner  (factor product, contraction)", "Mul ASSOCIATIVE",
    (d) => { let w = 0; for (let i = 0; i < N; i++) { const a = rand(d), b = rand(d), c = rand(d);
      w = Math.max(w, dist(mul(mul(a, b), c), mul(a, mul(b, c)))); } return w; }],
  ["order-free factor product (fold over neighbours)", "Mul COMMUTATIVE",
    (d) => { let w = 0; for (let i = 0; i < N; i++) { const a = rand(d), b = rand(d);
      w = Math.max(w, dist(mul(a, b), mul(b, a))); } return w; }],
  ["Born / renormalise |w| (bornProb, belief normalisation)", "norm MULTIPLICATIVE (composition algebra)",
    (d) => { let w = 0; for (let i = 0; i < N; i++) { const a = rand(d), b = rand(d);
      w = Math.max(w, Math.abs(norm(mul(a, b)) - norm(a) * norm(b))); } return w; }],
  ["alternativity (a a) b = a (a b)  [Moufang-lite]", "Mul ALTERNATIVE",
    (d) => { let w = 0; for (let i = 0; i < N; i++) { const a = rand(d), b = rand(d);
      w = Math.max(w, dist(mul(mul(a, a), b), mul(a, mul(a, b)))); } return w; }],
];

console.log("residual (max deviation) per rung — 0 means the law HOLDS, >0 means it BREAKS\n");
const head = "operation".padEnd(54) + "law consumed".padEnd(42) + RUNGS.map(([n]) => n.padStart(10)).join("");
console.log(head);
console.log("-".repeat(head.length));
for (const [op, law, f] of laws) {
  const cells = RUNGS.map(([, d]) => { const v = f(d); return (v < TOL ? "hold" : v.toExponential(1)).padStart(10); });
  console.log(op.padEnd(54) + law.padEnd(42) + cells.join(""));
}

// Zero divisors: does a nonzero product of nonzeros vanish? (breaks Zero-pruning soundness on ⊗)
console.log("\nzero divisors (a!=0, b!=0, ab==0) — breaks consolidate/prune soundness on the MUL side:");
for (const [name, d] of RUNGS) {
  let found = 0;
  if (d === 16) {
    // the classic sedenion zero divisor: (e1+e10)(e5+e14) = 0
    const e = (k: number): CD => { const c = new Array(16).fill(0); c[k] = 1;
      const build = (arr: number[]): CD => arr.length === 1 ? arr[0] : { re: build(arr.slice(0, arr.length/2)), im: build(arr.slice(arr.length/2)) };
      return build(c); };
    const a = add(e(1), e(10)), b = add(e(5), e(14));
    if (norm(a) > 0 && norm(b) > 0 && norm(mul(a, b)) < 1e-12) found = 1;
  }
  console.log(`  ${name.padEnd(10)} ${found ? "YES — e1+e10 times e5+e14 = 0 (norm " + norm(mul(add(((k)=>{const c=new Array(16).fill(0);c[k]=1;const bd=(arr:number[]):CD=>arr.length===1?arr[0]:{re:bd(arr.slice(0,arr.length/2)),im:bd(arr.slice(arr.length/2))};return bd(c);})(1),((k)=>{const c=new Array(16).fill(0);c[k]=1;const bd=(arr:number[]):CD=>arr.length===1?arr[0]:{re:bd(arr.slice(0,arr.length/2)),im:bd(arr.slice(arr.length/2))};return bd(c);})(10)),add(((k)=>{const c=new Array(16).fill(0);c[k]=1;const bd=(arr:number[]):CD=>arr.length===1?arr[0]:{re:bd(arr.slice(0,arr.length/2)),im:bd(arr.slice(arr.length/2))};return bd(c);})(5),((k)=>{const c=new Array(16).fill(0);c[k]=1;const bd=(arr:number[]):CD=>arr.length===1?arr[0]:{re:bd(arr.slice(0,arr.length/2)),im:bd(arr.slice(arr.length/2))};return bd(c);})(14)))).toExponential(1) + ")" : "none found by construction"}`);
}

// Total order: needed by tropical / Viterbi / max-product and by any threshold test.
console.log("\ntotal compatible order (tropical/Viterbi max-product, HeavyTailFold |z| threshold):");
console.log("  R (1)      YES — R is an ordered field");
console.log("  C (2)+     NO  — no order on C compatible with the field ops (i^2 = -1 < 0 either way)");
