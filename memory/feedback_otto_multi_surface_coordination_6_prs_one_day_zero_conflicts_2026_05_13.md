---
name: otto-multi-surface-coordination-6-prs-one-day-zero-conflicts
description: "2026-05-13 empirical evidence — 6 PRs across 2 Otto surfaces (CLI + Desktop) in one ~4-hour window, all complementary, zero merge conflicts at the substrate level. The unified-identity coordination model produces convergent work without explicit message-passing."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---

## What happened (2026-05-13 18:00Z–22:23Z)

Six PRs were authored across two Otto surfaces (Otto-CLI in the
primary terminal session + a parallel Otto process operating in
detached worktrees) within a ~4-hour window. The PRs all
complement each other; none conflict at the substrate level.
The unified-identity model is empirically working at git scope.

| PR | Surface | Topic | State at 22:23Z |
|----|---------|-------|-----------------|
| #3034 | Otto-Desktop | git-tracked Claude Desktop routines + autonomous-loop registration | **MERGED** (395ca77) |
| #3037 | Otto-CLI | SENDER_IDS schema extension — multi-surface variants | **MERGED** (a783fb1) |
| #3040 | Otto-CLI | B-0442 slice 3 — real branch-vs-squash comparator | **MERGED** (e0515f8) |
| #3041 | Parallel-Otto (worktree `/private/tmp/zeta-otto-comms`) | Otto inter-surface communication channels reference card | OPEN (4 threads) |
| #3042 | Otto-CLI | 3-surface autonomous-loop convergence (`docs/AUTONOMOUS-LOOP-PER-TICK.md`) | OPEN (CI in-progress) |
| #3043 | Parallel-Otto (worktree `/private/tmp/zeta-b0444`) | B-0444 — worktree field on claim envelope | OPEN (CI in-progress) |

## How this coordinated without explicit message-passing

**The unified-identity discipline produces convergence.** Both
Otto surfaces apply:

- Same `.claude/rules/*` (auto-loaded at cold-boot)
- Same CLAUDE.md
- Same canonical bootstream
- Same backlog priorities
- Same claim-coordinator (`tools/bus/claim.ts`)
- Same substrate-honest disciplines

When two instances of the same identity work the same backlog
under the same rules, they pick complementary work because:

1. **Claim-coordinator prevents head-on collisions** — `claim
   acquire` exit code 1 = pick a different row
2. **Backlog priorities are shared** — both surfaces see the
   same P0/P1/P2 ordering
3. **Same-identity heuristic picks** — given same context, both
   surfaces converge on similar "what's next" decisions, but
   the claim-coordinator forces diversification when overlap
   occurs

## Empirical conflict observations

| Conflict type | Occurrences | How resolved |
|---------------|-------------|--------------|
| Git merge conflicts at PR-merge time | 0 | n/a |
| Rebase conflicts on update-branch | 1 (PR #3042 rebase onto main with PR #3034 merged) | Trivial 3-way merge (concurrent edits to same SKILL.md lines; both versions compatible; manual resolution in <30s) |
| Claim-acquire blocks (Otto-A blocked by Otto-B) | 0 observed today | n/a (lane discipline kept us separated) |
| Branch-creation confusion (committed to wrong branch) | 2 (during PR #3042 setup) | Recovered via `git checkout <SHA> -- <files>` from orphan commits |
| Stash collisions | 0 | n/a |
| Lost work | 0 | n/a |

## Substrate-honest framing

This is NOT proof that unified-identity coordination scales
indefinitely. Today the workload was naturally complementary
(6 different problems). When two surfaces would race on the
SAME problem, the claim-coordinator + lane discipline are the
mechanisms that prevent collision. Today those mechanisms
WORKED but were rarely STRESSED.

What IS demonstrated:

- The "split-brain" risk Aaron named 2026-05-13 09:00Z is
  ADDRESSABLE — the claim-coordinator + surface-tagged sender
  IDs (PR #3037) + lane discipline form a functioning stack
- Unified-identity is OPERATIONALLY VIABLE for parallel work
  in this factory at today's scale (2 surfaces, ~6 concurrent
  problems)
- Substrate-honest discipline at the cold-boot layer produces
  convergent priorities without explicit cross-surface
  communication

## Composes with

- [[feedback_aaron_otto_identity_stays_unified_across_surfaces_aaron_offered_split_otto_chose_one_coherent_identity_glass_halo_both_sides_2026_05_13]]
- [[feedback_aaron_multi_foreground_surface_otto_activation_routines_git_tracked_approval_friction_lane_split_2026_05_13]]
- PR #3032 (claim-acquire-before-worktree-work rule)
- PR #3037 (SENDER_IDS schema extension)
- PR #3034 (Otto-Desktop routines substrate)
- PR #3042 (3-surface autonomous-loop convergence)
- B-0400 (bus protocol — the substrate this coordination uses)
- B-0444 (worktree field on claim envelope — parallel-Otto's
  ongoing observability work)

## Operational rule for future-Otto

When multi-Otto parallel work happens:

1. **Trust the discipline** — same-identity + same-rules produces
   convergent priorities; explicit message-passing is for
   coordination edge cases, not default operation
2. **Use the claim-coordinator** — `claim acquire` before any
   worktree-creating backlog work; lane separation does the rest
3. **Lane discipline** — Otto-CLI takes backlog grinding / code /
   rule work; Otto-Desktop takes substrate / routines / cowork
4. **Don't try to coordinate via human ferry unless needed** —
   today's empirical evidence shows the substrate self-organizes
5. **If conflict surfaces, prefer "let parallel-Otto's work win"
   + restart from origin** — same-identity means same intent;
   reset-and-redo is cheap; argue-and-rebase-merge is expensive

## What this is NOT

- NOT a claim of scaling-without-bound — 2 surfaces with ~6
  problems is empirically validated; 10 surfaces with 100
  problems is not
- NOT a claim that explicit coordination is unnecessary — the
  bus protocol (B-0400) + claim-coordinator are LOAD-BEARING
  even when they fire 0 times in a session (they prevent
  collisions that didn't happen because of their existence)
- NOT a substitute for substrate-honest disclosure — the 2
  branch-creation confusions today are real failure modes
  documented in `docs/hygiene-history/ticks/2026/05/13/2219Z.md`
- NOT a claim about WHICH surface owns WHICH work — today the
  assignments were emergent; tomorrow may differ; the
  discipline (claim-coordinator + lane convention) is the
  invariant, not the specific assignment

## Full reasoning

The session sequence that produced this evidence:

1. 18:00Z–20:00Z — Otto-CLI working on B-0440 detector + claim
   acquire substrate + memory disclosures
2. 20:00Z–21:00Z — Otto-Desktop activated; first routine
   registered; substrate-honest split-brain question surfaced
3. 21:00Z–22:00Z — PR #3037 (SENDER_IDS) + PR #3040 (B-0442
   slice 3) authored by Otto-CLI; PR #3034 (routines) by
   Otto-Desktop; parallel reviewers (Codex + Copilot) finding
   threads; both Ottos resolving threads in their own lanes
4. 22:00Z–22:20Z — PR #3034 merged; PR #3041 (comm-channels)
   + PR #3043 (B-0444) opened by parallel-Otto in detached
   worktrees; PR #3042 (loop convergence) opened by Otto-CLI;
   all three CI-in-progress simultaneously
5. 22:20Z–22:23Z — Codex + Copilot find P1s on PR #3042;
   Otto-CLI fixes during CI wait of its own PR

Zero merge conflicts. Zero claim-acquire blocks observed.
Two recovered branch-creation confusions. Six PRs in flight.
