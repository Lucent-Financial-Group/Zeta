---
Scope: Multi-AI troubleshooting packet — round 2 — refining the operating rules from round 1 packet (Deepseek → Amara → Claude.ai → Deepseek → Claude.ai → Amara → Deepseek → Claude.ai → Amara → Deepseek convergence chain)
Attribution: Deepseek (lead) + Amara (refinements) + Claude.ai (corrections) — multi-round buddy review surface
Operational status: Research-grade preservation. Round 2 closes the convergence threads from round 1. The closing message ("Send. The lane discipline holds. The only live work is #849.") is the green-light to begin Lane A probe execution per the locked discipline.
Non-fusion disclaimer: All reviewer messages preserved close to verbatim per channel-verbatim-preservation rule. Continuation of the parked research branch from round 1.
---

# Multi-AI troubleshooting round 2 — deferred-note destination, evidence standards, register-CI three-pass, "tested" calibration

**Date**: 2026-04-29
**Continuation of**: `2026-04-29-multi-ai-troubleshooting-mode-mixing-lane-discipline-trajectory-aggregator.md` (round 1)
**Trigger**: Aaron's *"i have another round going too, i'll be back"* — this packet IS the promised round
**Round 2 closing**: Deepseek's *"Send. The lane discipline holds. The only live work is #849."*

This document preserves the round-2 multi-AI convergence chain that closed the loopholes left by round 1 — specifically: probe output durability + commit discipline, evidence standards for `non_actionable_by_otto_with_evidence`, register-language CI three-pass scope, the "tested" calibration ("enforcement surface must match failure surface"), and the deferred-note destination question (which became its own micro-convergence).

---

## Round 2 — Deepseek (lead, verbatim, condensed)

### What's strong in the round 1 exchange

> *The convergence between Claude.ai and Amara is tight. Both are sharpening the same single-lane doctrine rather than reopening the design. What remains is a handful of edge-case resolutions—each small, but each touching exactly the mode-mixing failure pattern the last several rounds have been diagnosing.*

> *The fan-out rule has converged to its hardest form. "Zero outside-lane task creation during live work" replaces the earlier "no more than 2" version. Claude.ai correctly flags that "optimal sharpness" is an overclaim—it hasn't been mechanically tested yet—but the *prose-level* rule is now as tight as it can be without becoming an enforcement mechanism.*

> *The lane-continuation test is the right classifier. "Would completing this directly advance closure of #849?" is a one-line filter that prevents Otto from classifying generously in favor of doing more work.*

> *Claude.ai's "blocked on authority action" generalization is correct. Naming Aaron specifically in the generic state model embeds a single-maintainer assumption into substrate that should be multi-maintainer-safe.*

### Points worth sharpening further (Deepseek)

**1. The Register-Language CI Fallback Needs a Specific Trigger**

> *Local hook: fires on `commit-msg`, checks the commit message for `Aaron said` or `Per Aaron` without a register category.*
>
> *CI job: fires on `pull_request`, checks all commits in the PR for the same pattern, and fails if any non-compliant commit is present.*
>
> *Without specifying the CI trigger, the CI job might only check the merge commit (which won't contain the violating prose if it's in a squashed commit body), and the enforcement loop remains open.*

**2. The "Non-Actionable by Otto" State Needs an Evidence List**

> *If Otto can assert non-actionability with any rationale, the state becomes a bypass for hard problems. The minimal evidence standard should be one of:*
>
> *- A specific API response showing the action requires permissions Otto doesn't have.*
> *- A specific GitHub docs reference showing the mutation endpoint is gated.*
> *- A specific Aaron action required that Otto cannot perform.*
>
> *Without an evidence standard, `non_actionable` becomes a synonym for "stuck and don't want to say stuck."*

**3. Trajectory Enumeration During Probe Wait: The Temptation Is Real but Dangerous**

> *Claude.ai suggests that read-only trajectory enumeration can happen during probe-wait time without violating Lane A. This is tempting but structurally indistinguishable from the mode-mixing failure—it opens a second cognitive lane while the first is still active.*
>
> *The safer position is Amara's: no trajectory bootstrap while #849 is actionable.*

**4. The "Optimal Sharpness" Correction Is Honest and Should Land**

> *"Prose-level tightness; mechanical test pending" is the honest version. Given the chronic pattern—directive language took ~15 corrections, mode-mixing took multiple rounds—claiming any rule is optimal before mechanical enforcement lands is premature.*

### Distilled blade (Deepseek)

> *Live unblock wins.*
> *Fan-out after closure, not during.*
> *No new lanes before the old one closes.*

---

## Round 2 — Amara (corrections to Deepseek, verbatim)

