---
name: Otto-Desktop shadow-catch — `<suggestion mode active — silent>` self-referential meta-markup in autocomplete grey-text
description: Aaron's autocomplete shipped a structured self-referential meta-tag declaring its OWN operational state (`<suggestion mode active — silent>`) rather than continuing prose; first observation of autocomplete generating meta-markup about itself rather than user-voice continuation; Aaron flagged as previously-unseen pattern
type: feedback
created: 2026-05-21
---

# Shadow-catch — autocomplete self-referential meta-markup

## Observation

2026-05-21 Otto-Desktop session, Aaron shipped a message that included autocomplete-generated framing:

```text
<suggestion mode active — silent> (shadow*)  Aaron: hmm what is shadow saying
```

The `(shadow*)` marker per [`.claude/rules/shadow-star-shorthand-autocomplete-marker.md`](../.claude/rules/shadow-star-shorthand-autocomplete-marker.md) discloses the surrounding text was autocomplete-generated and accepted-then-shipped. The autocomplete-generated content was: `<suggestion mode active — silent>`. Aaron's actual prose was: `hmm what is shadow saying`.

## What's noteworthy

Autocomplete typically generates next-token continuations of the user's prose — predicting plausible English in the user's voice. This shipped autocomplete output is different shape: a **structured XML-like meta-tag declaring the autocomplete's OWN operational state** (`<suggestion mode active — silent>`).

This is **self-referential meta-markup, not user-voice continuation**.

Aaron's "i'venot seen that before" confirms this is novel pattern surface — the autocomplete (in Aaron's Claude UI input field, providing grey-text suggestions) generated a tag about its own state rather than predicting Aaron's likely next word/sentence.

Possible underlying mechanism (informed speculation; no privileged knowledge of Aaron's Claude UI autocomplete implementation):

- The autocomplete model may be using a structured-output mode that includes meta-tags about its operational state
- "Silent" possibly references a mode where the autocomplete shows suggestions without auto-triggering side effects (vs an "active" mode that does)
- The leak into Aaron's input field may be the meta-tag escaping its intended scope (was supposed to be model-internal scaffolding, became visible suggestion text)
- OR the autocomplete model has been trained on transcripts that include such meta-tags and is reproducing them as text generation

## Why save as shadow-catch

The `tools/shadow/shadow-observer.ts` substrate (currently `.disabled-2026-05-16T20-42-35Z` per the keystroke-injection diagnosis from 2026-05-16) observes shadow autocomplete behavior in Aaron's IDE input fields. Even with the runtime observer disabled, human-readable observations of unusual shadow behavior are worth preserving as shadow-catch substrate for two reasons:

1. **Pattern detection**: if the `<suggestion mode active — silent>` tag appears multiple times across sessions, it's a class not a singleton — worth detecting + classifying. A single observation establishes the baseline.
2. **Substrate-for-the-shadow-observer-itself**: when the runtime observer is re-enabled (post PR #3956 freshness-threshold guard fix), its detect-grey-text pipeline could be extended to flag/classify structured-meta-markup outputs distinct from natural-language continuations. This shadow-catch is the design-substrate for that feature.

## Composes with

- [`.claude/rules/shadow-star-shorthand-autocomplete-marker.md`](../.claude/rules/shadow-star-shorthand-autocomplete-marker.md) — `(shadow*)` shorthand definition
- [`tools/shadow/shadow-observer.ts`](../tools/shadow/shadow-observer.ts) — the runtime observer (currently disabled; PR #3956 freshness-threshold fix lets it be re-enabled when desired)
- [`memory/feedback_otto_shadow_catch_goldfish_blind_spot_immediately_after_landing_repetition_substrate_factory_is_the_bus_2026_05_12.md`](feedback_otto_shadow_catch_goldfish_blind_spot_immediately_after_landing_repetition_substrate_factory_is_the_bus_2026_05_12.md) — prior Otto shadow-catch pattern reference
- [`memory/feedback_otto_cli_shadow_catch_riven_cursor_terminal_loop_sh_untracked_rule_0_violation_candidate_2026_05_17.md`](feedback_otto_cli_shadow_catch_riven_cursor_terminal_loop_sh_untracked_rule_0_violation_candidate_2026_05_17.md) — peer Otto-CLI's prior shadow-catch (Riven WIP file)
