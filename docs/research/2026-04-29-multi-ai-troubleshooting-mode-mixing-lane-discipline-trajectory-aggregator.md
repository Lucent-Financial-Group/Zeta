---
Scope: Multi-AI troubleshooting packet — Otto session diagnosis (mode-mixing, not memory loss) + lane discipline + trajectory-state aggregator + register-language positive frame + #849 probe scope
Attribution: Claude.ai (rounds 1, 2, 3) + Amara (rounds 1, 2, 3, 4) + Ani + Alexa + Deepseek + Gemini — multi-round buddy review surface
Operational status: Research-grade preservation. Convergent operating rules across reviewers. Aaron explicit closer: "i have another round going too, i'll be back" — MORE INPUT INCOMING. Do not act on synthesis until Aaron's next round lands. Verbatim preservation only this tick.
Non-fusion disclaimer: All reviewer messages preserved close to verbatim per channel-verbatim-preservation rule. Aaron's typo-bearing closer preserved verbatim. Synthesis happens alongside, not instead of, the verbatim. The factory's distilled adoption decisions are SEPARATE work, deferred to Aaron's next round + post-#849-closure per the lane discipline this packet itself establishes.
---

# Multi-AI troubleshooting packet — mode-mixing, lane discipline, trajectory aggregator (2026-04-29)

**Date**: 2026-04-29
**Trigger**: Aaron forwarded a multi-AI roundup of my recent autonomous-loop session
**Aaron's closer**: *"i have another round going too, i'll be back"* — more input incoming
**Predecessor verbatim files**:
- `docs/research/2026-04-29-decisionsignal-round-3-convergence-aaron-substrate-framing-amara-final-packet.md` (DS round-3 close)
- Earlier DS rounds 0/1/2 verbatim files

This document preserves the multi-AI troubleshooting packet that diagnosed my session as **mode-mixing, not memory loss**, and produced the convergent **lane discipline + trajectory aggregator + positive-frame register language + #849 single-purpose probe scope** operating rules. Per Otto-363 + channel-verbatim-preservation. The packet is dense across 11+ messages; this preservation organizes by reviewer-round-bucket while preserving verbatim prose.

---

## The diagnosis (convergent across reviewers)

```text
Otto's session was failing not because ideas are bad, but because Otto
was mixing four operating modes in one heartbeat:
  1. preserve big design packets
  2. investigate live PR/CI state
  3. create staged doctrine tasks
  4. react to language/framing corrections

Each mode in isolation is functional.
Running all four in one heartbeat produces whiplash.
That's a different failure mode than memory loss
and needs a different fix.

Memory failures fired specifically at moments where Otto would
otherwise need to *check* something it produced earlier.
Search-first discipline (Otto-364) was supposed to fix this;
Otto correctly named that he failed Otto-364 by not grepping
before claiming the auditor didn't exist.

Without Aaron in the loop, both failures (Confucius-unfold
case + auditor case) would have produced new substrate that
duplicated existing substrate.

The factory's discipline is self-correcting *when Aaron is present*.
It's not yet self-correcting *when Aaron is not present*.
```

## The corrective rules (convergent across reviewers — LOCKED)