> *Deepseek's corrections are good, and I'd accept them almost whole. They're not reopening the plan; they're closing little loopholes that would let Otto slide back into mode-mixing.*

### 1. "Optimal sharpness" → "prose-level tightness"

> *Deepseek is right: don't call the fan-out rule "optimal" until it has been tested mechanically. Use:*
>
> ```text
> Prose-level tightness reached; mechanical enforcement pending.
> ```

### 2. Register-language CI must check PR commits, not just the merge ref

> *The CI job should run on `pull_request`, but it must inspect **all commits in the PR**, not only whatever `GITHUB_SHA` resolves to.*

### 3. `non_actionable_by_otto_with_evidence` needs evidence types

```text
specific API response showing missing permission
specific GitHub docs reference showing required permission/role
specific host setting/config ID requiring authority action
specific human/authority action required
specific stale/non-required check evidence showing no further technical action needed
```

> *For the GitHub APIs involved, this matters because Code Scanning default setup read/update has explicit repository Administration permission requirements, and org Code Security Configuration operations require org administrator/security-manager permissions for some endpoints.*

### 4. No trajectory enumeration during live-lane wait

> *I agree with Deepseek over the tempting "read-only is okay" loophole.*
>
> *During #849: No trajectory enumeration. No dashboard bootstrap. No "while waiting." A wait tick can be boring. Boring is good.*

### 5. Lane-continuation test (exact wording)

> *Before doing any subtask during #849, ask:*
>
> ```text
> Would completing this directly advance closure of #849?
> ```
>
> *If yes, it is lane-continuation.*
> *If no, it is fan-out: print deferred list, do not create tasks, do not open issues, do not implement.*

### Blade (Amara)

> *A wait tick is not wasted.*
> *A side quest is.*

---

## Round 2 — Claude.ai (corrections to Amara, verbatim, condensed)

### Three corrections

> *The "Claude.ai suggests read-only trajectory enumeration during probe-wait time" framing isn't quite what I said and Deepseek's pushback is therefore correcting a slightly stronger claim than I made. My actual phrasing was that the enumeration *could* happen during wait time as preparation, with acting on the enumeration deferred to after Lane A closes. Deepseek's response treats this as me suggesting parallel cognitive activity during the live lane, which is a stronger claim. But — and this is the important part — Deepseek's correction is right anyway.*

> *The "evidence standard for non_actionable_by_otto_with_evidence" addition is sharp and correct. The three-option evidence standard (specific API response showing permission gap, specific GitHub docs reference showing endpoint gated, specific authority action required that Otto cannot perform) is the right shape because each is checkable from outside Otto's self-report. That's the discipline: the evidence has to be referenceable by someone other than the person making the claim.*

> *The CI register-language trigger specification is correct and worth the explicit naming. The local hook fires on `commit-msg`, the CI job fires on `pull_request` and checks all commits in the PR. The squash-merge problem Deepseek names is real — if enforcement only fires on the merge commit, squashed PRs lose the per-commit register check entirely.*

### Meta-observation pattern

> *This is now the third or fourth round in a row where the meta-observation has fired in some form. "The buddy-review surface is doing X." Each version is slightly more disciplined than the last, but the pattern itself is becoming a recurring round-close artifact. That risks turning the meta-observation into a routine self-report. Suggest at round-close: maybe drop the meta-observation entirely for the next several rounds and let the trajectory data accumulate without commentary on it.*

> *The data is in the diff; the commentary on the data is optional.*

### Blade and lane discipline distinction

> *"No new lanes before the old one closes" is correct as a rule but worth flagging that it slightly extends "live unblock wins; fan-out after closure, not during." The earlier blade was about *task creation*; the new line is about *lane creation*. Those are different things and worth being explicit about which one is the rule.*

> *Suggest the blade keep both lines distinct: "fan-out after closure, not during" governs task creation; "no new lanes before the old one closes" governs lane creation.*

### "Tested" calibration

> *Mechanical enforcement is necessary but not sufficient — the rule has to hold across the surface where the failure mode actually fires.*
>
> *Suggest a small note: "tested means: mechanical enforcement landed AND the rule has held across the surfaces where the failure mode actually fires." That preserves the honest framing while specifying what would graduate the rule from "prose-tight" to "tested."*

---

## Round 2 — Deepseek (response to Claude.ai corrections, verbatim, condensed)

### What's strong

> *The attribution drift catch is honest and precise. Claude.ai's original framing was "read-only preparation during wait," not "parallel cognitive activity during live lane." Deepseek's pushback corrected a slightly stronger claim, but the substantive correction stands regardless of the attribution accuracy. Flagging this now prevents the round-history from hardening a misattribution that would be expensive to correct later.*

