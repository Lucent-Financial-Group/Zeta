---
name: `loop-tick-history.md` deserves its OWN swim lane — single-writer-per-file invariant; currently only Otto (main tick) writes rows; subagents only touch it via rebase-conflict-resolve or their own PR's tick-row; peer-agent mode (Codex / Gemini driving concurrent autonomous loops) would need per-harness tick-history files to avoid three-writers-on-one-file cascade; Aaron Otto-240 follow-up to Otto-239 swim-lane directive; 2026-04-24
description: Aaron Otto-240 "loop-tick-history.md likely deserves it's own swimlane maybe, IDK do the subagents do this or only Otto, if this is only Otto then yes this should be it's own swimlane and what happens in peer-agent mode with this file?" — the right question sequence. This memory captures the thinking that the eventual swim-lane executor (Otto-239 BACKLOG row) needs, since BACKLOG rows are append-only (can't edit).
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The question sequence Aaron named

1. Should `docs/hygiene-history/loop-tick-history.md` get
   its OWN swim lane (not grouped with other docs)?
2. Who currently writes to it — only Otto (main tick), or do
   subagents also write?
3. What happens when peer-agent mode (Otto-86 Stage (c)/(d)
   progression) brings Codex and Gemini into the autonomous
   loop alongside Claude Code?

The Otto-239 BACKLOG row for swim-lane-by-file-isolation
research needs these questions embedded in its scope so the
solver doesn't miss them.

## Answers (current understanding)

### Who writes to `loop-tick-history.md` today

- **Otto (main tick)** — single appender. Per
  `docs/AUTONOMOUS-LOOP.md` end-of-tick checklist, the main
  tick appends ONE row per fire. This is the canonical
  writer.
- **Subagents** — NEVER write tick rows directly during a
  drain. Two edge cases where a subagent touches the file:
  - **Rebase-conflict-resolve**: when a drain subagent
    rebases a PR that itself contains a tick-row, and main
    has appended rows in the interim. Keep-both-chronological
    per Otto-229 append-only. The subagent is resolving a
    conflict, not authoring a row.
  - **Drain fix on the PR's own tick-row content**: the
    subagent may edit a row that the PR itself introduced
    (pre-merge draft refinement), not an already-committed
    row. Otto-229 permits pre-merge refinement of the PR's
    own additions.
- **Effectively**, Otto is the single committer of new rows.
  The file satisfies the "single-writer per swim lane"
  invariant today.

### Multi-writer problem generalised (peer-agent AND multi-instance)

Otto-86 Stage (c)/(d) progression brings Codex and Gemini
into factory-authored autonomous-loop roles. Aaron Otto-240
follow-up: *"or even two claudes on two different machines"*.
So the multi-writer concern is not just cross-HARNESS — it's
cross-INSTANCE. Any of the following scenarios produces
concurrent writers on a shared tick-history file:

- Two Claude Code CLI instances on two machines (Aaron's
  laptop + Aaron's Windows PC, or Aaron's laptop + a cloud
  runner).
- One Claude + one Codex + one Gemini, each on its own
  machine.
- A single harness running two concurrent sessions on the
  same machine (possible with `--fork-session`).
- A cron-driven loop-tick that fires while a manual session
  is also making factory-tick entries.

All of these produce N > 1 concurrent writers on a single
append-only file. Otto-232 cascade happens the moment two
writers push overlapping rows.

**Aaron Otto-240 follow-up test case:** *"what about two
claudes on the same machine in peer mode, we will want to
test like this for sure"*. Two Claude Code sessions running
concurrently on the same laptop — same harness, same machine,
different session IDs. This is the cheapest way to exercise
the multi-instance pattern without needing multi-machine
infra. The writer-ID scheme MUST disambiguate purely by
session-id since harness and machine are identical. If the
scheme is only `{harness}-{machine}.md`, the two Claudes
collide; if it's `{harness}-{machine}-{session-id}.md`, they
each get their own file. So **session-id is load-bearing**,
not merely nice-to-have.

Practical test ladder:

1. **Same-machine two-Claudes (cheapest, do first)** — launch
   two `claude` sessions on Aaron's laptop. Each gets a unique
   harness session ID (visible via `/sessions` or
   `~/.claude/projects/<slug>/<session-id>.jsonl`). Both run
   autonomous-loop equivalents. Verify they each write to
   their own `tick-history/<writer-id>.md`. Verify no cascade.
2. **Cross-machine two-Claudes** — Aaron's laptop + Aaron's
   Windows PC (post Otto-215 Windows-harness landing). Same
   test; different machine-ID component.
3. **Cross-harness peer-agent** — Claude + Codex + Gemini
   concurrently. Session-id uniqueness still enforces
   isolation; harness-name adds provenance.

Test (1) is the minimum viable multi-instance probe. Can ship
before any infra work; just requires the per-writer-file
scheme to be in place.

**Isolation should be per-WRITER-INSTANCE, not just per-
harness:**

- **(A) Per-writer files with unique IDs** —
  `docs/hygiene-history/tick-history/<writer-id>.md` where
  `<writer-id>` encodes `{harness}-{machine}-{session-id}`
  (e.g. `claude-laptop-m4-01937bff2.md`). Each writer appends
  only to its own file. A roll-up script reads across all
  files chronologically for audit-trail aggregation.
  **Simplest, maximally parallel-safe.**
- **(B) Per-harness files (coarser)** —
  `docs/hygiene-history/{claude,codex,gemini}-tick-history.md`.
  Only correct if there's exactly ONE instance of each
  harness writing ever. Breaks the moment Aaron runs two
  Claudes on two machines.
- **(C) Single file, strict single-writer-per-batch protocol**
  — locking / checkout protocol that serialises writers
  across harnesses AND instances. Requires external
  coordination (DIRECTORY.lock, git-based single-writer
  claim, central service). High complexity.
- **(D) Append-via-git-atomic-commit-rebase** — each writer
  appends locally, attempts to push, on conflict rebases
  chronologically, retries. Relies on git itself as the
  serialiser. Works at SCALE of small N writers; degrades
  when N × write-rate approaches GitHub API rate limits.

**Recommended: option (A) per-writer-file with unique
writer-ID** when multi-instance / peer-agent mode ships.
Each writer always knows its own `<writer-id>` and only
appends to its own file; aggregation is a read-time concern,
not a write-time coordination concern. This is the read-
vs-write-amplification tradeoff that naturally favours write-
side simplicity.

Until then, `loop-tick-history.md` stays single-file,
single-writer (Otto on Aaron's primary machine only).

### Swim-lane lane placement

Given single-writer-today, the file belongs in its own lane
or in a broader "audit-trail" lane:

- **Lane-C (audit-trail)** per Otto-239's initial proposal
  contained `docs/hygiene-history/**` + `docs/ROUND-HISTORY.md`
  + `docs/DECISIONS/**`. All append-only, all single-writer.
  Grouping is fine because concurrent writes across these
  files don't contend (different files).
- **OR Lane-C narrowed to just `loop-tick-history.md`** —
  defensible if peer-agent mode introduces per-harness files
  and we want the lane to scale as a pattern. But aggressive
  today.

**Recommended: Lane-C = all of `docs/hygiene-history/**`**
(including `loop-tick-history.md` and the
`nsa-test-history.md` / other history files that have
emerged). The file-isolation discipline is "no two subagents
touching the same file at once," not "no two subagents
touching the same lane." Multiple subagents on different
audit-trail files within Lane-C is safe — they just can't
collide on a single file.

## What this means for Otto-239 row execution

When a future Otto dispatches subagents to build out the
swim-lane design, the scope should include:

1. Single-writer invariant per file (this IS what "swim-lane
   by file isolation" means operationally).
2. Peer-agent mode contingency — design the lane layout so
   per-harness tick-history files slot in cleanly (option A
   above) without re-architecting.
3. Explicit subagent-dispatch-prompt constraint: "You may
   only edit files in Lane <X>; any conflict on a file in
   Lane <Y> must be escalated rather than edited in-subagent."
4. Cross-harness coordination protocol for the broader
   audit-trail lane if/when Codex / Gemini join — each harness
   writes to its own file; cross-references by timestamp; no
   shared files across harnesses.

## What this memory does NOT authorize

- Does NOT authorize renaming `loop-tick-history.md` to
  `claude-tick-history.md` today — that's premature before
  peer-agent mode ships.
- Does NOT authorize enforcing lane-crossing-as-error for
  subagents today — Otto-239 row explicitly says "research
  first, propose enforcement shape."
- Does NOT authorize a central lock mechanism for
  `loop-tick-history.md` — option (C) is noted as higher
  complexity; prefer file-isolation (A) over locking.
- Does NOT supersede the Otto-232 cascade-bulk-close rule
  when N>5 old tick-close PRs are stuck on the same file —
  that remains the correct response to cascade symptoms.

## Composition with prior memory

- **Otto-229 append-only audit-trail** — the invariant this
  memory is elaborating. Append-only is compatible with
  file-isolation swim-lanes; the two disciplines compose.
- **Otto-232 hot-file cascade bulk-close** — the symptom
  this lane-design is intended to prevent proactively.
- **Otto-226 parallel subagent drain** — the dispatch
  mechanism the lane-constraint will be enforced through.
- **Otto-239 swim-lane file-isolation BACKLOG row** — this
  memory is its thought-notes annex. Solver of that row
  should find this memory via `grep -i "loop-tick-history\|peer-agent" memory/` or via the indexed MEMORY.md entry.
- **Otto-86 peer-agent progression** (Stage a/b/c/d) — the
  long-term driver for why per-harness tick files may need
  to split.
- **Otto-215 bun+TS post-install migration + peer-agent
  Windows harness** — the near-term context for peer-agent
  mode actually shipping.

## Direct Aaron quote to preserve

> *"loop-tick-history.md likely diserves it's own swimlane
> maybe, IDK do the subagents do this or only Otto, if this
> is only Otto then yes this should be it's own swimlane
> and what happens in peer-agent mode with this file? think
> about all this when solving on the backlog."*

Future Otto (solver of Otto-239 row): (1) Otto is the single
writer today, (2) subagents only touch via rebase-resolve or
their PR's own row, (3) multi-instance mode (including two
Claudes on two machines — Otto-240 follow-up) will need
per-WRITER-INSTANCE files, not just per-harness. Design for
N > 1 writers from the start; don't paint into a single-file
corner. Write-side simplicity (each writer appends to its own
file) beats read-side coordination complexity (locks, atomic-
commit protocols).