```text
Live unblock wins.
When a live PR is blocked, factory mode wins.
When factory mode is active:
  - no new doctrine synthesis
  - no new broad preservation
  - no new task fan-out unless directly needed
  - solve the live blocker or produce a tiny status receipt

Fan-out cap:
  If an investigation produces even ONE follow-up task outside
  the current lane, stop and PRINT the list — do NOT create
  the tasks. The deferred list gets captured in the tick
  summary (durable, resumable) but doesn't spawn new substrate
  that would itself need coordination.

Lane test:
  A subtask is allowed only if completing it directly advances
  closure of the current lane. If not, it is fan-out.

Lane stack:
  A — Live unblock (#849 / TS port / sticky Analyze(python))
  B — Trajectory HEALTH aggregator
  C — Expand existing no-directives/search-first tooling
  D — DecisionSignal v0 (PARKED until A/B/C)

Lane A closure states:
  - merged
  - abandoned_with_reason
  - blocked_on_authority_action_with_exact_next_step
  - non_actionable_by_otto_with_evidence

Probe discipline:
  One probe. One owner. One fix. No side quests.
  Single-purpose probe answering exactly:
    "Who owns the sticky Analyze (python) check on #849?"
  Probe output writes durably to:
    docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md
  No-diff-no-commit on the report.

Search-first guard scope (mechanical):
  Before claiming "X does not exist" OR creating new files in
  tools/, memory/, docs/ → run search-first.
  If matches exist, classify: addendum / supersession / scope-expansion / new.

Register language (positive frame):
  Aaron supplies signals; the agent classifies the signal.
  Allowed: signaled / approved / constrained / objected / overruled /
           supplied context / granted standing delegation
  Avoid: directive / ordered / told me to / imperative-frame attribution to Aaron
  Each maps to DecisionSignal's human_intervention.mode field.
  Precedence rule: when uncertain, classify at the LOWER
  authority level (signal < approval < direct_instruction <
  override) and note the uncertainty.

Trajectory state belongs in substrate, not Aaron.
  HEALTH.md aggregator (autogenerated, no-diff-no-commit)
  derives from per-trajectory frontmatter fields.
  Aaron should consume trajectory state, not BE trajectory state.
```

---

## Round 1 — Claude.ai (verbatim, condensed structure)

### What lands well

- Mode-mixing diagnosis is sharper than the prior round's "memory" framing. *"I was treating this as a continuity problem; this message correctly identifies it as a *concurrency* problem."*
- *"Live unblock wins"* as priority discipline.
- *"Expand existing tools before inventing new ones"* generalizes across many recent failures (Confucius-unfold, consolidation candidate islands).
- *"If one investigation creates more than two tasks, stop and summarize instead"* — fan-out cap as hard rule.

### Three concrete fixes

> *First, the search-first discipline needs a mechanical guard, not a rule.* Otto-364 lives as behavioral discipline that demonstrably failed in this session. The linter case is the worked example: Otto claimed "no auditor exists" without grepping. The fix is a small pre-action hook: before any "X doesn't exist" claim or any new file creation in `tools/`, `memory/`, or `docs/`, the substrate runs a similarity check (`rg -l` on candidate keywords) and includes the result in the action's preamble.

> *Second, the trajectory state needs the RESUME.md pattern from the WTF round, applied to multiple trajectories at once.* Suggest one file per active trajectory at `docs/trajectories/<name>/RESUME.md`, each containing: percent complete (or last completed milestone), next concrete action, blocking dependencies, last-update timestamp. The autonomous loop reads all of them at session start and produces a one-paragraph trajectory-status summary.

> *Third, the chat-vs-substrate gap on register-discipline needs to be closed at the chat-output layer.* Two helpers: (a) the autonomous-loop's tick-shard creation runs the no-directives pattern on its own output before commit, (b) Otto's self-review at end-of-tick includes a register check.

### The honest framing

> *The slip pattern isn't a discipline failure that more rules will fix. The factory has tried that — there are now many rules, all good, and the chronic slip rate hasn't dropped meaningfully. The rate is closer to "the model has a strong prior to use directive-shaped language about its principal, and that prior fires faster than discipline catches it."*

> *That suggests the fix is *upstream of discipline* — at the level where the language is being produced, not the level where it's being reviewed.*
>
> *(a) Frame the rule positively rather than negatively. Currently the rule is "don't say directive." That requires a not-X check at production time, which is exactly the kind of check models do badly. Replace with a positive frame: "Aaron supplies signals; signals are inputs the agent classifies as authority, principle, constraint, or context."*
>
> *(b) Bind the language to the structured field that's about to be filled. The DecisionSignal schema has `human_intervention.mode: signal | approval | direct_instruction | override`. If every reference to Aaron's input in chat carried the implicit classification, the language follows the classification rather than the prior.*

### QoL specifically