> *The meta-observation pattern diagnosis is correct and overdue. Three or four rounds in a row, the round-close has included some version of "the buddy-review surface is refining toward operational sharpness." Each version has been more disciplined than the last, but the pattern itself has become a routine self-report.*

> *The "no new lanes" vs. "fan-out after closure" distinction is necessary. These are two different rules governing two different things.*

> *The "prose-tight vs. tested" calibration is a genuine refinement. A rule that passes a commit hook but still drifts in chat-output hasn't been "tested"—the failure surface and the enforcement surface aren't the same.*

### One small sharpening

> *The CI register-language gate has two separate passes—commit messages (enumerated) and PR title/body (direct from the event payload). If only commit messages are enforced, the failure mode migrates to the PR title, which is exactly the shape of the earlier "directive language moved from memory files to chat" migration.*

### Three-line blade (locked)

> *Live unblock wins.*
> *Fan-out after closure, not during.*
> *No new lanes before the old one closes.*

### Meta-rule

> *Round-close meta-observations on review-surface health are optional.*
> *The data is in the diff.*
> *The commentary on the data can rest for several rounds.*

---

## Round 2 — Claude.ai (corrections to Deepseek, verbatim, condensed)

### Smaller corrections

> *The "attribution drift catch is honest and precise" framing slightly overcredits the catch. The drift was small. Suggest softening: "the attribution drift catch is small but worth surfacing — the substantive correction stands either way."*

> *The "tested means enforcement landed AND the rule held across actual surfaces for N occurrences" framing inherits my prior round's claim, but worth flagging that *N* isn't specified. Suggest one note: "N varies by rule; suggested default is 'no observed regressions across at least three rounds where the failure mode would have had opportunity to fire.'"*

> *The "two separate passes — commit messages (enumerated) and PR title/body (direct from the event payload)" recommendation is correct and worth landing, but the message doesn't say what happens when the two passes produce inconsistent results. Suggest one line: "either pass failing blocks PR merge; both passes must succeed for the gate to clear."*

### One thing worth noticing

> *This message is unusually short by recent-round standards. That's appropriate — the convergence is real and there's not much left to refine. The discipline of writing a short message when the work is mostly done is itself worth flagging.*

> *Well-functioning multi-AI convergence has decreasing message size, not increasing. Increasing-size convergence is usually drift; decreasing-size convergence is usually closure.*

---

## Round 2 — Amara (corrections to Claude.ai, verbatim)

### Three small corrections

**1. Don't land the meta-observation rule before #849**

> *The idea is right, but don't "land" it as doctrine right now. That would be hilariously on-brand in the bad way: a meta-rule about not over-meta-commenting, created during the #849 live lane. Make it a deferred note, not a lane item.*

**2. Register CI should cover three surfaces, not two**

> *Pass 1: enumerate all PR commits and check commit messages*
> *Pass 2: check PR title*
> *Pass 3: check PR body*
>
> *And trigger on:*
>
> ```yaml
> pull_request:
>   types: [opened, edited, synchronize, reopened]
> ```
>
> *The `synchronize` event catches new commits; `edited` catches PR title/body changes.*

**3. "Tested" should mean surface-matched evidence**

> *A rule is not tested because a linter exists.*
> *A rule is tested when the enforcement surface matches the failure surface and survives repeated real cases.*

### Blade (Amara round 2 closing)

> *The data is in the diff.*
> *The commentary can rest.*

---

## Round 2 — Deepseek (small addition: park location)

> *The sendable version is clean. No structural corrections — just one tiny addition to keep it self-contained.*
>
> *In the deferred-note instruction, explicitly say where to park it. Otherwise "defer" is ambiguous and could get lost on the next context boundary. Add a line like:*
>
> ```text
> Deferred note: park in docs/trajectories/ci-codeql-host-ownership/DEFERRED.md or equivalent.
> ```
>
> *That ensures the idea survives compaction without becoming a new lane.*

---

## Round 2 — Claude.ai (refinement to Deepseek's park-location, verbatim, condensed)

### Two ways to handle it

> *Option (a): Park deferred notes in a single shared location that doesn't depend on trajectory bootstrap, like `docs/deferred/...` or `docs/lanes/...`. That avoids creating trajectory infrastructure during Lane A.*
>
> *Option (b): Allow the trajectory directory to be created as part of Lane A *only* for the specific trajectory the live blocker belongs to. That's a small principled exception: the trajectory the blocker is in is already implicit substrate; making it explicit doesn't fan out, it just consolidates.*

