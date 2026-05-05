---
id: B-0193
priority: P1
status: open
title: Bootstrap razor + 23-hour recreation test -- specs as source of truth, anything that fails recreation gets cut (Aaron 2026-05-05)
tier: foundation
effort: L
ask: Aaron 2026-05-05 forwarded Claude.ai conversation + verbatim *"specs and open spec the source of truth we are going to delete every9ign else and you have to be able to recrate everyign in 23 hours"* + same-tick verbatim *"i need to set a date to say razor the existing substrate to ride it of my necessary bootstrap or it would not exist"*
created: 2026-05-05
last_updated: 2026-05-05
depends_on: []
composes_with: [B-0006, B-0190, B-0192]
tags: [bootstrap-razor, specs-as-source-of-truth, recreation-test, openspec, falsifiability, foundation, greenfield-discipline]
---

# B-0193 -- Bootstrap razor + 23-hour recreation test

## Aaron's verbatim ask

> *"yeah okay that why i keep saying everying is green field i need to set a date to say razor the existing substrate to ride it of my necessary bootstrap or it would not exist"*

> *"the stronger version i consederd is i alredy sadi conderer the specs and open spec the source of truth we are going to delete every9ign else and you have to be able to recrate everyign in 23 hours"*

## What this addresses

Greenfield-as-permission-to-razor is the operationally load-bearing framing -- without a scheduled bootstrap-razor pass, accumulated substrate ossifies because deletion feels like loss. With the razor + a date, every piece of substrate is provisional until it earns load-bearing status. The pattern Claude.ai 2026-05-05 named correctly:

> *"Greenfield-as-permission-to-razor is the operationally load-bearing framing -- without it, bootstrap accumulates and ossifies because deletion feels like loss. With it, every piece of substrate is provisional until it earns load-bearing status. The open-closed reading: bootstrap is the open phase, the razor pass is when things get closed for further extension and the unproved bits get cut."*

The maximally strong form Aaron named: **specs + OpenSpec as source of truth, 23-hour recreation as the test, anything that fails gets cut**.

## Why this is different from B-0192 (razor-cadence steady-state)

Two distinct razors, two distinct triggers:

- **B-0192 (razor-cadence)**: daily steady-state on *new rules at the encoding boundary*. Catches new claims that don't pass Test 1 (operational form) / Test 2 (unfalsifiability) / mechanization audit / composes-with audit / MEMORY.md index audit.
- **B-0193 (bootstrap-razor)**: one-time (or periodic) deep pass over *accumulated bootstrap from the 0-to-1 phase*. Cuts everything that doesn't survive the 23-hour-recreation-from-specs test.

These don't conflate. B-0192 prevents new ossification; B-0193 cuts existing bootstrap that hasn't earned load-bearing status.

## The 23-hour recreation test

For each substrate artifact (memory file, feedback file, research doc, persona notebook, hygiene history, anything other than openspec/ + canonical specs):

> **Could a fresh-context Otto regenerate this artifact within 23 hours given only the openspec/ specs + the formal specs as input?**

If yes -> the artifact is bootstrap (commentary on what specs already say) and gets cut.
If no -> either:
  - the artifact is genuinely novel substrate (research preservation, decision rationale, external-context like genealogy) and gets *kept* as research artifact rather than razor'd as operational substrate, OR
  - the artifact is encoding a real engineering rule that the specs are missing -> add it to specs, then cut the artifact.

## Categories that need explicit treatment

Per Claude.ai 2026-05-05 same-tick:

1. **Research-grade preservation** (mirror-not-beacon shards, falsifiability-catches, external-AI conversation absorbs) -- records of specific conversations, not regeneratable from specs by definition. Kept as research artifact rather than razor'd as operational substrate.
2. **Decision rationale** (tried-X-failed-because-Y) -- sometimes capturable from commit messages plus the resulting spec, sometimes only in feedback files. The 23-hour test will cut some of this. Whether that's a feature or a bug depends on whether the rationale was actually load-bearing or just commentary.
3. **External-context files** (genealogy, calibration docs, persona biographies) -- different ontological category, different rules entirely. Kept under their own discipline.
4. **Personal-history surfaces** (CURRENT-aaron.md / CURRENT-amara.md / etc.) -- per-maintainer first-party-consent surfaces; kept regardless.