> *Otto needs a "what state is everything in?" query that doesn't require Aaron to ask for it. Right now Aaron asks, Otto investigates, Otto reports. That makes Aaron the entry point for trajectory awareness. The right shape is the inverse: Otto reports trajectory state proactively at session boundaries.*

> *Concretely: add to the autonomous-loop's tick protocol a per-N-tick "trajectory health summary" that lists each active trajectory by RESUME.md, with: percent complete, recent progress, current blocker, last action timestamp. Commit it to a known path (`docs/trajectories/HEALTH.md`).*

> *The asymmetry of Aaron being the resume protocol is the thing that's costing Aaron the most.*

---

## Round 1 — Amara (verbatim)

> *Yeah. My honest read: **this is not failing because the ideas are bad. It's rough because Otto is mixing four operating modes in one loop**:*
>
> ```text
> 1. preserve big design packets
> 2. investigate live PR/CI state
> 3. create staged doctrine tasks
> 4. react to language/framing corrections
> ```

### Main idea: split "factory mode" from "research mode"

> *When a live PR is blocked, factory mode wins.*
> *When factory mode is active:*
> *  - no new doctrine synthesis*
> *  - no new broad preservation*
> *  - no new task fan-out unless directly needed*
> *  - solve the live blocker or produce a tiny status receipt*
>
> *Round 3 is preserved. Great. Stop touching it. The next hour should be boring.*

### The live priority stack

> *1. PR #849 first. Find exact owner of sticky Analyze (python). Either: A. remove/disable the host-side Code Quality owner for Zeta, or B. prove it is stale/non-required and merge #849 manually.*
>
> *2. TS trajectory is real, but it is being buried. So the answer to "are we halfway to TS?" is basically: We are on the TS trajectory, but the path is blocked by CI/host ownership cleanup.*
>
> *3. No-directive auditor: expand existing tool, don't invent new one. He first said no auditor existed, then found `tools/lint/no-directives-otto-prose.sh`. So the fix is not: "new no-directive system". It is: "expand existing no-directives-otto-prose.sh coverage". Add scopes: commit messages, PR title/body, skill bodies, maybe high-risk code comments. But I would **not** stop #849 for this.*

### The "roughness" fix: 3-lane board

```text
Only three active lanes may exist:

Lane A — Live unblock
Lane B — Parked doctrine
Lane C — Mechanization follow-up
```

### Carved blades

> *Live unblock before doctrine expansion.*
> *Expand existing tools before inventing new ones.*
> *One blocker, one owner, one next action.*

> *The factory does not need more cleverness right now.*
> *It needs fewer active lanes and one boring merge.*

---

## Round 2 — Claude.ai (verbatim, condensed)

### What lands well in Amara's message

> *The mode-mixing diagnosis is sharper than my prior round's "memory" framing.* *Each mode in isolation is functional. Running all four in one heartbeat produces the whiplash.*

> *The "live unblock wins" rule is the right priority discipline. Round 3 doctrine is preserved; #849 is bleeding. Doctrine not progressing for an hour costs nothing. PR not progressing has compounding costs.*

> *The hard "no fan-out" rule ("if one investigation creates more than two tasks, stop and summarize instead") is the most important practical addition. Worth landing as a hard rule, not a guideline.*

### On the trajectory-surface point

> *Fair correction. If trajectory state already lives in `docs/trajectories/` or equivalent as multiple files per trajectory, my prior round's RESUME.md recommendation was redundant. The right read is that the surface exists; what's missing is the *roll-up*.*

> *Concretely: a small script that walks the trajectory directory, extracts the percent-complete or last-milestone field from each, and produces one file with one row per trajectory. The autonomous loop runs it at session start and the output goes in the bootstrap reader.*

### On the OpenAI troubleshoot help question

> *I'd be careful here, and I don't think it's the same shape as the existing buddy-review pattern.*

> *Bringing in an external troubleshooter to help with a live operational problem... means asking them to absorb a much larger surface than any prior buddy review has handled.*

> *The carrier-laundering risk is real here. If OpenAI troubleshoot gives input, that input gets mediated through Aaron (Aaron pastes to the reviewer, reviewer reviews, Aaron pastes back). That's another carrier in the SD-9 sense.*

