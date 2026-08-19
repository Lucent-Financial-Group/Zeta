---
id: 081M0DVSW19087G0R001DKRERW
type: task
state: in-progress
priority: P1
slug: wire-build-graph-job-selection-completeness-gate-shipped-if
title: "Wire build-graph job selection: completeness gate shipped, if-guard flip pending observe-only evidence"
created: 2026-08-19T18:05:00.000Z
depends_on: []
composes_with:
  - 081M0DJGYKQ087G0R000515D88
  - 081M0DG68ZH087G0R001RMAX88
  - docs/research/2026-08-19-repo-split-round-3-the-union-is-the-bottleneck-dependency-closure-measured-against-change-rate.md
  - .claude/rules/clone-at-tag-stays-sufficient.md
---

# Wire build-graph job selection

Decision taken on round-3 evidence: **Option 1, wire the graph first.** Reversible;
attacks the 94% provisioning waste and the 82% of real gate failures directly;
forecloses no later split.

## Shipped in this PR

- `hygiene/audit-build-graph-completeness.ts` (+24 tests) -- the acceptance gate.
  Three directions, fails closed: target->leg, leg->job, job->target. Two rosters
  (`INFRASTRUCTURE_JOBS`, `UNCOVERED_TARGETS`), each checked for rot in BOTH
  directions so an exemption cannot quietly grow or shadow real coverage.
- `ci/affected-legs.ts` (+9 tests) -- the run-time selector. Emits one explicit
  boolean per leg, **derived from the graph at run time**, never hand-maintained.
  Fail-safe: any error emits `mode=full`, so the selector can only ever ADD work.
- `hygiene/lint-clone-at-tag-is-sufficient.ts` (+22 tests) + the carved-sentence
  rule -- the §1 guard, as a falsifier rather than prose.
- `gate.yml` job `build-graph-completeness` -- **bun-only** (`setup-bun`, not
  `install.sh`), which is the first job in the repo to take its subset rather than
  the union on purpose.
- Graph corrections that made the audit pass (see below).

## The completeness-lint result, reported plainly

**First run: 58 findings. A=38, B=2, C=18. The graph was NOT complete.**
All three were real, all live on `main`:

1. **B (2) -- dangling legs.** `lean-proof/build` and `tlaps-proof/tlaps` named
   jobs that do not exist; the jobs are `lean-proof/type-check` and
   `tlaps-proof/prove`. **A wired graph would have skipped the Lean proof and the
   TLA+ proof entirely, on every change**, while direction A counted both targets
   as covered. This is the single most alarming finding of the round.
2. **A (38) -- targets with no leg.** 35 were WRONG in the graph's favour-of-
   caution direction: the comment claimed `legs: []` "states that coverage gap
   honestly", but `gate/lint-rust` runs `lint-rust.ts`, which walks
   `findCargoTomls(SRC_DIR)` and runs `cargo fmt --check` + `cargo clippy
   --all-targets -- -D warnings` on EVERY crate. The graph UNDER-reported real
   coverage. 3 were genuine gaps and are now rostered UNCOVERED.
3. **C (18) -- unclaimed jobs**, including `gate/lint-fsharp`, `gate/lint-csharp`
   and `gate/lint-rust`. `lint-fsharp.ts` and `lint-csharp.ts` both run
   `dotnet format ... Zeta.sln`, i.e. over the whole solution, so every dotnet
   target claims them. The whole-repo hygiene legs got pseudo-targets on the
   pattern the graph already used for `leg:markdown` / `leg:shell`.

**After the corrections: 0 findings, 115 targets, 32 jobs, 4 workflows.** The
audit then caught its OWN newly-added gate job as unclaimed, which is the best
available evidence that it can fail.

**A change to a Rust crate previously selected NO leg. It now selects
`gate/lint-rust`** (plus semgrep/structural legs). That is the correction being
real rather than cosmetic.

## Three declared coverage gaps (a gap, NOT coverage)

`unit:agda`, `tool:alloy`, `lean:src/Core.Lean4.Cslib` have zero CI. Rostered with
reasons. **Soundness obligation moves to the selector: a change touching an
uncovered target must force FULL mode, never selective.** "We do not know what
checks this" resolves to "run everything". That is what keeps the exemption from
being the vacuity class.

## NOT done, and deliberately: the `if:` flip

**No provisioning is saved yet. Nothing consumes the selector outputs.** Saying
otherwise would be the "looks like progress and banks little" failure named in the
round-3 doc.

The emitter runs in **observe-only** mode so the derivation is checked against what
the gate actually ran BEFORE any `if:` depends on it. Trusting an unproven selector
is the same class of mistake as trusting an incomplete graph.

**Exit criteria for the flip (next, small, reversible):**

1. N consecutive PRs where the emitted leg set is a superset of the legs that
   actually did real work. Superset, not equal -- over-running is safe, under-
   running is the harm.
2. `if:` guards read ONLY `steps.<id>.outputs.leg_*`. No leg name is written into
   `gate.yml` as a condition -- a second copy of the graph as `if:` expressions is
   exactly how a wired graph becomes unwired again (round-3 §10.1).
3. Per-leg toolchain subsets in `tools/setup/`. **This is the piece that actually
   captures the 94%**; guards alone reduce job count, not per-job provisioning.

## Second measured symptom of the same root cause (2026-08-19)

Actions cache cleared 11.58 GB -> 8.73 GB by deleting three caches on dead refs
(two closed PRs, one merged) at ~826 MB each. **The pressure is PR-SCOPED
DUPLICATES OF THE UNION TOOLCHAIN**: each in-flight PR pulls its own 826 MB
`mise-Linux-X64` into its own ref scope, so three concurrent PRs is ~2.5 GB, which
is what pushes main's ~8.2 GB over the 10 GB ceiling and starts eviction.

So the ceiling was never the problem and the cleanup is symptom treatment that will
recur. A job needing only `bun` would scope a fraction of that. This is a cost
round 3 did not count and it strengthens the same conclusion: **subset-aware
provisioning fixes the waste, the failures, AND the cache pressure.**

## Open

- The flip, per the exit criteria above.
- The three uncovered targets: add CI, or accept them as permanent gaps that force
  full mode. Currently the latter, honestly labelled.
- The selector's FULL-mode-on-uncovered-target rule is documented in
  `audit-build-graph-completeness.ts` but is **not yet enforced in
  `build-graph.ts`** -- it must be, before the flip.
