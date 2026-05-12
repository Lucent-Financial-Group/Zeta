---
priority: P1
class: substrate-architecture
status: open
created: 2026-05-12
authors: [otto, aaron]
---

# B-0423 — MEMORY.md serialization-point anti-pattern (2026-05-12)

## Carved sentence

> MEMORY.md is the one synchronous lock-style coordination
> point in an otherwise lock-free factory architecture.
> Every PR adds entries at top → all parallel PRs conflict
> on the same line. This is architectural drift away from
> the scale-free / lock-free / weight-free DST property
> cluster.

## Observed

During the 2026-05-12 substrate-cascade tick, 10+ PRs
landed in parallel. Every one needed a MEMORY.md paired-
edit. Every one conflicted on the same top-of-file region.
Result: every PR needed force-rebase after siblings
merged, and the rebase queue grew faster than the merge
cadence could drain it.

The rest of the factory substrate is append-only / merge-
tolerant by design (memory files, docs/research, backlog,
ticks). MEMORY.md is uniquely *top-of-file-prepend*, which
forces serialization.

## Architectural fix candidates

1. **Append-only log + dynamic top-of-index view** —
   MEMORY.md becomes an append-only log where entries are
   inserted chronologically (at end). A separate "current
   view" gets generated/cached showing newest-N entries
   at top. The log itself is append-only and merge-
   tolerant.

2. **Per-file front-page** — eliminate MEMORY.md entirely.
   Each memory file's frontmatter has a `priority` and
   `created` field; the index is generated on read by
   scanning frontmatter. No central serialization point.

3. **Multi-file index sharding** — MEMORY.md becomes
   MEMORY-YYYY-MM.md sharded by month. Parallel PRs
   typically land in the same month, but the conflict
   surface shrinks substantially over time as months
   rotate. Cross-month parallel is rare.

4. **Topic-stream indexes** — MEMORY.md becomes multiple
   topic-streams (MEMORY-feedback.md, MEMORY-project.md,
   MEMORY-user.md, MEMORY-reference.md). PRs touching
   different topics never conflict. Smaller conflict
   surface within topics.

## Recommended approach

Option 1 (append-only log + dynamic top-of-index view)
preserves the wake-up fast-path ("read MEMORY.md first")
while eliminating the serialization point. The generated
view can be cached as a CURRENT-INDEX.md file that updates
on append.

## Composes with

- `memory/feedback_aaron_thousand_brains_theory_match_optimized_english_scaffolding_hardware_2026_05_12.md`
  (the 4-property formulation — MEMORY.md fails wait-free
  at the substrate-coordination layer)
- `memory/feedback_aaron_stanford_parallel_language_cluster_sequoia_legion_sdm_decision_archaeology_2026_05_12.md`
  (Sequoia/Legion lock-free distributed memory model —
  MEMORY.md should follow this pattern)
- `memory/project_memory_format_standard.md` (B-0330) —
  current format spec needs revision

## Why P1

Architectural drift away from the load-bearing 4-property
test (scale-free / lock-free / weight-free / DST). The
serialization point doesn't scale with multi-agent
parallel landing cadence. Already producing observable
friction (10+ PR rebase queue in single 2.5-hour tick).

Not P0 because the friction is recoverable via rebase;
landings still succeed. P1 because the friction grows
with multi-agent cadence and will become P0 at higher
scale.

## How to apply

When the architectural fix lands, all memory files'
paired-edit discipline becomes append-only-without-
conflict, restoring the 4-property test compliance for
the substrate-coordination layer.

Until then: accept the rebase grind as known-debt; rebase
in dependency-order (sibling PRs land sequentially as a
cluster); document the pattern in tick shards.

## Aaron 2026-05-12 calibration

Aaron 2026-05-12 acknowledged the architectural observation:
*"exceptional insight this is WHY max effort"* — confirming
both the depth of the architectural critique and the
justification for the substrate-grade max-effort work needed
to resolve it correctly (rather than papering over with
ad-hoc fixes).