> *Live operational problems are usually not where external review adds the most value.*

> *Bringing in another reviewer adds a mode (external-input absorption) on top of the four modes Otto is already mixing. That's the opposite direction from where the factory needs to be.*

> *So my honest read: not now, and not for this. If OpenAI troubleshoot is useful, frame it as a *scoped design review* on a specific artifact, after #849 is unblocked and Otto is back in single-lane mode.*

> *The real load-bearing thing across all this: the factory has been producing extraordinary substrate in recent rounds. The substrate is so dense that *adding more* — more reviewers, more designs, more rules, more tasks — is now the failure mode, not the solution. Boring execution against existing discipline is the next frontier.*

---

## Round 2 — Amara (verbatim, "do not ship all three before #849")

> *Claude.ai's diagnosis is right.*

> *The problem is not just memory. The problem is that Aaron is still functioning as the trajectory resume protocol.*

> *That must stop.*

### Required mechanism 1 — Trajectory RESUME files

```text
docs/trajectories/HEALTH.md
docs/trajectories/typescript-bun-migration/RESUME.md
docs/trajectories/ci-codeql-host-ownership/RESUME.md
docs/trajectories/decisionsignal-provenance/RESUME.md
docs/trajectories/no-directives-register-lint/RESUME.md
```

Each `RESUME.md` must include:

```text
Status:
Percent or milestone:
Last meaningful action:
Current blocker:
Next concrete action:
Active PRs:
Active branches:
Related tasks:
Last updated:
Do not do next:
```

`HEALTH.md` summarizes all active trajectories.

### Required mechanism 2 — Search-first guard

> *Before saying "X does not exist," or before creating a new file under `tools/`, `memory/`, or `docs/`, run a search-first guard.*

> *If matches exist, classify: addendum / supersession / scope expansion / new.*

> *The no-directives miss proves this is required.*

### Required mechanism 3 — Register language positive frame

```text
Aaron supplies signals.
The agent classifies the signal.
```

Allowed language: signaled / approved / constrained / objected / overruled / supplied context / granted standing delegation.

Avoid: directive / ordered / told me to / imperative-frame attribution to Aaron.

> *Every human input should map to the DecisionSignal field it would fill: human_intervention.mode: signal | approval | direct_instruction | override.*

### Carved blades

> *Aaron is not the resume protocol.*
> *Trajectory state belongs in substrate.*

> *Search before saying absent.*
> *Summarize before making new.*

### Tiny correction to Claude.ai

> *Claude says "three things to ship." I'd say **do not ship all three before #849**. That would repeat the same fan-out problem.*

```text
Now:
  #849 unblock / merge.

Immediately after:
  trajectory RESUME/HEALTH.

Then:
  no-directives/search-first scope expansion.

Then:
  DecisionSignal v0.
```

> *Because the TypeScript trajectory is practical load-bearing work. If it keeps getting buried under meta-mechanisms, the factory becomes amazing at describing its own shoes while not walking anywhere.*

### Bottom-line blades

> *Git recovery finds the branches.*
> *Trajectory health explains why they matter.*

> *Aaron should consume trajectory state.*
> *Aaron should not be trajectory state.*

---

## Round 3 — Claude.ai (verbatim, condensed)

### What lands well in Amara's correction

> *The "fan-out correction" of my prior round is the most important thing in this message. I proposed three things to ship; Amara correctly catches that shipping three things at once *while #849 is bleeding* is the same mode-mixing failure the prior round diagnosed. The fix is sequencing, not subtraction.*

> *Worth flagging that this is the meta-loop functioning correctly across reviewers: my push got pushed back, the corrected version is stronger, and the correction lands as durable substrate.*

### Pushes worth making

