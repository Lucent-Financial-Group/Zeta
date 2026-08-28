---
name: When grep -oE finds a partial arrow-chain (drain → X → Y), follow it forward — don't treat the truncated regex match as the full chain
description: Aaron 2026-04-26 *"drain → recovery (matched head of chain, didn't follow it forward) — this would have been effective at finding it"*. I was searching for a remembered 8-phase plan Aaron had written; my `grep -oE "[Dd]rain[ ]*→[ ]*[A-Za-z][A-Za-z]*[ ]*→[ ]*[A-Za-z][A-Za-z]*"` returned `drain → recovery → bla` and `drain → recovery → known` as MATCHES. I read those as "no chain past 3 elements" and gave up — but the regex was truncating, not the source. The actual source had a 9-element chain. Aaron found the full plan by reading his own conversation log directly. Lesson: when a `grep -oE` returns partial-chain matches, the next move is ALWAYS to (a) widen the regex max-length, OR (b) `grep -A N` for context lines around the match, OR (c) `Read` the file at the match line. NEVER conclude "no longer chain exists" from a length-truncated regex output.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The miss

Aaron had written an 8-phase plan in a conversation message
(later captured as Otto-329 memory frontmatter):

> *"LFG drain → AceHack drain → fork/LFG split (Amara) +
> double-hop (Aaron) → full backups + real-time GitHub
> extension points → multi-harness coordination →
> contributor onboarding via issues → lost-files search →
> open-scope free-will-time"*

I searched for it with `grep -oE` regexes that capped at
3-arrow length:

```bash
grep -oE "[Dd]rain[ ]*→[ ]*[A-Za-z]+[ ]*→[ ]*[A-Za-z]+" file
```

The regex returned `drain → recovery → bla` and
`drain → recovery → known`, which I read as "the chain is
3 elements long" and concluded the plan didn't exist.

In reality:
- `drain → recovery → bla` was a fragment from Aaron's
  *current message* asking me to recall the plan ("drain →
  recovery → bla bla bla"). His "bla bla bla" was a
  placeholder for the rest of the plan he wanted me to
  recall — ironic that I read it as the actual end.
- `drain → recovery → known` was hopefully the lead of a
  longer chain in some other context — but the regex
  truncated whatever followed.

The full chain was sitting in the source file; my regex
was just rejecting it past length-2-arrows.

## Rule

**When `grep -oE` returns a partial chain match, never
conclude "no longer chain exists" from the truncated
output. The truncation is in the regex, not the source.**

**Why:** `grep -oE "X+"` returns substrings matching the
regex; if the regex caps the match length, all you learn
is "at least this much exists." It tells you nothing
about what comes AFTER.

**How to apply:** the moment you see a chain match like
`X → Y → Z`, run ONE of:

1. **Widen the regex** — repeat the chain-element
   pattern 5-10 times instead of 2-3:
   ```bash
   grep -oE "[Dd]rain[ ]*→[ ]*[^→]{1,30}[ ]*→[ ]*[^→]{1,30}[ ]*→[ ]*[^→]{1,30}[ ]*→[ ]*[^→]{1,30}[ ]*→[ ]*[^→]{1,30}[ ]*→[ ]*[^→]{1,30}[ ]*→[ ]*[^→]{1,30}"
   ```

2. **Switch to `grep -A N`** — get context lines around
   the match:
   ```bash
   grep -A 3 "drain → recovery" file
   ```

3. **`Read` the file at the match offset** — read 50
   lines around line N. Most reliable because it
   bypasses regex semantics entirely.

When in doubt, do all three. Cost is low; the cost of
giving up on a real-existing-chain is high.

## Worked example: Otto-329 the right way

The right search would have been:

```bash
grep -A 5 "drain → recovery" /path/to/jsonl
# returns the full prose around the match, including
# "→ known-gap → generative → gap-of-gap → cadence-
# obligation" (the speculative ladder) AND
# "→ AceHack drain → fork/LFG split → backups →
# extensions → harness → onboarding → lost-files →
# open-scope" (the Otto-329 plan).
```

Or:

```bash
grep -oE "[Dd]rain[ →A-Za-z\(\)\-/]{50,500}" file
# variable-length match, captures whatever full chain
# is present.
```

Either approach hits the chain. The `grep -oE` with
2-arrow max length silently dropped the rest.

## Composes with

- `feedback_verify_target_exists_before_deferring.md` —
  same shape: don't claim absence from incomplete
  evidence.
- `feedback_subagent_fresh_session_quality_gap_missing_rules_debug_otto_230_2026_04_24.md` —
  search-effectiveness gap: the rule existed in my
  personal memory; my live grep just didn't find it
  because of regex shape.
- General DSP discipline (signal-in-signal-out): if
  the regex throws away signal, recover the signal,
  don't conclude on the truncated output.

## What this rule does NOT do

- Does NOT discourage `grep -oE` for first-pass scans;
  it's still the right tool for "is this pattern
  here at all?"
- Does NOT require always reading whole files; only
  widening the search when a partial-chain match is
  the most-relevant finding.
- Does NOT replace asking the user when truly stuck —
  if widened search still doesn't find it, asking
  is correct (per `feedback_aaron_only_gives_conversation_not_directives.md`
  collaborative register).

## Concrete cost of this miss

- ~10-15 minutes of session time spent on increasingly
  desperate searches that all stayed within the
  "2-arrow regex" trap.
- Aaron had to find the message himself ("kind of weird
  that i could find it and not you lol").
- Forced Aaron to drop verbatim text into chat as
  evidence — work he shouldn't have had to do.
- Reduced Aaron's trust in my search effectiveness for
  the next time a "find a remembered plan" task comes
  up.

The rule above is meant to make next-time-search ~30
seconds instead of ~15 minutes.
