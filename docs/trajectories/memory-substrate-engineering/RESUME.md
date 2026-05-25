# Trajectory - Memory Substrate Engineering

Status: active child packet
Last refreshed: 2026-05-07
Parent trajectory: `docs/trajectories/factory-trajectory-surface/RESUME.md`
Grounding backlog: `docs/backlog/P1/B-0190-memory-substrate-engineering-trajectory-aaron-2026-05-04.md`

## Why This Exists

Memory work is substrate engineering, not a cleanup chore. B-0190 names the
long-horizon rule: memory actions should default to trajectory service, with
short-horizon shortcuts chosen deliberately instead of accidentally.

This child packet keeps memory work out of one-shot compression mode. The lane
is a resume surface for memory-format, memory-ontology, memory-reference, and
memory-trust work that would otherwise sprawl across unrelated catches.

## Current Rule

Preserve evidence before compression. Compression is valid only when the
surviving surface keeps the routing signal, carved sentence, dependency links,
and trust boundary that future agents need.

When a memory item is too broad or too private for direct implementation,
decompose it into the next safe substrate action. Do not turn sensitive
conversation residue into public git content just to make the lane look busy.

## Current Next Action

Decompose B-0190 into the first three child backlog rows, without rewriting
memory files in the same slice:

```text
B-0190 step -> child backlog row -> acceptance check -> known privacy boundary
```

The first slice should file the child rows and update the parent references.
Implementation of those rows comes later, one PR at a time.

## Candidate Atomic Children

- memory-format standard row, grounded in B-0190 Step 2
- memory ontology/classification row, grounded in B-0190 Step 3
- memory retire/dead-code-deletion row, grounded in B-0190 Step 5
- memory cross-reference integrity audit row, grounded in B-0190 Step 6
- memory load-bearing-vs-decorative classifier row, grounded in B-0190 Step 7
- B-0006 acceptance recalibration slice, grounded in B-0190 acceptance
  criterion 3

## Evidence Links

- `docs/backlog/P1/B-0190-memory-substrate-engineering-trajectory-aaron-2026-05-04.md`
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