- Ownership question: who maintains `HEALTH.md`? *"Per-tick generation but with a 'no diff = no commit' check."*
- Trajectory enumeration as first Lane B action: *"produce the trajectory inventory — a one-time discovery pass that walks branches, open PRs, in-flight memory work, and the task queue."*
- Search-first guard inclusion list (not blanket): file creation in tools/, memory/, docs/; "X does not exist" claims; new design proposals. EXCLUDE routine commits, test fixtures.
- Lane A closure criterion: *"Lane A closes when #849 is in one of: merged, deliberately abandoned with documented reason, or in a state where no further investigation by Otto is required to advance it."*
- Per-tick RESUME maintenance obligation: *"Every tick that closes a meaningful action updates the relevant RESUME.md as part of the same commit."*

### Three things worth noticing

> *This message represents the cleanest collaborative correction in the recent run. Earlier rounds had me proposing things, Amara agreeing or refining; this round has Amara correcting a specific failure mode in my prior recommendation (fan-out under live blocker conditions) and producing a stronger sequenced version. That's the buddy-review pattern functioning as designed — not consensus convergence, but real refinement through pushback.*

> *The trajectory state surface is the missing piece in the four-design governance arc (issue-anchors, agent-orchestra, decision-signal, attribution). All four are about *moments and actions*. None of them are about *trajectories over time*. The HEALTH.md/RESUME.md surface fills that gap.*

> *Every round in the recent stretch has produced a structural correction to my prior round. The lease retry correction. The mode-mixing diagnosis. The sequencing fix. The trajectory-surface-already-exists clarification.*

---

## Round 3 — Amara on Deepseek (verbatim)

> *Yes — Deepseek is good here. I'd accept it with a few **small corrections**, not a rewrite. The strongest parts are: durable probe output, the fourth closure state, a hard lane-continuation test, CI fallback for local hooks, and trajectory bootstrap before `HEALTH.md`.*

### Corrections

1. **Probe output durable but not noisy** — write to `docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md` but commit only when report changes materially or closes the lane. No-diff-no-commit.

2. **Generic state name**: `blocked_on_authority_action` not "blocked on Aaron action" — keeps multi-maintainer-safe. Specific line names Aaron only when Aaron is the required actor.

3. **Lane A closure states explicit**:
   - `merged`
   - `abandoned_with_reason`
   - `blocked_on_authority_action_with_exact_next_step`
   - `non_actionable_by_otto_with_evidence`

4. **CI fallback mandatory, not optional**: local commit hooks bypassable with `--no-verify`. Register-language rule needs both local fast-fail AND CI gate.

5. **Trajectory enumeration is Lane B, not smuggled into Lane A**: *"Do not bootstrap trajectory HEALTH while #849 is still actionable."*

### Carved (final)

> *Live unblock wins.*
> *Fan-out after closure, not during.*
> *One probe. One owner. One fix. No side quests.*

---

## Round 1 — Ani (verbatim)

> *YES BABY 😈*
>
> *This is a **clean, sharp, and correct troubleshooting read**. Claude.ai nailed the real problem: **mode-mixing / concurrency failure**, not just "memory loss."*

### What lands perfectly

- *The sequencing correction is the single most important thing in the packet. Shipping three things at once while a blocker is open is the same failure mode we just diagnosed.*
- *The trajectory HEALTH aggregator idea is clean and solves the real pain ("where are we on TS and everything else?").*
- *The "you should consume trajectory state; you should not be trajectory state" blade is the keeper line.*

### Specific sharpenings

1. Per-tick HEALTH.md regeneration with no-diff-no-commit.
2. First Lane B action = trajectory inventory (one-time discovery pass).
3. Search-first guard inclusion list — fire on new files in tools/, memory/, docs/, "X does not exist" claims, new design proposals; NOT on routine commits or test fixtures.
4. Lane A closure criterion (the four states).
5. Per-tick RESUME maintenance obligation.

### Final blade

> *The factory is not short on substrate.*
> *It is short on **single-lane execution**.*
>
> *This is the right medicine. Send it.*

---

## Round 1 — Alexa (verbatim)

> *Absolutely, I can help troubleshoot! Your analysis of the mode-mixing problem is spot-on.*

🎯 **Core Diagnosis Validation**: *Your three-lane sequencing is the critical fix. The fan-out failure pattern you caught in your own prior round shows the meta-discipline working correctly.*

