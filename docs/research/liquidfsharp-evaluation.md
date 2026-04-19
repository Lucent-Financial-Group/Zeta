# LiquidF# — round-35 evaluation plan

`docs/research/proof-tool-coverage.md` lists LiquidF# as the
highest-leverage F#-native proof tool not yet adopted. The
TECH-RADAR row (round 18, Assess) still reads *"would catch the
off-by-one / bad-index class that keeps reappearing in
`FastCdc.fs`, `Crdt.fs`, SIMD merge."* This document scopes a
one-week evaluation that either promotes LiquidF# to Trial with a
shipped annotated module, or moves it to Hold with a written
counter-reason.

Owner: formal-verification-expert (Soraya) — tool-fit routing.
Reviewer: fsharp-expert.

---

## Goal of the evaluation

Pick **one** target module, annotate it with LiquidF# refinement
types, confirm the tool catches (a) a real past bug class and
(b) a planted bug, and report on ergonomic cost.

Success = Trial promotion + shipped annotated file.
Failure = Hold with a concrete reason, logged to TECH-RADAR.

Explicitly out of scope: a multi-module adoption, or any
refactoring driven by LiquidF# without reviewer sign-off.

---

## Target-module triage

Two modules recur in the "bad index / off-by-one" history. Pick
one for the evaluation.

### Candidate A — `FastCdc.fs`

- **Past bug.** Round-17 harsh-critic #7: O(n²) buffer scan
  re-hashing each byte across lifetimes. Root cause was a
  missing index-monotonicity invariant between the cursor and
  the hash-state offset. A refinement type of the form
  `scanCursor : int{scanCursor >= lastHashedOffset}` would
  have caught this at type-check time.
- **Why it fits LiquidF#.** Small (~300 lines), mutation-heavy,
  integer-arithmetic-dense, no higher-kinded types, no
  retraction algebra — the part of the codebase where LiquidF#'s
  SMT-based refinements get the cleanest close.
- **Why it might not fit.** Relies on a mutable `byte[]` buffer
  with ptr arithmetic; LiquidF# refinement support on byte-array
  slicing can be weaker than on lists.

### Candidate B — `Crdt.fs`

- **Past bug.** Round 10 delta-CRDT dotted-version-vector merge
  dropped a dot when two deltas had coincident ids but divergent
  timestamps. A refinement stating `∀ d ∈ merged, d ∈ a ∨ d ∈ b`
  (set-theoretic subset constraint) would have caught it.
- **Why it fits.** CRDT invariants are textbook refinement-type
  territory (Haskell's LiquidHaskell literature has the merge
  property verified end-to-end).
- **Why it might not fit.** The codebase uses `Set<'T>`
  extensively; LiquidF# support for F#'s `Set` vs. the richer
  LiquidHaskell theorem library may be weaker.

### Recommendation

**Start with FastCdc.fs.** Simpler types, direct mapping to the
canonical "index monotonicity" LiquidHaskell tutorial, smaller
blast radius if annotation turns out to be painful. `Crdt.fs` is
the stretch target if LiquidF# impresses.

---

## Evaluation method

### Step 0 — tool availability (day 0, ½ day)

Confirm LiquidF# actually builds and runs today. Last public
release context check; if the tool is effectively dormant, the
evaluation is a **Hold** recommendation with no further work.

- GitHub: `fsprojects/LiquidFSharp` (or the fork currently
  maintained). Check: last-commit recency, latest F# version
  tested, open issue count, CI status on the default branch.
- Tool-chain fit: does LiquidF# run against .NET 10 SDK (our
  current `.mise.toml` pin)?
- Alternative: is there a working Nix / devcontainer build the
  evaluation could run against?

**Stop-rule.** If LiquidF# is not buildable against our toolchain
without heavy patching, the evaluation terminates here with a
**Hold — tool dormant** finding and a line in TECH-RADAR.

### Step 1 — replay the past bug (day 1, 1 day)

Check out the git commit just *before* the round-17 FastCdc fix.
Annotate `FastCdc.fs` with the refinement type we expect would
have caught the O(n²) bug. Run LiquidF#. Either:

- LiquidF# reports the violation → **strong evidence**; record
  the refinement annotation, the error message, and the time
  from annotation to detection.