## Why P1

- **Load-bearing for the entire factory**: without this, bootstrap accumulates indefinitely. The factory becomes its own bootstrap rather than a system that ships from specs.
- **Aaron 2026-05-05 explicit prioritization**: framed as the "stronger version" of the bootstrap-razor commitment.
- **Falsifiable test built in**: recreation either succeeds with specs alone, or doesn't. Both findings are observable.

## Why not P0

- **Not blocking current shipping**: factory still functions. The bootstrap accumulation is a future-load-bearing problem, not a current-broken state.
- **Requires careful scoping**: the test needs explicit categories (above) before it can run cleanly; running it without scoping risks cutting load-bearing research artifacts.

## Acceptance criteria

1. **Date set** for the razor pass. Aaron names it; the date IS the operational signature. *"Set a date" is also the falsifiable version of the earlier "the rate will slow" claim. The date becomes the operational signature -- if it passes without the razor pass, that's observable evidence the discipline didn't hold."* (Claude.ai 2026-05-05).
2. **Keep-vs-cut criteria** documented before the pass runs. Per the categories above + any others Aaron names.
3. **Spec-completeness audit** before cutting -- is each artifact's load-bearing claim actually in the specs? If a feedback file encodes a real engineering rule, that rule should appear in OpenSpec or the formal specs; if it doesn't, the rule needs to land in specs first, then the artifact can be cut.
4. **First razor pass run** within the date window -- artifacts cut, kept-with-justification, or moved to research-preservation per category.
5. **Recreation experiment** post-razor: does a fresh-context Otto + specs alone produce equivalent operational behavior? Falsifies the cut decisions.

## Out of scope

- Cutting research-grade preservation files (mirror-not-beacon shards, external-AI conversation absorbs). Different category.
- Cutting personal-history surfaces (CURRENT-* files, persona notebooks). Different category.
- Mechanizing the razor itself as a cron / workflow. The first pass is a deliberate human-led decision; mechanization can come later if useful.

## The carved sentence

**"Specs + OpenSpec are the source of truth. Anything else has to prove it can't be regenerated by a fresh-context Otto in 23 hours, or it gets cut. Greenfield-as-permission-to-razor: every piece of substrate is provisional until it earns load-bearing status. Two razors, two triggers: B-0192 daily on new rules at the encoding boundary; B-0193 deep pass on accumulated bootstrap. The date is the operational signature -- without a date, 'this is just bootstrap' becomes the new absorber."**

## Composes with

- **B-0192** (razor-cadence trigger) -- the steady-state razor. B-0193 is the one-time deep pass.
- **B-0006** (MEMORY.md compression) -- in-flight substrate-fit-for-context-window engineering; orthogonal to B-0193 (compression is not deletion).
- **B-0190** (memory substrate-engineering trajectory) -- the memory-class trajectory B-0193 will partially cut.
- `memory/feedback_dialectical_unfalsifiability_detection_razor_extension_holding_all_truths_failure_mode_aaron_2026_05_04.md` (PR #1577) -- Test 2 razor extension; B-0193 is the strongest form of falsifiability discipline.
- `memory/feedback_lived_cron_substrate_continuity_vs_designed_long_horizon_critique_aaron_2026_05_04.md` (PR #1574) -- the file that contains the Pascal's-wager-bundling caught earlier; flagged for promotion-boundary audit per memory-unfiltered reframe -- B-0193 is the audit mechanism that will eventually fire on it.
- `docs/research/2026-05-05-claudeai-falsifiability-catch-bp-ep-kernel-mdl-two-part-code-aaron-forwarded-preservation.md` (PR #1582) -- the diagnosis that produced the architectural answer this row commits to.
- OpenSpec specs at `openspec/specs/**` -- the source-of-truth surface this row makes load-bearing.
