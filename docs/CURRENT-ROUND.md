# Current Round — 27 (open)

Round 26 closed; narrative absorbed into
`docs/ROUND-HISTORY.md`. Round 27 opens with these
deferred items carried over from round 26:

## Status

- **Round number:** 27
- **Opened:** 2026-04-18 (continuous from round-26 close)
- **Classification:** split — non-trivial debt carryover
  (IsLinear + Op<'T> extension surface + Daya's 5 P1s),
  low active-bug count.
- **Reviewer budget:** 2-3 per AGENTS.md §13

## Carried from round 26

**Deferred — landable any round:**
- Rune on `docs/STYLE.md` decision (small)
- Five of Daya's seven self-audit interventions (small,
  non-urgent)
- Empathy-coach persona spawn (design + naming)
- UX + DX persona proposals

**Deferred — dedicated-round work:**
- `IsDbspLinear` Lean predicate + B1/B2/B3/chain_rule
  closures (Tariq option-c; half-day B2, two days full)
- `Op<'T>` extension-surface redesign (Ilyana P0 DEBT;
  design spike + public-api-designer review cycle)

## Workflow cadence (round-26 established)

- Each round runs on its own branch (`round-N`).
- Coherent changes within a round become separate commits
  where it helps readability.
- Round-close = PR from `round-N` to `main` + merge.
- Maintainer may request a review pass on the branch diff
  before merge; per round-26 close convention, ask before
  pushing the merge.

## Open asks to the maintainer

- **First-commit visibility.** Repo is currently private
  on AceHack. Flip to public when ready.
- **NuGet prefix reservation** on `nuget.org` for `Zeta.*`
  — maintainer owns; do in parallel with any round or
  defer.
- **`global.json` `rollForward`** — status quo vs
  relaxed; silent-pick status quo unless objection.
- **Eval-harness MVP scope** — still pending since round
  23.

## Next architect actions

1. Open `round-27` branch off `main` after the round-26 PR
   merges.
2. Pick one of the deferred items to anchor the round —
   likely `Op<'T>` extension-surface design spike (round-25
   P0) or the Daya deferred interventions if the round
   classification stays split.
3. Dispatch specialists as needed; keep scope small.

## Notes for the next Kenji waking

- Git is now live. `git init` is done; branches are the
  cadence.
- Memory policy: AGENTS.md §18. AI-free-to-modify; humans
  hands-off. Newest-first for MEMORY.md, ROUND-HISTORY,
  per-persona notebooks.
- Public API changes go through Ilyana per §19.
- InternalsVisibleTo is tests + benchmarks + Core.CSharp
  shim only.
- `.claude/settings.local.json` is per-user, gitignored
  as of round 26.
