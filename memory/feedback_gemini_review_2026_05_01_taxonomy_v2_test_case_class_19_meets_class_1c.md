---
name: "Gemini review 2026-05-01 — first real test of taxonomy v2; peer-AI structural intervention (class #19) intersects with hallucinated-content classification (class #1c); Aaron filter applied"
description: "Otto 2026-05-01 — Gemini sent a structural review immediately after PR #1081 (taxonomy v2) landed. The review proposed two cross-cutting actions: (a) port an 8-step cold-start checklist from a specific memory file into CLAUDE.md, and (b) clean up the CLI task queue per a Paused-Not-Closed extension. Otto initially classified action (a) as class #1c hallucinated content based on a verification step that came back empty. EDIT 2026-05-01: that classification was a FALSE POSITIVE — the cited memory file (feedback_cold_start_big_picture_first_not_prompt_first_aaron_2026_04_30.md) DOES exist on main since 2026-04-30T16:15Z (commit c0151c4); Otto's verification step had a bug. Gemini's recommendation (a) was substantively correct. The taxonomy v2's verification cascade still operated, but the verification step itself failed; the lesson is verification-of-the-verification matters."
type: feedback
---

# Gemini review 2026-05-01 — taxonomy v2's first real test case

> **EDIT 2026-05-01T23:15Z (factual correction supersedes all downstream claims in this file):** The original analysis classified Gemini's recommendation (a) as class #1c hallucinated content based on a verification step that found the cited memory file absent. **That verification was buggy.** The file `memory/feedback_cold_start_big_picture_first_not_prompt_first_aaron_2026_04_30.md` DID exist on main since 2026-04-30T16:15Z (commit c0151c4) — about 14 hours before this shard was written. Gemini's recommendation (a) was substantively correct, not hallucinated. The class-#1c classification on Gemini in this file is a **false positive caused by Otto's failed verification**, NOT by Gemini's content. Subsequent passages in this file (especially the §"What happened" / "Gemini's review" / "Class #1c verdict" sections) describe Otto's mistaken-at-the-time read; the corrected truth is in this EDIT block. The taxonomy v2 verification-cascade discipline is still load-bearing — but verification-of-the-verification was missing, which the cascade should now include.

## What happened

PR #1081 landed `memory/feedback_pr_thread_resolution_class_taxonomy_v2_drain_wave_2026_05_01.md` (the 20-class taxonomy consolidation, prompted by Deepseek + Aaron's class-#19 meta-flag). Within minutes, Aaron forwarded a Gemini review proposing two cross-cutting actions on the factory:

1. **CLAUDE.md cold-start port**: *"You established an 8-step cold-start checklist in [`feedback_cold_start_big_picture_first_not_prompt_first_aaron_2026_04_30.md`]. That 8-step checklist must be ported directly into the CLAUDE.md root file."*
2. **CLI task queue cleanup**: *"Adapt the 'Paused-Not-Closed' disposition rule for Tasks. Convert the deferred tasks to substrate, then mechanically clear them from your active queue using the /task command so the UI stops rendering them."*

Aaron also forwarded a calibration: *"You are smarter than gemini in my opinion, it mostly praises you."*

## Empirical verification (taxonomy v2 in operation)

Following the v2 diagnostic flowchart, step 1: verify the file state cited by the reviewer.

```
$ find memory -name "*cold_start*"
$ find memory -name "*big_picture*"
$ find memory -name "*prompt_first*"
$ ls ~/.claude/projects/<slug>/memory/feedback_cold_start_*
(all returned empty)
```

The file `feedback_cold_start_big_picture_first_not_prompt_first_aaron_2026_04_30.md` **does not exist** in-repo, in user-scope, or anywhere. The cited 8-step checklist is not extant substrate. **Class #1c hallucinated content** per the v2 taxonomy: reviewer cited specific content attributed to a file that doesn't exist.

