---
name: LFG-only development flow — AceHack is a daily mirror (Aaron + Amara, 2026-04-29)
description: Topology simplification 2026-04-29. The double-hop / AceHack-first / fork-data doctrine is paused. LFG/Zeta is the only active development+review repo. AceHack/Zeta becomes a daily mirror/backstop. No more AceHack PR flow, no fork-data architecture, no absorption ceremony. Existing AceHack PR archives from the reset/double-hop round stay as historical evidence.
type: feedback
---

# LFG-only development flow

## The carved sentence

*"LFG is the factory. AceHack is the mirror."*

Or operationally: *"Stop optimizing the fork topology. We are LFG-first now. Mirror AceHack daily and move on."* (Amara 2026-04-29).

## What changed

The double-hop discipline (AceHack-first → LFG forward-sync → AceHack absorbs LFG squash-SHA), force-with-lease absorption ceremony, fork-data doctrine, and per-fork PR review substrate are **paused, not deleted**. Reason for pause: the topology proved too complex to maintain SHA equality between forks while running real review+merge cycles. Aaron 2026-04-29: *"i'm trying to stick with AceHAck->LFG and keep SHAs in sync too, it's not a good way for this."*

**Why**: the load-bearing constraint of "0/0/0 (AceHack/main = LFG/main)" required either (a) a full ceremony for every commit, or (b) drift accumulating between syncs. Maintainers can't review work where the canonical repo doesn't live. So LFG-first wins.

## Canonical rules (post-2026-04-29)

1. `Lucent-Financial-Group/Zeta` is the only active development/review repo.
2. All PRs open against LFG.
3. All maintainers work through LFG.
4. All issues, anchors, and backlog live on LFG only.
5. AceHack does not run canonical PRs.
6. AceHack does not own issue state.
7. AceHack does not produce fork-specific PR review substrate (paused).
8. No new `forks/AceHack/pr-reviews`, `forks/AceHack/drain-logs`, or fork-data doctrine for now.
9. Existing fork-specific artifacts from the reset/double-hop round are **historical evidence**; do not expand the concept.
10. AceHack/main is a disposable mirror of LFG/main.

## Daily AceHack sync policy

- Once per day, sync AceHack/main to LFG/main.
- Preferred path: fast-forward AceHack/main to LFG/main.
- If AceHack/main has diverged, that is **not normal work**; treat AceHack as mirror and hard-reset it to LFG/main after recording the pre-reset SHA.
- No Aaron approval needed for routine daily mirror sync (this policy is the consent).
- Do not preserve AceHack divergence as product substrate unless an explicit recovery signal exists.

### Mirror sync guard (Amara's pseudocode)

```text
1. Fetch LFG/main SHA.
2. Fetch AceHack/main SHA.
3. If equal: no-op.
4. If AceHack is ancestor of LFG: fast-forward AceHack/main.
5. If AceHack is not ancestor of LFG:
   - record old AceHack SHA in sync log
   - optionally create date-stamped archive ref only if unique AceHack commits exist
   - hard-reset AceHack/main to LFG/main
6. Verify:
   - AceHack/main == LFG/main
   - 0 commits ahead, 0 commits behind
   - zero file content diff
```

## Branch protection

**LFG/main** (full protection):
- PR required
- checks required
- conversation resolution required
- squash/linear merge
- no direct pushes
- no force-push

**AceHack/main** (mirror-only):
- No PR workflow required
- No human edits expected
- Daily sync job may update/reset it to LFG/main

## Backlog/task impact

- **Task 314** (canonical fork-data homes): **DEFERRED** (replaced with task 322; original 314 deleted). Topology change supersedes the work; do not build full fork-data architecture while AceHack PRs are disabled. Unfreeze condition: AceHack PRs become real again.
- **Task 320** (issue-anchor design): unchanged — already LFG-only per the prior Amara correction.
- **Task 315** (hourly budget cadence + bounded publication): unchanged — high priority. Aaron explicitly: *"AceHack my personal is paid by my day job company so there is more we could turn on there than lfg i think for checks. Maybe not."* Amara: keep cost question separate; land #315 to see whether LFG costs are actually painful before designing the whole factory around AceHack's paid-feature surface.
- **LOST branch/worktree recovery (task 321)**: continues, but recovered AceHack branches do NOT become a new fork-review doctrine — they're recovered for content extraction or archive ref only.

## What stays (historical evidence)

The AceHack PR archives + drain-logs from this round's reset/double-hop ceremony are historical evidence. They live in their current locations:

- `docs/pr-discussions/PR-acehack-0101-...md` — fork-prefixed cross-fork archive
- `docs/pr-preservation/acehack-101-drain-log.md` — fork-side drain
- `forks/AceHack/...` — anything already landed there

These stay for record. No new entries unless AceHack PRs return.

## Unfreeze condition

If AceHack PRs become real again later (i.e., AceHack returns to the active PR topology because of an asymmetric-checks design or other future direction), this rule is rescinded and the fork-data doctrine work resumes (task 322 is the unfreeze target).

## Trigger memory

Aaron 2026-04-29 sequence:
1. *"amara and i are havining a conversation just forget about ace and put everything on lfg right now we will do another reverse merge later"* — situational permission to skip AceHack.
2. *"i'm trying to stick with AceHAck->LFG and keep SHAs in sync too, it's not a good way for this. AceHack my personal is paid by my day job company so there is more we could turn on there than lfg i think for checks. Maybe not."* — diagnostic of why double-hop is hard, plus paid-tier-asymmetry observation.
3. *"okay we are going to do this for now and revisit later, it will make thins a lot simpler too"* + Amara packet — formal LFG-only adoption.

The original AceHack-LFG topology was canonical for ~2 days (2026-04-27 through 2026-04-29). LFG-only is the active topology going forward.