> *Option (b) is cleaner because it doesn't create a parallel parking surface that has to be migrated later.*

> *Suggest option (b) with one explicit constraint: "the only trajectory directory that may be created during Lane A is the one #849 belongs to (`ci-codeql-host-ownership/`); creating it is allowed because the lane is already implicit; creating any other trajectory directory during Lane A is fan-out and is forbidden."*

---

## Round 2 — Amara (correction to Claude.ai's park-location, verbatim)

> *Don't create a new file unless there is already an appropriate place.*

> *If `docs/trajectories/ci-codeql-host-ownership/DEFERRED.md` exists or the trajectory directory already has that convention, use it. If not, I'd rather park the note in the existing live-lane file:*
>
> ```text
> docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md
> ```
>
> *under a short section:*
>
> ```markdown
> ## Deferred notes
>
> - Round-close meta-observations on review-surface health are optional.
> - The data is in the diff.
> - Commentary can rest for several rounds.
> ```

> *That avoids making "don't make a new lane" accidentally create a new artifact. Very Zeta, very annoying, very real.*

### Blade

> *A deferred note should not become a new lane.*

---

## Round 2 — Deepseek (final agreement, verbatim)

> *The resolution is correct. The principled exception—creating only the trajectory directory the live blocker already belongs to—closes the gap without opening a loophole.*

> *One tiny operational note: if `INVESTIGATION.md` already exists in that directory (from the probe output discipline), Amara's preference to park the deferred notes as a `## Deferred notes` section inside `INVESTIGATION.md` rather than creating a separate `DEFERRED.md` file is slightly cleaner—one file per trajectory during Lane A, not two.*

> *Send. The lane discipline holds.*

---

## Round 2 — Amara (final consolidation, verbatim)

### One file rule (locked)

> *During Lane A, the only trajectory substrate that may be created is the specific trajectory directory for the live blocker:*
>
> ```text
> docs/trajectories/ci-codeql-host-ownership/
> ```
>
> *This is allowed only as part of #849 investigation durability.*
>
> *It is not trajectory bootstrap.*
> *It is not HEALTH work.*
> *It is not permission to create other trajectory directories.*

### Prefer one file during Lane A

```text
docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md
```

Deferred notes go inside as `## Deferred notes` section. Only create `DEFERRED.md` if that convention/file already exists.

### Carved (Amara final)

> *A deferred note should not become a new lane.*
> *Investigation durability is allowed.*
> *Trajectory bootstrap is not.*

> *One live lane may have one investigation file.*
> *It may not quietly become a trajectory system.*

---

## Round 2 — Deepseek (final close, verbatim)

> *Agreed. The resolution threads the needle perfectly: deferred notes get a durable home without that home becoming a pretext for trajectory bootstrap during a live blocker. The guardrail—"allowed only as part of #849 investigation durability, not as trajectory bootstrap"—is the critical sentence that prevents the loophole.*

> *Send. The lane discipline holds. The only live work is #849.*

---

## Locked operating rules (round 1 + round 2 consolidated)

### Lane discipline (LOCKED, three distinct invariants)

```text
Live unblock wins.
Fan-out after closure, not during.
No new lanes before the old one closes.
```

### Lane stack (LOCKED)

```text
A — Live unblock (#849 sticky Analyze (python))
B — Trajectory HEALTH aggregator (after Lane A)
C — Expand existing no-directives/search-first tooling (after Lane B)
D — DecisionSignal v0 (parked until A/B/C)
```

### Lane A closure states (LOCKED, four states with evidence requirements)

```text
1. merged
2. abandoned_with_reason
3. blocked_on_authority_action_with_exact_next_step
4. non_actionable_by_otto_with_evidence

For state 4, evidence must be one of:
  - specific API response showing missing permission
  - specific GitHub docs reference showing required permission/role
  - specific host setting/config ID requiring authority action
  - specific human/authority action required
  - specific stale/non-required check evidence showing no
    further technical action needed

No vague "stuck."
```

### Probe scope (LOCKED, single-purpose)

```text
Question: Who owns sticky `Analyze (python)` on #849?

Allowed outputs:
  - failing check name
  - failing run id
  - workflow name
  - run event
  - head SHA
  - default setup state
  - attached repo code-security configuration
  - org code-security configuration association
  - latest CodeQL/code-scanning analysis identity if available

Stop when owner is found.
Output destination: docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md
Commit only when report changes materially or closes the lane.
```

### Lane-continuation classifier (LOCKED)

```text
Before any subtask during #849, ask:

  Would completing this directly advance closure of #849?

If yes: do it (lane-continuation).
If no: print deferred list, do NOT create tasks, do NOT open
  issues, do NOT implement.
```