- LiquidF# passes the buggy code silently → **negative
  evidence**; record why the refinement did not catch it
  (likely: SMT could not discharge the monotonicity obligation,
  or the refinement was expressible but wouldn't trigger).

### Step 2 — plant a fresh bug (day 2, ½ day)

Take the current (fixed) `FastCdc.fs`, plant a synthetic off-by-
one (e.g., `scanCursor <- scanCursor + 1` missing on a branch).
Run LiquidF# with the refinement annotations from Step 1.
Confirm detection, measure detection latency.

This step is important because a tool that only catches *known
past bugs* is overfit to the training set. Planted-bug detection
is the forward-looking signal.

### Step 3 — ergonomic cost (day 3, 1 day)

Measure the delta on three axes between unannotated and
annotated `FastCdc.fs`:

- **Line count.** How many lines of annotation per 100 lines of
  code? Target: ≤ 10%; > 25% is a red flag.
- **Build time.** LiquidF# check time on a clean build. Target:
  under 30 s for one module; over 2 min is a red flag.
- **Editor feedback loop.** Does LiquidF# surface errors in
  real-time in VS Code / Ionide, or only at CLI build time?
  Real-time is strongly preferred.

### Step 4 — produce verdict (day 4, ½ day)

One of three outcomes logged to `docs/research/liquidfsharp-
findings.md` and mirrored to TECH-RADAR:

- **Promote to Trial.** Annotated `FastCdc.fs` ships; add a CI
  gate that runs `liquid` on the module. Plan for one more
  module in round 36 (`Crdt.fs` likely).
- **Stay Assess, revisit round 40.** Tool works but ergonomic
  cost is too high for the bug class caught; worth revisiting
  once LiquidF# maturity improves.
- **Move to Hold.** Tool does not buy us enough over FsCheck +
  Z3; document the specific shortfall.

### Day 5 — slack / writeup buffer

Reserved for slippage. If Steps 0-4 close clean, use day 5 for
the writeup in `findings.md`.

---

## Decision criteria (concrete, not vibes)

Promotion to **Trial** requires all three:

1. Step 1 passes — LiquidF# catches the actual past FastCdc bug
   when replayed.
2. Step 2 passes — LiquidF# catches the planted off-by-one.
3. Step 3 numbers land under the red-flag thresholds (≤ 25%
   annotation density, ≤ 2 min module check time).

**Hold** triggers on any of:

- Tool does not build against .NET 10 / mise pin (Step 0 fail).
- Step 1 false-negative with no refinement the SMT can discharge.
- Annotation density > 40% or check time > 5 min on a 300-line
  module.

Anything between Trial and Hold → **Stay Assess** with a concrete
revisit-date and what would change the answer.

---

## What this evaluation is NOT

- Not an adoption commitment. Trial ≠ Adopt.
- Not a drive-by refactor of `FastCdc.fs` or `Crdt.fs`. If the
  annotation process surfaces code issues, file them as bugs;
  fix them in a separate commit.
- Not a comparison against Dafny / F* / Stainless / LiquidHaskell
  — those each catch different bug classes per
  `docs/research/proof-tool-coverage.md`. This is a focused
  LiquidF# fit-check for one specific bug class.

---

## Related work if LiquidF# promotes

Follow-ups for later rounds, not committed here:

- **`Crdt.fs` annotation pass** — round 36 if Trial landed clean.
- **CI gate** — `.github/workflows/liquid.yml` run on PR against
  annotated modules; failure blocks merge.
- **`bench/Benchmarks/FastCdcBench.fs`** — confirm LiquidF#
  annotations do not change the runtime cost (refinements are
  erased at runtime; this should be a no-op benchmark, used as a
  regression guard).
- **BP-NN candidate rule** — if LiquidF# proves valuable, a new
  BP rule could codify "refinement types on any mutable-index
  arithmetic module"; escalate via
  `docs/DECISIONS/YYYY-MM-DD-bp-NN-refinement-on-index-math.md`.

---

## Reference patterns

- `docs/research/proof-tool-coverage.md` — the broader proof-tool
  landscape this evaluation fits into
- `tools/lean4/Lean4/DbspChainRule.lean` — the sibling "Lean for
  algebraic proofs" lane; LiquidF# covers a different bug class
- `src/Core/FastCdc.fs` — the candidate target module
- `src/Core/Crdt.fs` — the stretch target
- `.claude/skills/formal-verification-expert/SKILL.md` — Soraya
  owns tool-fit; confirms this is the right lane
- `.claude/skills/fsharp-expert/SKILL.md` — the F# reviewer
- TECH-RADAR row "LiquidF# refinement types" (round 18, Assess)
