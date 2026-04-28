---
name: Speculation LEADS investigation; it does NOT DEFINE root cause (Aaron 2026-04-28)
description: Aaron's binding correction to my LFG #661 "bullshit answer" 2026-04-28T14:30Z. Speculation has a legitimate role — generating hypotheses that lead investigation. Speculation has NO role in answering "what is the root cause." Stating speculation as mechanism is the failure mode. The fix that finally landed (umbrella check details URL → "1 configuration not found: codeql.yml /language:java-kotlin") was primary-source-grounded; the half-hour of "org-level inheritance asymmetry" framing before that was speculation-as-mechanism dressed up as confident explanation.
type: feedback
---

# Speculation LEADS investigation; it does NOT DEFINE root cause

## The rule

**Speculation has a legitimate role: generating hypotheses to direct investigation.**

**Speculation has NO role: standing in for the root cause when the question is "why?"**

When asked "what is the mechanism?" / "why doesn't this work?" / "give me the
exact definition," the answer comes from a primary source — the actual error
message, the actual config dump, the actual log line, the actual API response.
Not from a plausible-sounding causal narrative I assemble from nearby facts.

## Why: the LFG #661 incident (2026-04-28T13:30-14:30Z)

Aaron asked: *"why can't you make it work with it turn[ed] on, give me an exact
clear defin[i]tion i can understand"*

I produced a 4-step "exact mechanical answer":

1. LFG repo-level: default-setup `state: not-configured`
2. LFG org-level: 6 Code Security configurations exist with default-setup
   "enabled"; config 244997 has 7 sibling repos attached, Zeta is not attached
3. GitHub's umbrella evaluator sees the org-level expectation but no satisfying
   default-setup or org-config-attachment for Zeta → emits NEUTRAL with
   "1 configuration not found"
4. The advanced workflow uploads SARIF successfully but the umbrella's verdict
   is dominated by the missing-configuration expectation

Aaron: *"this seems like a bullshit answer"*

He was right. Steps 1-2 are facts (verifiable via `gh api`). Steps 3-4 are
**speculation** — I had no primary-source evidence that GitHub's umbrella
evaluator behaves that way. I built a plausible-sounding mechanism from nearby
facts and presented it as the mechanism.

## What primary-source-grounded looked like

After Aaron's pushback, I pulled the umbrella check's own details URL:

```bash
gh api "repos/Lucent-Financial-Group/Zeta/check-runs/73401083160" \
  --jq '.output.summary'
```

GitHub's actual error text:

> **Warning**: Code scanning cannot determine the alerts introduced by this
> pull request, because 1 configuration present on `refs/heads/main` was not
> found:
>
> ### Actions workflow (`codeql.yml`)
> * `/language:java-kotlin`

That's the **mechanism**. Not org-level inheritance. Not config-attachment
asymmetry. The workflow on `main` has produced `java-kotlin` analyses; the
PR head's `codeql.yml` matrix doesn't include `java-kotlin`; the umbrella
can't compute the alert delta; emits NEUTRAL.

Then: Aaron's *"we have java in our codebase, it's just a little but it's
there"* — confirmed by `find . -name '*.java'` finding `tools/alloy/AlloyRunner.java`
as first-party (the workflow's "no Java/Kotlin source" comment was wrong).

The fix follows mechanically from primary-source evidence: add `java-kotlin`
to the `analyze` matrix.

## What changed in the workflow

| Step | Before pushback | After pushback |
| --- | --- | --- |
| Hypothesis | "Org-level config inheritance asymmetry" | "Workflow matrix mismatch with main's analyses" |
| Source | Speculative narrative | `gh api .../check-runs/<id>` summary text |
| Confidence framing | "Exact mechanical answer" (false confidence) | "Primary-source quote, mechanism follows" |
| Action affordance | "Pick one of 3 options requiring your auth" | "Add `java-kotlin` to matrix; non-destructive" |

## The discipline going forward

When asked for a mechanism:

1. **Find the primary source first.** Error message, config dump, log line,
   API response, code path. *Quote it verbatim.*
2. **Hypotheses are scaffolding.** They direct what to query / fetch / read.
   They are NOT the answer.
3. **Confidence calibration matches source.** If the answer comes from a
   primary source, it can be stated confidently. If it comes from inference
   over nearby facts, frame it explicitly: *"hypothesis pending verification."*
4. **Bullshit-call recovery is fast.** Aaron's "this seems like a bullshit
   answer" is data: the framing was wrong; back up; re-source.

## Aaron's verbatim corrections (2026-04-28)

> *"this seems like a bullshit answer"*
> — Aaron 2026-04-28T13:30Z, on my 4-step org-inheritance narrative.

> *"we have java in our codebase, it's just a little but it's there"*
> — Aaron 2026-04-28T14:32Z, correcting the workflow's "no Java/Kotlin source"
> assumption.

> *"Speculation-as-mechanism is the failure mode; primary-source-first is the
> discipline. yes never speculate, i don't"*
> — Aaron 2026-04-28T14:35Z, accepting my own retroactive framing as binding.

> *"speculation leads investigation not defines root cause"*
> — Aaron 2026-04-28T14:35Z, refining the rule. Speculation has a role in
> *leading* investigation; it has no role in *defining* root cause.

## Composes with

- `feedback_codeql_umbrella_neutral_vs_per_language_detection_pattern_aaron_2026_04_28.md`
  — the empirical detection pattern. The "Open question (deferred)" section
  speculated on org-level inheritance; primary-source evidence today
  resolves that to the actual mechanism (java-kotlin language mismatch
  from main's stale analyses).
- `feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md`
  — same family of failure: assuming a wait when the primary-source query
  (unresolved threads) gives the actual answer.
- `feedback_otto_352_live_lock_term_split_three_distinct_classes_2026_04_26.md`
  — Aaron's precision principle. Less broad framings, primary-source-grounded
  classifications, beat sweeping speculative narratives.
- The "primary-source-first" line is now a CLAUDE.md candidate; promotion
  decision deferred to ADR.
