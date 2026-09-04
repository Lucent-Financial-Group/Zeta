---
id: 081M1N2JPVE087G0R001SK41RA
type: task
state: backlog
priority: P3
slug: hermetic-incremental-builds-across-nano-repos-the-overlay-wo
title: "hermetic incremental builds across nano-repos: the overlay workspace"
created: 2026-09-04T02:04:50.414Z
depends_on: []
composes_with: []
---

# hermetic incremental builds across nano-repos: the overlay workspace

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N2JPVE087G0R001SK41RA-*.md` glob. -->

Aaron 2026-09-03: *"this is the ultimate plan but it's gated by a good multi repo workflows
/ discriminated unions."*

Design write-up:
[`docs/research/2026-09-03-hermetic-incremental-builds-across-nano-repos-the-overlay-workspace-and-why-dus-gate-it.md`](../docs/research/2026-09-03-hermetic-incremental-builds-across-nano-repos-the-overlay-workspace-and-why-dus-gate-it.md)

## The ask

Bazel-class properties — hermetic, isolated, incremental, impacted-tests-only — over a
**federation of small repos** instead of one workspace root. Both halves pull against each
other: Bazel gets its properties by owning a single root, and the nano-repo direction is
the claim that there is no single root.

## Why it is P3 and gated, not P1 and blocked

Two prerequisites, and Aaron named both:

1. **Multi-repo workflow.** A change spanning three repos needs an answer to review-as-one-unit,
   CI-over-the-union, what "green" means when two of three are green, and how a revert
   spans the seam. `docs/research/2026-08-19-repo-split-round-3-*` already measured that
   **the union is the bottleneck** — a build system that makes the union cheap to compute
   and leaves it impossible to review has moved the cost, not removed it.
2. **Discriminated unions.** A cross-repo reference is a sum type (`SameRepo` / `SiblingRepo`
   / `PinnedRelease` / `Generated` / `Unknown`), and as a string it collapses two different
   silences — "matches no target" and "belongs to a repo you have not checked out" — into
   one. The second is not an unknown at all; it has a correct answer (use the pin).
   `src/Core/DuExpand.fs` is where that thread already lives.

## Not greenfield

`src/Core.TypeScript/ace/build-graph.ts` already carries the graph, the `affected` query,
derived-not-invented edges, and the safety property that **unknown escalates to FULL**. The
missing piece is not a build graph; it is that today's graph has exactly one repo root.

## The one constraint that shapes the answer

[`clone-at-tag-stays-sufficient`](../.claude/rules/clone-at-tag-stays-sufficient.md) forbids
a tree that needs a particular tool on PATH to build. So Bazel is an **oracle to consult,
not a hub to route through**: the graph and the carve stay ours and stay plain data, and a
faster executor over them is an optimisation anyone may decline.

## First increments, when it is picked up

- Declare the union in a **manifest** (which repos, at which revisions) rather than
  inferring it from what happens to be on disk — an overlay inferred from the filesystem
  makes the build depend on ambient state, which is the §13 violation the hermeticity this
  is modelled on exists to forbid.
- Give `TargetRef` a discriminated union and make `Unknown` a first-class case that
  escalates to FULL, matching the existing single-repo stance.
- Prove the union of per-repo carves is **order-independent** — the same invariant the
  in-flight commutativity work is establishing one layer down.

Register: PLAN. Nothing here is measured; nothing has shed `toy`.
