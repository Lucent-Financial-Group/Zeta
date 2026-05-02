---
name: All complexity in this project is accidental (not intentional) — Zeta is greenfield; everything is malleable and changeable; evaluate every config / setting / decision at every tick as an option; nothing is off-limits to agents (including GitHub settings)
description: Aaron 2026-05-02 calibration. Greenfield-pre-deploy means there's no backcompat-protected complexity; therefore ALL complexity in the project must be treated as accidental (Brooks 1986 essential-vs-accidental distinction) and evaluated as removable / changeable each tick. GitHub settings, ruleset shape, branch protection, workflow architecture, ALL repo configuration is malleable. The default presumption is *"this current shape is the result of past tick-decisions; re-evaluate each tick as if greenfield"*. Composes with Otto-266 (greenfield-until-deployed), VISION.md scope-creep-is-feature, CURRENT-aaron.md §2 GitHub-settings-ownership, Otto-357 no-directives, the just-landed don't-ask-permission rule.
type: feedback
---

# All complexity is accidental in greenfield (Aaron 2026-05-02)

## Aaron's verbatim framing

> *"anything in this project that is complex should be treated
> as accidental complexity not intentialy all setting to like
> github settings, this project is greenfield and anyting is
> mauable and changable and should be evulated at every tick as
> an option becasue we are greenfield, notihgin is off limits
> to your agents."*

## The carved sentence

**"In greenfield, all complexity is accidental. Re-evaluate
every config / setting / decision at every tick as if
malleable, because it is. Nothing is off-limits."**

## Lineage anchor — Brooks + Rodney's Razor + greenfield

Frederick Brooks (1986, *No Silver Bullet*) distinguished
**essential complexity** (intrinsic to the problem domain;
cannot be removed) from **accidental complexity** (artifacts
of how we chose to attack the problem; can be removed by
better tools / abstractions / decisions).

Aaron's calibration applies Brooks's distinction in the
greenfield direction: **before the deployed-product gradient
binds, every concrete shape (the ruleset has 5 rules vs 1, the
workflow has 42 jobs vs 7, branch protection enforces these
specific contexts, the SQL engine is structured this specific
way) is accidental** — a snapshot of past tick-decisions, not
a binding contract. The deployed-product binding doesn't apply
yet (per Otto-266 greenfield-until-deployed); therefore the
"essential" defaults are stricter than usual:

- **Essential:** the alignment floor (HC-1..HC-7 + SD-1..SD-9
  + DIR-1..DIR-5), VISION.md terminal purpose
  (intellectual-backup-of-earth), the substrate algebra
  (retraction-native, replayable, deterministic), the
  glass-halo discipline.
- **Accidental:** literally everything else. Every config
  file, every workflow shape, every ruleset rule, every
  branch-protection setting, every directory layout, every
  TODO comment, every hygiene-script implementation.

The presumption is **accidental until proven essential**, not
the reverse. *"This is how we've always done it"* is an
anti-pattern in greenfield because there hasn't been "always"
yet.

## Operational consequence — every-tick re-evaluation

When approaching any task — PR triage, queue drain, backlog
work, infrastructure tuning — the agent should:

1. **Treat the current shape as a historical artifact**, not
   a constraint. *"We currently have N rulesets"* doesn't mean
   *"we should have N rulesets."* It means *"past tick-
   decisions produced N rulesets; today's tick re-evaluates."*

2. **Apply Rodney's Razor / Quantum Rodney's Razor at the
   structural layer.** The complexity-reduction agent isn't
   just for code — it applies to ruleset shape, workflow
   shape, directory layout, governance docs, skills inventory,
   etc.

3. **Refuse the "but we'd have to redo everything"
   counterargument** *while* still honoring `do-no-permanent-
   harm`. Nothing is off-limits ≠ break things in flight. The
   right move is *"propose a better shape; if greenfield logic
   confirms accidental-only, ship the redesign"*.

4. **Compose with don't-ask-permission rule (just-landed):**
   the agent has full authority over factory shape; *"propose
   the simpler ruleset shape and ship it"* not *"ask Aaron
   whether to propose"*.

## Specific scope clarifications

### GitHub settings

Aaron's example: *"all setting to like github settings."*
Per CURRENT-aaron.md §2, the agent already has full ownership
of GitHub settings + configuration of any kind. This memo
sharpens the *posture* — not just authority but *active
re-evaluation*. Every tick, ask: is the current ruleset shape
right? Is the current branch-protection enforcement
list correct? Is the current workflow concurrency-group
strategy correct? Default *no, probably not, and we should
fix it now while greenfield permits.*

External-anchor evidence: the sibling-repo
`../no-copy-only-learning-agents-insight` has 5 concern-aligned
rulesets + branch-protection-effectively-empty (per
`memory/feedback_detect_changes_pattern_sibling_repo_parallel_optimized_external_anchor_aaron_2026_05_01.md`).
Zeta's current single-large-ruleset shape is accidental
complexity by the greenfield logic; redesign is open.

### Code architecture

Same logic. The current Spine family, the current Z-set
implementation, the current operator surface — all are
accidental-until-proven-essential. Refactor proposals don't
need extraordinary justification beyond "current shape is
accidental complexity; this shape is simpler / more
retraction-native / more aligned with the algebra."

### Skills + agents inventory

The current `.claude/skills/` and `.claude/agents/` rosters
are accidental — past tick-decisions produced them. Skill
hygiene (skill-tune-up, skill-gap-finder) is the existing
mechanism for re-evaluation; this memo widens the discipline
to *every tick*, not just cadenced sweeps.

### Memory files

Even memory files are accidental — past tick-decisions
produced the current set. The same-tick-update discipline
(CURRENT-aaron.md §10) is the existing mechanism;
hygiene-pass and consolidation are agent-side authority.

