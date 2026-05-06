---
name: Rule Number Three — assume an orthogonal trajectory already exists for the thing; find it
description: Aaron 2026-05-05 carved sentence — *"ruole thress assume there is already an ortohoginal trjeactor for the thing and find it"*. Specific application of Rule #1 to TRAJECTORIES — workflows, lints, cadences, the `.github/workflows/*-cadence.yml` axis basis, the `.github/workflows/*-lint.yml` axis basis. Default posture: an orthogonal trajectory already covers the work-axis; find it; extend it; don't stand up a new axis (rank-deficiency per `feedback_orthogonal_axes_factory_hygiene.md`).
type: feedback
---

# Rule Number Three — assume an orthogonal trajectory already exists; find it

## The carved sentence

Aaron 2026-05-05 verbatim:

> *"ruole thress assume there is already an ortohoginal trjeactor for the thing and find it"*

## Composition with Rules #1 and #2

- **Rule #1** — assume the substrate exists; locate it.
- **Rule #2** — assume the backlog row exists; walk depends-on.
- **Rule #3** — assume the trajectory exists; locate the workflow / cadence / lint that covers the work-axis.

Rule #3 is the orthogonal-basis-discipline application. Composes with `feedback_orthogonal_axes_factory_hygiene.md` (Aaron 2026-04-22): factory axes must form an orthogonal basis; rank-reduction = drop the duplicate.

## How to apply

When the impulse is *"I should add a workflow / cadence / lint / hook"*:

1. **Catch the impulse.**
2. **Apply Rule #3.** *"Assume an orthogonal trajectory already covers this axis. Where is the workflow / cadence / lint?"*
3. **Search the trajectory surfaces:**
   - `ls .github/workflows/` — every existing workflow file
   - `ls tools/lint/` and `ls tools/hygiene/` — every lint script
   - `ls .claude/hooks/` — every harness hook
   - Per `feedback_orthogonal_axes_factory_hygiene.md`: enumerate current axes, build pairwise overlap matrix, check whether the new proposal is rank-deficient with an existing axis
4. **If found**: extend the existing trajectory (add a new check to the same axis; widen the `paths:` filter; add a new step to the same workflow). Do NOT create a parallel.
5. **If not found**: only THEN author a new trajectory, with explicit acknowledgment in the new file's commit message of which existing axes were checked and why none of them subsumes the new one.

## Failure modes Rule #3 catches (this session, 2026-05-05)

1. **Compression-cadence proposal** — would have stood up a parallel `claude-md-compression-cadence.yml` rank-deficient with `razor-cadence.yml` substrate-pruning axis.
2. **Persona-name "Otto" in `.claude/skills/**`** — the `role-ref-current-state-surfaces-lint.yml` axis already exists; the gap is `paths:` scope (doesn't include `.claude/skills/**` + `.claude/agents/**`). Rule #3 says: extend the existing axis's scope, don't author a new lint.
3. **PR-comment git-native archive impulse** — `memory/project_git_native_pr_review_archive_*.md` already exists with 5-phase plan. The trajectory is named; mechanization is owed. Rule #3 says: don't propose parallel; execute the existing phases.

## Composes with

- **Rules #1 + #2** (substrate + backlog default postures)
- **`feedback_orthogonal_axes_factory_hygiene.md`** (Aaron 2026-04-22 orthogonal-basis discipline)
- **The capability skills already named in the skill router** — many trajectories ARE already capability skills (`razor-cadence`, `commit-message-shape`, `glossary-anchor-keeper`, etc.)

## Cold-boot instruction for future agents

When you wake and have an impulse to add a workflow / cadence / lint / hook, this rule is the orthogonal-basis check. The trajectory probably exists; extend it.