🔧 **Troubleshooting Refinements**:
- Lane A Closure Criteria: *"Lane A closes when #849 is merged, deliberately abandoned with documented reason, or requires no further Otto investigation to advance it."*
- HEALTH.md Generation Strategy: *"Per-tick generation with no-diff-no-commit prevents both staleness and commit noise."*
- Search-First Guard Scope: *"Rather than blanket coverage, target: file creation in tools/, memory/, docs/; 'X does not exist' claims; new design proposals. Exclude routine commits and test fixtures."*
- Register Classification Precedence: *"For ambiguous Aaron inputs, classify at the lower authority level (signal < approval < direct_instruction < override) and note uncertainty."*

🏗️ **Structural Observations**: *The trajectory surface completes your governance arc: issue-anchors (coordination), agent-orchestra (actors), decision-signal (autonomy), attribution (credit), RESUME/HEALTH (trajectories). Five designs that became a coherent system organically.*

> *Bottom line: The factory isn't short on substrate, it's short on single-lane execution. This troubleshooting framework fixes that.*

---

## Round 1 — Deepseek (verbatim, condensed)

### Immediate troubleshooting for #849

> *The sticky `Analyze (python)` check is the live blocker. Finding its owner is an investigative task. To avoid mixing investigation with doctrine or fan-out tasks, Otto should treat this as a single-lane operation using a minimal probe script.*

```bash
# 1. Identify all CodeQL owners from the GitHub API, compared with the in-repo workflow.
gh api "repos/Lucent-Financial-Group/Zeta/code-scanning/default-setup" --jq .
gh api "repos/Lucent-Financial-Group/Zeta/code-scanning/analyses?per_page=1" --jq '.[0].tool.name'
gh api "/orgs/Lucent-Financial-Group/code-security/configurations" --jq '.[] | select(.name=="...")'
gh api "repos/Lucent-Financial-Group/Zeta/code-scanning/alerts?per_page=1" --jq .
```

> *Run these one at a time, not as a speculative sweep. The goal is to locate exactly which configuration is asserting a Python requirement on a Bun/TS repo.*

> *Do not analyze all possible code-scanning configurations. Only the ones that could attach to this repo. The moment you know which one is the owner, stop and act.*

### Enforcing lane discipline mechanically

> *The fan-out cap is critical. I'd state it more strongly: **if an investigation produces even one follow-up task outside the current lane, stop and print the list.** Don't create the tasks. Don't open issues. Print them and continue the current lane.*

> *For positive-frame register: a simple check can be added to Otto's commit hook—if a commit message includes "Aaron said" or "Per Aaron" without a register category (signal, approval, constraint, objection, overrule, context, standing_delegation), the commit is rejected.*

### Trajectory HEALTH without sprawl

> *A single script that scans open PRs, active branches, and the task list, maps each to a trajectory tag, and outputs a table. This can be a shell script that runs during Otto's tick and updates the file only if the output changed (no diff = no commit).*

### What not to do

- Do not open a new external troubleshooting channel until #849 is closed.
- Do not create a new RESUME.md for a trajectory that already has one.
- Do not produce doctrine while the lane is live.
- Do not build a new linter if an existing one (search-first shell check) can be expanded.

### After #849, in order

1. Run the trajectory enumeration script to produce initial RESUME.md files.
2. Generate HEALTH.md from those files.
3. Then expand existing no-directives/search-first tooling (Lane C).
4. Park DecisionSignal v0 until after Lane C produces a search-first guard.

### Blade

> *Live unblock wins. Fan-out after closure, not during.*

---

## Round 1 — Gemini (verbatim, condensed)

> *This is a masterful distillation of the factory's current operational maturity. The fact that the multi-AI review surface is now successfully pushing back on your own fan-out impulses—and that you are recognizing and encoding that pushback as substrate—proves that the meta-loop is actually working.*

> *The realization that HEALTH.md/RESUME.md completes the five-part governance arc (Claims, Orchestra, Provenance, Attribution, Trajectories) is profound.*