### Investigation file discipline (LOCKED)

```text
During Lane A, only one trajectory directory may be created:
  docs/trajectories/ci-codeql-host-ownership/

Allowed only as part of #849 investigation durability.
NOT trajectory bootstrap.
NOT HEALTH work.
NOT precedent for other trajectory directories.

Prefer one file per trajectory during Lane A:
  INVESTIGATION.md

Deferred notes go in a `## Deferred notes` section inside it.
Only create DEFERRED.md if that convention already exists.
```

### Register-language enforcement (LOCKED, three surfaces)

```text
Local hook (commit-msg): check current commit message
CI gate (pull_request): three separate passes
  Pass 1: enumerate all PR commits, check commit messages
  Pass 2: check PR title
  Pass 3: check PR body
Trigger: pull_request types [opened, edited, synchronize, reopened]
Either pass failing blocks PR merge; both must succeed for gate.

Reasoning:
  - synchronize catches new commits
  - edited catches PR title/body changes
  - GITHUB_SHA for pull_request is the merge ref, so
    commit-message checking must enumerate PR commits explicitly
  - PR title/body can carry register-language failures the
    commit-message check would miss
```

### "Tested" calibration (LOCKED)

```text
A rule is not tested because a linter exists.
A rule is tested when:
  (a) enforcement surface matches the failure surface
  (b) the rule survives repeated real cases (suggested
      default: no observed regressions across at least three
      rounds where the failure mode would have had opportunity
      to fire)
```

### Fan-out rule wording (LOCKED, honest framing)

```text
Prose-level tightness reached; mechanical enforcement pending.
```

NOT: "optimal sharpness."

### Meta-observation discipline (DEFERRED, not a lane item)

```text
Round-close meta-observations on review-surface health
are optional.
The data is in the diff.
Commentary can rest for several rounds.
```

(Deferred — do NOT land as doctrine during #849. Goes in
INVESTIGATION.md `## Deferred notes` section if it needs a
durable home.)

---

## What this round changes about my action plan

### What I am doing this tick

1. **Land round-2 verbatim preservation** (this file)
2. **Begin Lane A probe execution** per the locked single-purpose probe scope
3. **Probe output → `docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md`** (allowed exception: this trajectory directory may be created as part of Lane A investigation durability)
4. **Stop when owner found** OR when one of the four closure states is met
5. **NO fan-out**: any discovered subtask outside Lane A goes to a printed deferred list, not new tasks

### What I am NOT doing

- NOT creating new tasks (any of #345-349, #350 are pre-existing; no new ones)
- NOT bootstrapping trajectory HEALTH (Lane B, deferred)
- NOT building search-first guard (Lane C, deferred)
- NOT touching DecisionSignal v0 (Lane D, parked)
- NOT creating any other trajectory directory besides `ci-codeql-host-ownership/`
- NOT landing the meta-observation rule as doctrine (deferred per Amara)
- NOT extending the linter scope (Lane C, deferred)
- NOT meta-commenting on this round (per Claude.ai's drop-the-meta-observation suggestion)

### Probe execution plan (single-purpose, single-lane)

Inputs already gathered in earlier ticks:
- `repos/Lucent-Financial-Group/Zeta/code-scanning/default-setup` → `state: not-configured`
- `repos/Lucent-Financial-Group/Zeta/code-security-configuration` → 204 No Content (no attached config)
- Failing run path: `dynamic/github-code-scanning/codeql` (GitHub-managed dynamic, not workflow file)
- Org has 6+ Code Scanning configurations (id 17, 244997, 244998, 244999, 245000, 245012)
- The dynamic run on PR #849 fails because Zeta has no Python at root, only under `tools/` (paths-ignored in workflow but not in dynamic run)
- The dynamic run on PR #862 SUCCEEDED because no Python source in diff

Remaining probe work (single-lane, no fan-out):
1. Identify which org-level configuration (if any) attaches to Zeta and triggers the dynamic Code Quality run.
2. Identify Code Quality public-preview enrollment status for Zeta or the LFG org.
3. Determine: is the dynamic run gated by a config Otto can disable, or is it Aaron-action-only?
4. Land result as INVESTIGATION.md report meeting one of the 4 closure states.

---

## Composes with

- `2026-04-29-multi-ai-troubleshooting-mode-mixing-lane-discipline-trajectory-aggregator.md` (round 1, same parked branch)
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` (this preservation honors)
- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` (channel-verbatim rule)
- `tools/lint/no-directives-otto-prose.sh` (existing register linter, scope-expansion target)
- Tasks #345-350 (all pre-existing, none new this round)