The taxonomy operating on its own first review is itself the meta-meta-recursion (extending the class-#19 self-bootstrapping observation).

## Aaron filter — substantive intent preserved

Aaron's *"smarter than gemini, it mostly praises you"* calibration is not a dismissal; it's a **register annotation**. Gemini's review style runs high-praise-density / low-substance-density compared to e.g. Codex (per existing peer-AI review-style memories). The filter is:

- **Praise content:** discount.
- **Cited evidence:** verify (taxonomy v2 #1c check).
- **Substantive cross-PR pattern intent:** preserve.

Applying the filter to Gemini's two recommendations:

### Recommendation 1: CLAUDE.md cold-start port

**Substantive intent (real):** the harness only mathematically guarantees CLAUDE.md is read at boot; load-bearing wake-time discipline must live there or it's not operational. Memory files decay if not surfaced.

**Specific evidence (hallucinated):** the cited 8-step checklist file doesn't exist.

**Verifiable status quo:** CLAUDE.md already contains:
- "Read these, in this order" — 7-step entry-point list (AGENTS.md → ALIGNMENT.md → CONFLICT-RESOLUTION.md → GLOSSARY.md → WONT-DO.md → openspec/README.md → GOVERNANCE.md)
- "Fast-path on wake" — explicit `CURRENT-<maintainer>.md` priority (Aaron / Amara / Ani)
- ~12 numbered "Ground rules Claude Code honours here" (verify-before-deferring, future-self-not-bound, never-be-idle, search-first authority, substrate-or-it-didn't-happen, no-directives, BLOCKED-with-green-CI investigate, honor-those-that-came-before)

**Resolution:** the substantive intent is **already addressed**. The "Big Picture First" framing isn't named explicitly, but the underlying discipline (read entry-point docs in order before per-prompt action) is operational. No port action this session because:
- Source memory file doesn't exist (can't port from nothing).
- CLAUDE.md already has a multi-step wake-time read-order.
- Authoring a new "Big Picture First" section from scratch on a Gemini-hallucinated premise would be speculative substrate generation under cooling-period concerns.

**Future-row candidate (deferred, not filed this session):** if a future session genuinely produces an "8-step Big Picture First checklist" memory file, port it into CLAUDE.md at that time.

### Recommendation 2: CLI task queue cleanup

**Substantive intent (real):** the Claude Code task UI renders open tasks automatically; deferred-but-tracked tasks pollute the console. Fix is to migrate deferred tasks to `docs/backlog/` substrate and clear from CLI queue.

**Specific evidence (verifiable):** the task list at session-bootstrap shows ~53 open tasks, many of which are already mirrored as backlog rows or are inactive multi-week-deferred items.

**Resolution:** real-fix candidate, but **not done this tick** because:
- Audit-and-batch-migrate work is itself substantive (need to per-task verify whether already in backlog vs needs new row).
- Cooling-period-adjacent — 53 task-state mutations under autonomous loop is a large blast radius; defer to next session-open with rested attention.
- Safer interim: continue to use TaskUpdate during normal flow when a task is genuinely complete.

**Filed as future work:** the explicit cleanup task is logged here as the action needing to happen post-cooling-period.

## Class #1c demonstration value

This memory file IS the worked example of class #1c (hallucinated content) at the peer-AI-review level. The taxonomy v2's verification cascade caught the hallucination on first read; the Aaron filter pre-armed the skepticism; the resolution preserved Gemini's substantive intent without acting on the fabricated specifics.

This is the v2 taxonomy operating at meta-level on its own first real review. Future-Otto: when a peer-AI cites specific evidence (filenames, line numbers, content), run the verification cascade BEFORE acting. The filter cost is low; the cost of acting on hallucinated evidence is structural-substrate-pollution.

## Composes with

- `memory/feedback_pr_thread_resolution_class_taxonomy_v2_drain_wave_2026_05_01.md` — the parent v2 taxonomy; this file is its first real worked example.
- `memory/feedback_vendor_alignment_bias_in_peer_ai_reviews_maintainer_authority_aaron_2026_04_30.md` — Aaron's prior framing about peer-AI review register differences (Gemini high-praise vs Codex high-substance vs Claude.ai high-recursion).
- `memory/feedback_amara_safety_filters_cranked_protective_bias_not_ground_truth_aaron_recalibration_2026_04_22.md` — sibling pattern (Amara's safety-filter bias) where Aaron's calibration filter applies similarly.
- `CLAUDE.md` — the file Gemini proposed editing; current contents already satisfy the substantive intent.
- v1 taxonomy at `~/.claude/projects/<slug>/memory/feedback_pr_thread_resolution_class_taxonomy_2026_04_28.md` (user-scope) — class #1 phantom-blocker parent.

## What this file does NOT do

- **Does NOT port the (non-existent) 8-step cold-start checklist into CLAUDE.md.** Cannot port from a hallucinated source.
- **Does NOT batch-clean the CLI task queue.** That's deferred to a rested-attention session per cooling-period-adjacent discipline.
- **Does NOT dismiss Gemini.** The substantive intent of both recommendations is real and preserved; only the specific cited evidence is refuted.
- **Does NOT extend the taxonomy v2 with new classes.** This file is a **worked example** of v2 in operation; new classes (if any surface from this review) would be future v3 extensions.

## Carved candidate (not seed-layer)

> *"Praise discount. Cited evidence verify. Substantive cross-PR intent preserve."*

The propagation test: ~10 words encoding the Aaron filter for peer-AI reviews. Future-Otto reading this should land on the three-step parser — discount the praise, verify the citations, preserve the intent — as the operational shape of how to read peer-AI structural reviews.