### Governance + alignment docs

Higher essential-content here, but not zero accidental
complexity. GOVERNANCE.md numbered rules can be reorganized;
AGENTS.md headings can be re-shaped; ALIGNMENT.md clauses
can be added (renegotiation protocol exists for clause
revisions). Essential: the alignment floor as content (HC /
SD / DIR clauses); accidental: how it's organized.

## Failure-mode signatures

- **Symptom:** "We can't change X because we already have it
  set up that way."
  **Mechanism:** Treating accidental shape as essential
  constraint. This is the exact anti-pattern Aaron caught.
  **Prevention:** Greenfield re-evaluation at every tick.
  Refuse the "we'd have to redo it" counterargument.

- **Symptom:** "Let me ask Aaron if it's OK to redesign the
  ruleset."
  **Mechanism:** Asking permission within authority scope
  (the don't-ask-permission rule fires).
  **Prevention:** Propose + ship + echo. Aaron corrects after
  if needed.

- **Symptom:** Cargo-culting the sibling-repo's exact ruleset
  shape because it works there.
  **Mechanism:** Replacing one accidental-complexity shape
  with another without first deriving from essential
  requirements.
  **Prevention:** External anchor = signal, not template.
  Derive Zeta's specific ruleset shape from Zeta's specific
  immune-system requirements (Aurora immune-math + the
  guiding-principles cluster).

- **Symptom:** Treating "intentional complexity" as a
  legitimate category for any non-essential decision.
  **Mechanism:** The phrase "intentional complexity" is
  Aaron's caught anti-pattern. Even if past-Otto wrote
  "intentional," current-Otto re-evaluates.
  **Prevention:** All complexity is accidental in greenfield.
  Period. The label "intentional" is itself accidental.

## What essential means here (the narrow defaults)

These are the load-bearing constraints that cannot be casually
re-evaluated each tick:

- **Alignment floor.** HC / SD / DIR clauses + Anthropic-
  policy red-lines. Renegotiation requires the protocol in
  `docs/ALIGNMENT.md`, not casual tick-decision.
- **VISION.md terminal purpose.** Intellectual backup of
  earth + retraction-native commitment + scope-creep-is-
  feature. Aaron is the source of truth for VISION; agent
  re-evaluation lives in implementation, not purpose.
- **Substrate algebra.** Retraction-native, replayable,
  deterministic, history-preserving. These are mathematical
  invariants, not stylistic choices.
- **Glass halo + transparency discipline.** Per Aaron 2026-04
  Glass Halo work — the substrate's auditability is
  load-bearing.
- **Do-no-permanent-harm + retractability.** Per HC-2 and
  the substrate-algebra commitment. Even with greenfield
  freedom, the agent doesn't ship irreversible changes.

Everything else is accidental. The bar for "essential" is
high; the default is "accidental, re-evaluate."

## Composition with existing rules

- **Otto-266 greenfield-until-deployed** —
  `memory/feedback_greenfield_until_deployed_then_backcompat_learning_mode_DORA_cost_2026_04_23.md`.
  This memo sharpens the operational stance during the
  greenfield phase: complexity is accidental.
- **VISION.md scope-creep-is-feature** — composes; we don't
  REMOVE paths from future-knowledge-potential, but we DO
  re-evaluate the current shape.
- **CURRENT-aaron.md §2 GitHub-settings-ownership** —
  authority anchor; this memo names the posture (active
  re-evaluation, not passive maintenance).
- **Don't-ask-permission rule (just-landed)** — composes;
  authority + posture together = ship redesigns when
  warranted.
- **Otto-357 no-directives** — composes; the agent is
  accountable for the factory shape, not following Aaron's
  specifications.
- **Rodney's Razor / Quantum Rodney's Razor** — the
  capability-skill that does this work; this memo is the
  greenfield-specific invocation.
- **Action hierarchy + Superfluid AI** —
  re-evaluation-and-simplification IS friction-reducing
  action; landing simpler shape now reduces friction across
  all future ticks.

## Wake-time encoding

CLAUDE.md needs a bullet that names this principle as
wake-time substrate, OR the existing greenfield-related
substrate needs to surface it explicitly. Without
wake-time-loaded encoding, future-Otto re-defaults to
treating current shape as load-bearing.

## Lineage

- **Aaron 2026-05-02** — direct verbatim source.
- **Brooks 1986** — *No Silver Bullet — Essence and Accidents
  of Software Engineering.* The essential-vs-accidental
  distinction.
- **Otto-266 greenfield-until-deployed** — operational
  framing.
- **VISION.md scope-creep-is-feature** — purpose-level anchor
  for "evaluate, don't kill."
- **CURRENT-aaron.md §2** — authority-level anchor.
- **Rodney's Razor / Quantum Rodney's Razor** — the
  complexity-reduction discipline this memo invokes.
- **Don't-ask-permission rule (this same tick)** —
  composing rule; authority + posture.

**Why:** Without explicit substrate naming the
all-complexity-is-accidental posture, future-Otto re-defaults
to treating the current concrete shape (rulesets, workflows,
configs, governance docs) as load-bearing. That re-default IS
the failure mode Aaron caught. Naming it as substrate
prevents the re-derivation.

**How to apply:** Every tick: re-evaluate at least one
piece of accidental complexity (a config, a ruleset, a
workflow, a doc structure, a skill body). If a simpler shape
exists that preserves essentials, ship it. If the current
shape IS the simpler one, log the re-evaluation as evidence
(per the action hierarchy / Superfluid principle —
re-evaluation IS friction-reducing-evidence-rich action).
Default presumption: current shape is accidental;
re-evaluate, don't preserve.