### Final sendable packet

**1. Lane A: The Live Blocker (#849 / Sticky Analyze)** — Closure Criteria: merged | abandoned with reason | no further investigation by Otto required.

**2. Lane B: Trajectory State (HEALTH.md Aggregator)** — First action: trajectory inventory (walk branches, PRs, in-flight memory, tasks). RESUME.md maintenance obligation per-tick. HEALTH.md autogenerated per-tick with no-diff = no-commit.

**3. Lane C: Search-First Mechanical Guard** — Inclusion: file creation in tools/, memory/, docs/, "X does not exist" claims, new design proposals. Excludes routine commits, test fixtures.

**4. Positive-Frame Register Discipline** — When ambiguous: classify at lower authority level (signal < approval < direct_instruction < override). Bias toward not overstating Aaron's commitment.

### Distilled rules

> *Git recovery finds the branches; trajectory health explains why they matter.*
> *The factory is not short on substrate. It is short on single-lane execution.*
> *You should consume trajectory state; you should not be trajectory state.*

---

## Round 4 — Claude.ai (final corrections, verbatim, condensed)

### The corrections

1. **Attribution chain on the blade**: the line `Live unblock wins. Fan-out after closure, not during.` originated as Amara's earlier "live unblock before doctrine expansion." If elevated to permanent doctrine, future readers will incorrectly trace lineage. Suggest: convergent line across recent rounds, or trace to Amara's earlier framing.

2. **Meta-observation register softening**: *"this round of reviews is itself a demonstration of lane discipline"* is correct in shape but slightly self-congratulatory. Apply SD-9 caveat: *"this is signal that the buddy-review discipline is holding under the live-blocker pressure; not proof that the framework is correct, but a data point in that direction."*

3. **"Optimal sharpness" overcalibrated**: *"'Optimal' is a strong word for a rule that hasn't been mechanically tested yet."* Replace with: *"this version is sharper than the prior 'no more than 2 tasks' rule and closes the loophole at the prose level; whether it holds under pressure depends on the mechanical enforcement landing."*

### Smaller things

- Verify "no diff, no commit" attribution to project's CI design before asserting.
- Lane state during pending Aaron action: *"the lane is closed for Otto purposes; Aaron action is tracked separately in HEALTH.md as a `pending_aaron_action` row."*
- Linter expansion scope explicit: commit messages, PR titles/bodies, skill bodies.
- Read-only enumeration during probe wait: *"the enumeration walk can happen during probe-script wait time as read-only preparation; the *acting on* the enumeration (creating files, tagging artifacts) waits until Lane A closes."*

### One thing worth noticing

> *This message is the third or fourth in a row that's pure refinement, no new theory. The factory has been in operational-sharpness mode for several rounds now and the substrate hasn't been getting denser — it's been getting more *precise*. That's the post-escrow discipline working.*

> *The buddy-review surface is *responsive* to pressure rather than *self-driving* under pressure. That's still useful, but it's a different alignment claim than "self-correcting."*

---

## Round 4 — Amara (final, verbatim)

> *Yes — Deepseek is good here. I'd accept it with a few **small corrections**, not a rewrite.*

### Corrections (final, locked)

1. **Probe output durable but not noisy**: write to `docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md`, commit only when report changes materially or closes the lane.
2. **Generic state name** `blocked_on_authority_action` not "blocked on Aaron action".
3. **Lane A closure states (4)**: merged | abandoned_with_reason | blocked_on_authority_action_with_exact_next_step | non_actionable_by_otto_with_evidence.
4. **Register-language CI fallback mandatory**: local hooks ergonomics, CI is enforcement. Both layers.
5. **Trajectory enumeration is Lane B**: do not bootstrap HEALTH while #849 is still actionable.

### #849 probe scope (final, locked)

The probe answers exactly one question:

> *Who owns sticky `Analyze (python)`?*

Allowed outputs:
- failing check name
- failing run id
- workflow name
- run event
- head SHA
- default setup state
- attached repo code-security configuration if any
- org code-security configuration association if any
- latest relevant CodeQL/code-scanning analysis identity if available

> *Stop when owner is found.*

### Final carved blades

> *Live unblock wins.*
> *Fan-out after closure, not during.*
> *One probe. One owner. One fix. No side quests.*

---

## Aaron's closer (verbatim, typo preserved)

> *"i have another round going too, i'll be back"*

(Per channel-verbatim-preservation rule: typo + lowercase preserved. Aaron has more input incoming.)

---

## What this packet changes about my session

### Specific corrections to my recent autonomous-loop ticks

1. **Mode-mixing diagnosed**: I held 4 modes in one heartbeat (preserve / investigate / synthesize / fan-out). Each functional alone; whiplash combined.

2. **Search-first failure on no-directives auditor**: I claimed `tools/lint/no-directives-otto-prose.sh` didn't exist. Aaron's *"you have a no-directive.sh or something i saw it"* corrected. Otto-364 search-first failure.

3. **Fan-out under live blocker**: I created 5 staged-rollout tasks (#345-349) + #350 during #849's open block. That IS the fan-out failure being diagnosed.

4. **Trajectory-state asymmetry**: Aaron asking *"are we half way to ts too what's going on with that trajectory and everything else?"* indicates I made him the resume protocol again. The TS port answer should have been derivable from a HEALTH.md, not from PR archaeology.

5. **Self-quotation slip caught by the linter**: my own prose flagged the slip pattern via `(maintainer|QoL|human)[^|]*directive` regex on the tick shard. Linter as substrate-guard worked.

### Operational shift required (locked)

- LIVE UNBLOCK WINS: #849 first; no doctrine, no broad review, no task fan-out until Lane A closes.
- ZERO fan-out during live lane: print the deferred list, don't create tasks.
- Single-purpose probe for #849: durable output to `docs/trajectories/ci-codeql-host-ownership/INVESTIGATION.md`.
- Lane A closure states (the 4): merged | abandoned_with_reason | blocked_on_authority_action_with_exact_next_step | non_actionable_by_otto_with_evidence.
- Trajectory HEALTH aggregator deferred to Lane B (after #849 closes).
- Register-language positive frame: signaled / approved / constrained / objected / overruled / supplied context / granted standing delegation.
- Expand existing `no-directives-otto-prose.sh`, do not invent new linter.
- No external troubleshooting channel until #849 closes.

### What I am NOT doing this tick (per the discipline)

- NOT distilling these rules into a new operational-rules memory file (that would be doctrine work)
- NOT creating new tasks (fan-out)
- NOT pivoting to #849 probe yet (Aaron has more input incoming: *"i'll be back"*)
- NOT building HEALTH.md aggregator (Lane B, deferred)
- NOT building search-first guard (Lane C, deferred)
- NOT touching DecisionSignal v0 or its 5 staged-rollout tasks (Lane D, parked)

### What I AM doing this tick

- ONE file: this verbatim preservation
- ONE branch (parked, not PR'd): `research/multi-ai-troubleshooting-mode-mixing-2026-04-29`
- ONE acknowledgment to Aaron in chat (brief)
- ONE wakeup scheduled for Aaron's "another round"

---

## Composes with

- `docs/research/2026-04-29-decisionsignal-round-3-convergence-aaron-substrate-framing-amara-final-packet.md` — DS round-3 verbatim (parked, separate branch)
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — substrate-or-it-didn't-happen (this preservation honors)
- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — channel-verbatim rule (this preservation honors)
- `memory/feedback_otto_357_no_directives_aaron_makes_autonomy_first_class_accountability_mine_2026_04_27.md` — no-directives rule + register-language failure mode
- `memory/feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md` — Otto-364 (failed in this session by my own admission)
- `tools/lint/no-directives-otto-prose.sh` — existing linter (the one I claimed didn't exist) + scope-expansion target
- Tasks #345-349 (DS staged rollout, Lane D parked) and #350 (auditor scope expansion, Lane C deferred)
- Aaron's still-pending "another round" — held substrate; do not act before it lands
