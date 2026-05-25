# Trajectory - Memory Substrate Engineering

Status: active — decomposed
Last refreshed: 2026-05-08
Parent trajectory: `docs/trajectories/factory-trajectory-surface/RESUME.md`
Grounding backlog: `docs/backlog/P1/B-0190-memory-substrate-engineering-trajectory-aaron-2026-05-04.md`

## Why This Exists

Memory work is substrate engineering, not a cleanup chore. B-0190 names the
long-horizon rule: memory actions should default to trajectory service, with
short-horizon shortcuts chosen deliberately instead of accidentally.

This child packet keeps memory work out of one-shot compression mode. The lane
is a resume surface for memory-format, memory-ontology, memory-reference, and
memory-trust work that would otherwise sprawl across unrelated catches.

## Decomposition (2026-05-08)

B-0190 is now decomposed into 9 child rows (B-0330..B-0338) plus 2 existing
rows (B-0006, B-0066). The dependency graph has two roots that are buildable
now with no dependencies:

**Buildable now:**

- B-0330 — Memory-format standardization (Step 2, P1, S)
- B-0332 — Load-bearing-vs-decorative classifier (Step 7, P1, S)

**Blocked on B-0330:**

- B-0331 — Memory ontology/classification audit (Step 3, P1, M)
- B-0334 — Cross-reference integrity enforcement (Step 6, P1, S)
- B-0335 — Memory schema validation tooling (Step 11, P1, M)

**Blocked on B-0332:**

- B-0333 — Memory-retire/supersession discipline (Step 5, P1, S)
- B-0336 — B-0006 acceptance recalibration (AC-3, P1, S)
- B-0337 — Trust-calculus calibration (Step 8, P2, M)

**Blocked on B-0330 + B-0332 + B-0333:**

- B-0338 — Memory graduation ladder (Step 9, P2, M)

**Existing (compose, not children):**

- B-0006 — MEMORY.md compression (Step 1, in-progress)
- B-0066 — Marker-vs-index (Steps 4+10, decomposition pending)

## Current Rule

Preserve evidence before compression. Compression is valid only when the
surviving surface keeps the routing signal, carved sentence, dependency links,
and trust boundary that future agents need.

When a memory item is too broad or too private for direct implementation,
decompose it into the next safe substrate action. Do not turn sensitive
conversation residue into public git content just to make the lane look busy.

## Current Next Action

Pick up one of the two buildable-now roots:

1. **B-0330** (memory-format standardization) — define the canonical memory
   file format as a project-policy memory file. Unblocks B-0331, B-0334,
   B-0335, B-0338.
2. **B-0332** (load-bearing classifier) — build a TS tool that traces citation
   chains from bootstrap surfaces into memory/. Unblocks B-0333, B-0336,
   B-0337, B-0338.

Both are S-effort and can be worked in parallel by independent loops.

## Evidence Links

- `docs/backlog/P1/B-0190-memory-substrate-engineering-trajectory-aaron-2026-05-04.md`
- `docs/backlog/P1/B-0330-memory-format-standardization-step2-b0190.md`
- `docs/backlog/P1/B-0332-memory-load-bearing-vs-decorative-classifier-step7-b0190.md`
- `docs/backlog/P1/B-0006-memory-md-compression-pass-prune-distill-entries-to-one-line-cap-200-lines.md`
- `docs/backlog/P1/B-0066-memory-md-marker-vs-index-harness-verify-q1-automemory-aaron-2026-04-28.md`
- `memory/MEMORY.md`
- `memory/README.md`

## Out Of Scope

- No broad memory rewrite.
- No deletion of old memories.
- No private disclosure migration into public git.
- No new memory policy unless a separate promotion surface lands.

This packet exists so memory work can be picked up, resumed, and audited as a
trajectory instead of rediscovered as a crisis.
