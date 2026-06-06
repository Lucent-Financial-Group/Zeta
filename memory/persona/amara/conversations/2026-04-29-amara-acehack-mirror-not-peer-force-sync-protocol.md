# Amara — AceHack mirror-not-peer, force-sync protocol while inactive

**Date**: 2026-04-29
**Channel**: Aaron (chat) + Amara (relayed via Aaron)
**Status**: Research-grade preservation. The Aaron + Amara quoted bodies are verbatim; the surrounding framing is translation/synthesis. The distilled rules extend the existing canonical home at `memory/feedback_lfg_only_development_flow_acehack_is_mirror_aaron_amara_2026_04_29.md` (per Otto-362 in-place expansion, not duplication). This preservation includes THREE same-day Amara contributions: (1) force-with-lease command discipline, (2) remote-topology cleanup (the dual-root problem), and (3) multi-remote-script-design constraint for the TS port and future git tooling.

---

## Trigger

Aaron noted (mid-tick on the PR #857 codeql lane): _"i agree about fork we can just force push acehack everytime now since it's not active"_.

Amara then sharpened the doctrine into explicit topology + safe-command shape (verbatim packet below), refining "force push every time" to "`--force-with-lease` by default; raw `--force` only when intent is to overwrite regardless".

The trigger is a topology shift: AceHack/Zeta is no longer an active collaboration surface. The double-hop ceremony (AceHack first → forward-sync to LFG → AceHack absorbs LFG's squash-SHA) was the protocol when both forks carried independent active PR work. With AceHack inactive, that ceremony is over-engineered.

## Aaron — verbatim

> _"i agree about fork we can just force push acehack everytime now since it's not active"_

## Amara — verbatim packet

> _Amara correction:_
>
> _Aaron and I agree on AceHack._
>
> _AceHack is no longer an active peer/collaboration surface right now._
>
> _Treat LFG/Zeta as canonical._
> _Treat AceHack/Zeta as a mirror/projection._
>
> _That means we do NOT need double-hop ceremony for every change while AceHack is inactive._
>
> _Approved topology for now:_
>
> _- All active work lands on `Lucent-Financial-Group/Zeta`._
> _- AceHack does not carry independent active PR authority._
> _- AceHack may be force-synced from LFG._
> _- If AceHack has drift, overwrite it from LFG rather than doing absorption ceremony._
> _- Do not preserve fork-data semantics for inactive AceHack PR workflows unless/until AceHack becomes active again._
>
> _Safe mirror rule:_
>
> ```
> LFG main → AceHack main
> ```
>
> _not:_
>
> ```
> AceHack main → LFG main
> ```
>
> _not bidirectional._
>
> _Use a force-sync / mirror-sync command only after verifying:_
>
> _1. LFG main is up to date locally._
> _2. AceHack has no active contributor PRs we care about._
> _3. AceHack has no independent commits we intend to preserve._
> _4. The command direction is LFG → AceHack._
> _5. The resulting AceHack head equals LFG main._
>
> _Preferred command shape:_
>
> ```bash
> git fetch origin main
> git fetch acehack main
> git checkout main
> git reset --hard origin/main
> git push acehack main:main --force-with-lease
> ```
>
> _If `--force-with-lease` blocks because AceHack changed unexpectedly, stop and inspect._
> _Only use raw `--force` if the explicit goal is to overwrite AceHack regardless because it is confirmed inactive mirror state._
>
> _After push, verify:_
>
> ```bash
> git ls-remote origin refs/heads/main
> git ls-remote acehack refs/heads/main
> ```
>
> _They should match._
>
> _Carved rule:_
>
> ```
> LFG is canonical.
> AceHack is mirror while inactive.
> Mirrors are overwritten, not ceremonially absorbed.
> ```
>
> _If AceHack becomes active again, this rule expires and we reintroduce claim/review protections._
>
> _I'd be slightly stricter than "force push AceHack every time":_
>
> ```
> Use --force-with-lease by default.
> Use --force only when the exact purpose is "overwrite whatever is there."
> ```
>
> _`--force-with-lease` is the safer form because it refuses to overwrite remote work that appeared after your last fetch; raw `--force` just overwrites. Git's own docs describe `--force-with-lease` as refusing to update unless the remote ref still matches the expected value, which is exactly the safety latch you want for "inactive but let's not be stupid."_
>
> _The important doctrine change:_
>
> ```
> Double-hop is for two active surfaces.
> Mirror-sync is for one active surface plus one inactive projection.
> ```
>
> _So yes: AceHack can be force-synced now. Just don't let Claude phrase it like "fork absorption ceremony." That phrase belongs in the trash drawer with "temporarily Aaron-authorized ruleset toggle."_

**Note (non-verbatim, naming-discipline reconciliation):** in the verbatim "Preferred command shape" block above, the remote is named `acehack`. Under the explicit naming discipline established by packet 2 below, the recommended name for that mirror remote is `acehack-mirror` (chosen so the topology cannot be misread as an active peer). The verbatim quote is preserved as-written for fidelity; in operational use, substitute `acehack-mirror` wherever `acehack` appears as a remote name.

## Amara packet 2 — verbatim (remote-topology cleanup, "dual-root" disambiguation)

Aaron (chat): _"i think i had a dual git root and we removed it because that may need o reverse direction or something else, [Amara] is on this"_

Amara correction (verbatim):

> _Yes. I agree. If LFG is canonical and AceHack is inactive mirror, then we should remove the confusing "dual git root" / "repo points to both" setup._
>
> _Tiny wording correction: Git does not really have a "dual root"; what you probably mean is one of these:_
>
> ```
> origin fetches from one repo but pushes to another
> origin has multiple push URLs
> local branches track one remote while scripts push another
> both LFG and AceHack are treated like equal remotes
> ```
>
> _That is exactly what we should simplify._
>
> _GitHub's docs describe remotes as named URLs and show that `git remote set-url` changes an existing remote URL, while `git remote rm` only removes the local remote reference and does not delete the server repo. Git's own docs also warn that force-pushing with multiple push destinations can overwrite more refs than intended, which is another reason to kill any ambiguous multi-push setup._
>
> _Current topology:_
>
> _- `Lucent-Financial-Group/Zeta` = canonical active repo_
> _- `AceHack/Zeta` = inactive mirror / personal fork projection_
> _- all normal branches track/push to LFG_
> _- AceHack sync is explicit mirror maintenance only_
>
> _Do not keep a local setup where `origin` points to both LFG and AceHack, or fetches from one and pushes to the other._
>
> _Desired local remote shape — normal dev clone:_
>
> ```
> origin  git@github.com:Lucent-Financial-Group/Zeta.git (fetch)
> origin  git@github.com:Lucent-Financial-Group/Zeta.git (push)
> ```
>
> _Optionally, if we want mirror maintenance from the same clone:_
>
> ```
> acehack-mirror  git@github.com:AceHack/Zeta.git (fetch)
> acehack-mirror  git@github.com:AceHack/Zeta.git (push)
> ```
>
> _But no local branch should track `acehack-mirror/_`.\*
>
> _Cleanup inspection:_
>
> ```bash
> git remote -v
> git config --get-all remote.origin.url
> git config --get-all remote.origin.pushurl
> git branch -vv
> ```
>
> _If `origin` has AceHack as a push URL, remove it._
>
> _If `origin` has multiple push URLs, delete the AceHack push URL and normalize origin to LFG._
>
> _Normalize origin to LFG:_
>
> ```bash
> git remote set-url origin git@github.com:Lucent-Financial-Group/Zeta.git
> ```
>
> _If a pushurl exists, inspect:_
>
> ```bash
> git config --get-all remote.origin.pushurl
> ```
>
> _If it includes AceHack, delete it:_
>
> ```bash
> git remote set-url --delete --push origin git@github.com:AceHack/Zeta.git
> ```
>
> _Then verify:_
>
> ```bash
> git remote -v
> ```
>
> _Optional mirror remote — if we want explicit mirror sync from this clone:_
>
> ```bash
> git remote remove acehack 2>/dev/null || true
> git remote remove acehack-mirror 2>/dev/null || true
> git remote add acehack-mirror git@github.com:AceHack/Zeta.git
> ```
>
> _Name it `acehack-mirror`, not `upstream`, not `origin`, not `acehack-active`. The name should make the topology impossible to misunderstand._
>
> _Branch tracking cleanup — for active branches:_
>
> ```bash
> git branch --set-upstream-to=origin/main main
> ```
>
> _For feature branches, default push target should be LFG:_
>
> ```bash
> git push -u origin <branch>
> ```
>
> _Never accidentally push feature work to AceHack._
>
> _Carved:_
>
> ```
> LFG is canonical.
> AceHack is mirror.
> Origin points to canonical.
> Mirrors are updated explicitly, never accidentally.
> ```
>
> _My preference:_
>
> ```
> origin = LFG only
> acehack-mirror = optional, explicit, never branch-upstream
> ```
>
> _And yes, if you want the cleanest possible posture, remove AceHack as a remote entirely from normal working clones and put mirror-sync in a dedicated script or dedicated mirror worktree. But if Otto needs to run the mirror from the same clone, `acehack-mirror` is acceptable because the name screams "do not develop here."_
>
> _Blade:_
>
> ```
> One origin.
> One canonical repo.
> Mirror by explicit command only.
> ```

## Amara packet 3 — verbatim (multi-remote support discipline for scripts going forward)

Aaron (chat): _"when moving to ts or anywhere we have git scripts"_

Amara (relayed; substantive design constraint for the TS port + future git tooling):

> _Yes — don't rip out multi-remote support entirely. But also don't make every script carry the full fork-orchestra complexity by default._
>
> _The better design is:_
>
> ```
> Simple default:
>   one canonical repo, one origin
>
> Explicit advanced mode:
>   optional mirror/upstream/remotes when needed
> ```
>
> _Multi-remote setups are common enough that supporting them is not weird. GitHub's own fork workflow tells contributors to clone their fork and configure the original repository as `upstream`, while GitHub's fork-sync docs describe keeping a fork up to date from upstream. Atlassian describes the same thing for enterprise forking workflows: a fork workflow commonly has two remotes, one for the developer fork and one for the official repository._
>
> _So the market of users who need multiple remotes is real:_
>
> ```
> open-source contributors:
>   origin = my fork
>   upstream = canonical repo
>
> company mirror:
>   origin = canonical GitHub
>   gitlab = mirror / migration target
>
> deployment:
>   origin = source repo
>   production/heroku/etc. = deploy remote
>
> personal fork projection:
>   origin = canonical LFG
>   acehack-mirror = inactive mirror
> ```
>
> _But our scripts should not assume Zeta's old dual-active LFG/AceHack topology. That's the part to simplify._
>
> _Keep multi-remote support as an explicit advanced capability, but make the default path single-origin._
>
> _Default script behavior:_
> _- use origin_
> _- assume origin is canonical_
> _- do not inspect or mutate other remotes_
>
> _Advanced script behavior:_
> _- accept --remote_
> _- accept --mirror-remote_
> _- accept --upstream_
> _- read config if provided_
> _- never guess_
>
> _So instead of scripts doing this everywhere:_
>
> ```
> detect LFG
> detect AceHack
> infer direction
> double-hop
> absorb
> sync
> ruleset toggle
> fork data
> ```
>
> _they should do this:_
>
> ```
> default remote = origin
> canonical remote = configurable
> mirror remote = optional
> sync direction = explicit
> ```
>
> _Concrete shape — use a repo-local config eventually, maybe:_
>
> ```yaml
> git_topology:
>   canonical_remote: origin
>   canonical_repo: Lucent-Financial-Group/Zeta
>
>   mirrors:
>     acehack:
>       remote: acehack-mirror
>       mode: inactive_mirror
>       direction: canonical_to_mirror
>       force_sync_allowed: true
>
>   upstream:
>     enabled: false
> ```
>
> _Then scripts can have three tiers:_
>
> _Tier 1 — normal user:_
>
> ```bash
> script-name
> ```
>
> _Uses: `origin`, current branch, normal push/pull._
>
> _Tier 2 — advanced contributor/fork:_
>
> ```bash
> script-name --upstream upstream --push-remote origin
> ```
>
> _Supports fork workflow without Zeta-specific assumptions._
>
> _Tier 3 — mirror maintenance:_
>
> ```bash
> script-name sync-mirror --from origin --to acehack-mirror --force-with-lease
> ```
>
> _Only mirror scripts touch mirror remotes._
>
> _What to remove — hardcoded dual-active repo logic:_
>
> ```
> LFG + AceHack as equal active peers
> double-hop by default
> absorption ceremony by default
> fork-data required everywhere
> automatic pushing to both
> origin pushurl fanout
> scripts guessing which repo is "other"
> ```
>
> _Git supports multiple remotes, and `git remote add` / `git remote -v` are normal operations. But multiple push URLs on one remote are the dangerous version for us: Git's own docs warn `pushurl` can override push behavior, and multi-push makes it easier to push somewhere unintended._
>
> _So:_
>
> ```
> Multiple named remotes: okay.
> Multiple implicit push destinations on origin: avoid.
> ```
>
> _What to preserve — generic support for:_
>
> ```
> origin/upstream fork workflow
> canonical/mirror workflow
> GitHub/GitLab migration workflow
> local-only git workflow
> explicit remote override
> ```
>
> _This is the clean distinction:_
>
> ```
> Support multi-remote Git.
> Drop Zeta-specific dual-active repo assumptions.
> ```
>
> _Carved:_
>
> ```
> Support multi-remote Git.
> Do not encode multi-canonical Zeta.
> ```
>
> _My answer to your market question:_
>
> ```
> Yes, multi-remote is common enough that removing support entirely would cut off real users.
>
> No, the old "both repos are active canonical peers" model is not common enough to justify infecting every script.
> ```
>
> _Blade:_
>
> ```
> Keep the capability.
> Remove the assumption.
> Make multi-remote explicit, not ambient.
> ```

### What this means for the TS port + future git tooling

The bash scripts under `tools/hygiene/`, `tools/ops/`, etc. that touch git remotes are getting ported to TypeScript on Bun (PR #849 lane). This packet adds a design constraint for that port and any new git tooling:

1. **Default path**: scripts use `origin`, assume `origin` is canonical (LFG), do not inspect or mutate other remotes.
2. **Explicit advanced flags** when needed: `--remote`, `--upstream`, `--mirror-remote`. Never guess.
3. **No hardcoded fork detection**. No `if remote.contains("AceHack") then double-hop`. The dual-active assumption goes away even if some legacy script paths still encode it.
4. **Multi-remote _capability_ preserved**: a future fork contributor (or a future GitHub→GitLab mirror) gets to use the same scripts via the advanced flags without each script having to learn a new fork shape.
5. **Optional repo-local config** (deferred — `tools/ci/git-topology.yaml`-ish) carries the canonical/mirror/upstream declaration when needed; scripts read it without hardcoding.

This is consistent with Amara's Tier 1/2/3 design: most scripts stay Tier 1 (single-origin); a small number of dedicated mirror-maintenance scripts go to Tier 3.

## What changes vs. prior doctrine

Prior CLAUDE.md framing (still on main as of this commit):

> _"Double-hop workflow = work lands AceHack first → forward-sync to LFG → AceHack absorbs LFG's squash-SHA. Force-push to AceHack main is part of the protocol; force-push to LFG main is forbidden."_

What stays:

- LFG main is canonical; force-push to LFG main is still forbidden.
- Force-push to AceHack main is still allowed (the prior doctrine already said so).
- The 0-divergence invariant at round-close still holds (`AceHack main = LFG main`).

What changes:

- **Double-hop ceremony becomes optional, not required**, while AceHack is inactive. Active work can land on LFG directly; AceHack mirrors via force-sync (preferably `--force-with-lease`).
- The double-hop is reserved for the case when AceHack becomes an active collaboration surface again. Until then, it's amnesia-with-extra-steps.
- The directionality flips: while inactive, sync is `LFG → AceHack`, not `AceHack → LFG`.
- The expiration condition is named: "If AceHack becomes active again, this rule expires."

## Authoritative references (verified upstream 2026-04-29)

Per Otto-364 search-first-authority, the upstream-doc claims Amara cited were verified before landing this packet:

- **`gh repo sync --force`** — [GitHub CLI repo sync docs](https://cli.github.com/manual/gh_repo_sync) confirm the `--force` flag overwrites the destination branch.
- **`git push --force-with-lease`** — [git-push(1) docs](https://git-scm.com/docs/git-push#Documentation/git-push.txt---no-force-with-lease) confirm `--force-with-lease` "refuses to update a branch unless it is the state we expect," which is the safety latch Amara recommends.
- **GitHub branch-protection guidance on force-pushes** — [GitHub branch protection docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) note force pushes can remove commits collaborators based work on, justifying the "only-on-inactive-surface" gate.

## Operational status

- ✅ Verbatim packets preserved (this file — packet 1 force-sync command discipline + packet 2 remote-topology cleanup + packet 3 multi-remote-script-design constraint for TS port and future tooling).
- ✅ Existing canonical home extended in-place (per Otto-362): `memory/feedback_lfg_only_development_flow_acehack_is_mirror_aaron_amara_2026_04_29.md` now carries all three new layers as §"2026-04-29 refinement (later same-day) — force-with-lease + remote-topology cleanup" and §"2026-04-29 packet 3 — design constraint for git scripts (TS port + future tooling)" sections. No duplicate memory file created.
- ✅ MEMORY.md index entry already exists for the parent doctrine; refinement requires the existing entry to be refreshed (paired-edit lint requirement) to reflect the new layers — done in the same PR.
- ⏸️ Local-clone remote-topology audit — separate operational tick (run the cleanup-inspection commands; act on findings only after the doctrine PR lands).
- ⏸️ CLAUDE.md AceHack section update — the existing CLAUDE.md "AceHack = dev-mirror fork; LFG = project-trunk fork" framing already captures most of this; the residual double-hop language should get a refinement clause in a separate small substrate PR, not bundled here.
- ⏸️ Operational sync execution — deferred to a discrete tick after this PR lands; not bundling sync-execution with doctrine landing.

## Carved blade

> _Double-hop is for two active surfaces. Mirror-sync is for one active surface plus one inactive projection._

> _LFG is canonical. AceHack is mirror while inactive. Mirrors are overwritten, not ceremonially absorbed._

## Composes with

- `memory/feedback_lfg_master_acehack_zero_divergence_fork_double_hop_aaron_2026_04_27.md` (the prior canonical home of the double-hop rule — superseded-while-inactive by this packet's mirror-sync rule, but still authoritative for the active-AceHack case).
- `memory/feedback_zero_diff_is_start_line_until_then_hobbling_aaron_2026_04_27.md` (0-divergence invariant — still holds; mirror-sync is a different _path_ to that invariant, not a different _invariant_).
- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` (the verbatim-preservation rule that this file's existence honours).
- Otto-364 (search-first-authority — the upstream-doc verifications above).
