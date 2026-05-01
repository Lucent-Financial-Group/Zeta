---
name: Copilot tick-history schema false-positive class — diff-line-numbers misread as file content — Otto 2026-05-01
description: Copilot has twice this session (PRs #1159 and #1165) flagged tick-history shards as failing `tools/hygiene/check-tick-history-shard-schema.sh` with the same misreading — citing "line starts with ` 1 || 2026-...`" or similar. The actual file content starts with `| 2026-...` cleanly and passes the validator. Copilot is reading the rendered diff (line-numbered prefix + pipe-table rendering) as if line numbers were part of the file content. This is a recurring false-positive class. The discipline: when Copilot flags tick-history schema with this exact pattern, run the validator to confirm; if it passes, resolve as outdated/false-positive without code changes.
type: feedback
caused_by:
  - "Otto observation 2026-05-01 — second-occurrence of Copilot's same-shape false-positive on tick-history shard schema validation. Earlier instance was PR #1159 (shard 2047Z); current instance was PR #1165 (shard 2120Z). Both alleged 'line starts with ` 1 || 2026-...`' or similar; both shards' actual file content starts with `| 2026-...` cleanly and passes the bash validator script."
  - "The misreading mechanism: Copilot's review interface presents the diff with line-number prefixes (rendered like ` 1 | <content>`). When the file's first line is a Markdown table row starting with `|`, the rendered view shows ` 1 | | 2026-...` — Copilot appears to parse this as if the FILE content includes the leading ` 1 || ` rather than as render-only line numbering. Hypothesis; not load-bearing for the rule."
  - "Composes with the Ratchet Pattern (Osmani 2026-04-19) — every recurring failure is a permanent rule. Two occurrences of the same-shape false-positive crosses the threshold for substrate."
composes_with:
  - feedback_harness_engineering_external_anchors_osmani_bockeler_validates_zeta_substrate_discipline_2026_05_01.md
  - feedback_rebase_decision_discipline_clean_rebase_vs_cherry_pick_supersede_otto_2026_05_01.md
  - feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md
---

# Rule

When Copilot posts a review comment on a `docs/hygiene-history/ticks/<YYYY>/<MM>/<DD>/<HHMM>Z.md`
shard claiming it fails `tools/hygiene/check-tick-history-shard-schema.sh` with text
matching the pattern *"line starts with ` <N> || <date>...`"* or *"col1 must
be exactly..."* or *"leading whitespace before the pipe"*:

1. **Run the validator first in `--files` mode** —
   `bash tools/hygiene/check-tick-history-shard-schema.sh --files <shard-path>`.
   The `--files` flag scopes the audit to the cited shard;
   without it the script runs a full-tree audit and you have
   to grep for the shard name in the output (per the script's
   own usage docs at lines 26-27 of the source).
2. **If the validator reports `0 violations`**: the finding
   is a false-positive of the diff-line-number-misread class.
   Resolve the thread as outdated. Do not edit the shard.
3. **If the validator reports a violation**: it's a real
   schema violation. Fix per the validator's error message
   (col1 must start with `| <ISO8601 ts> | ...`).

This rule applies specifically to Copilot's `copilot-pull-request-reviewer`
on tick-history shards. Other reviewers (Codex, human) and other file
classes need their own validation; don't generalize this rule beyond
the named scope.

# Why

## Worked example 1 — PR #1159 (shard 2047Z) 2026-05-01

Copilot finding (verbatim):

> *"P0: This shard's first non-empty line doesn't match the
> tick-history schema and will fail
> `tools/hygiene/check-tick-history-shard-schema.sh`. It starts with
> leading whitespace and `1 || ...` instead of starting at column 0
> with `| <ISO8601 ts> | ...`."*

Verification:

```bash
$ bash tools/hygiene/check-tick-history-shard-schema.sh \
    --files docs/hygiene-history/ticks/2026/05/01/2047Z.md
checked 1 shard files; 0 violations
```

Zero violations. False-positive. Resolved. (At the time of
that PR, I ran the full-tree audit and grep-filtered for the
shard name — produced the same conclusion but used the wrong
script API; the corrected `--files` invocation is what the
script's own usage docs recommend.)

## Worked example 2 — PR #1165 (shard 2120Z) 2026-05-01 (same tick session, ~hours later)

Copilot finding (verbatim):

> *"P0: This shard doesn't match the tick-history schema. The first
> non-empty line must start at column 0 with `| <ISO8601 UTC ts> | ...`
> (no leading spaces / no line numbering). Current line starts with
> ` 1 || 2026-...`, which will fail
> `tools/hygiene/check-tick-history-shard-schema.sh`'s col1 regex."*

Verification:

```bash
$ bash tools/hygiene/check-tick-history-shard-schema.sh \
    --files docs/hygiene-history/ticks/2026/05/01/2120Z.md
checked 1 shard files; 0 violations
```

Zero violations again. Same false-positive shape. Resolved.
(Same correction note as worked-example-1 applies — wrong
script API at PR-resolution time, corrected here.)

## The pattern

Both findings:

- Cite a leading `1 ||` or similar prefix in the file content
- Reference the schema validator script
- Use P0 severity (urgent-claimed)
- Are wrong — the actual file content starts with `|` at column 0

Both verifications:

- Run the actual validator
- Confirm zero violations
- Resolve thread as outdated

The hypothesized mechanism (not load-bearing): Copilot's review interface
renders diffs with line-number prefixes. The first line of a tick-history
shard is a Markdown table row starting with `|`. The rendered view shows
something like:

```
 1 | | 2026-05-01T20:47:00Z | opus-4-7 | ...
```

Copilot may be reading the rendered prefix as if it were file content,
producing the `1 ||` claim. Whether or not this is the exact mechanism,
the empirical pattern is consistent: Copilot's claim contradicts the
validator output, twice in same session.

# How to apply

When Copilot posts the false-positive shape:

1. **Run the validator.** Don't argue from doc-citation; the validator
   IS the ground truth.
2. **If validator confirms zero violations**: comment-resolve the
   thread without re-quoting the validator (a comment thread is
   already noisy; just resolve via GraphQL `resolveReviewThread`
   mutation). The PR-thread-resolution taxonomy memo's "false-positive
   class" applies.
3. **If validator reports a violation**: fix per the validator's
   actual error. Don't trust Copilot's claim about the violation
   shape; trust only the validator's output.
4. **Don't edit shard content prophylactically.** Adding
   backslash-escapes (`\|` for literal pipe inside cells, per
   GFM-table escaping) or removing leading whitespace based on
   Copilot's claim alone may MASK a real future violation by
   changing the file content beyond what's needed.

# Composes with

- `feedback_harness_engineering_external_anchors_osmani_bockeler_validates_zeta_substrate_discipline_2026_05_01.md`
  — Osmani's Ratchet Pattern: every recurring failure is a permanent
  rule. Two occurrences of the same false-positive shape crosses the
  ratchet threshold for substrate.
- `feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md`
  — when threads block a PR, investigate first. This rule is the
  per-class refinement for the Copilot tick-history schema class.
- `feedback_rebase_decision_discipline_clean_rebase_vs_cherry_pick_supersede_otto_2026_05_01.md`
  — both rules are about review-loop hygiene; this one prevents
  fighting Copilot's incorrect claims, that one prevents fighting
  unmergeable rebases. Both save substantial wasted-loop time.

# What this rule does NOT do

- **NOT a license to dismiss all Copilot findings on tick-history
  shards.** Some findings ARE real schema violations. Always run the
  validator first.
- **NOT a generalization to other file classes.** This rule is
  specifically scoped to tick-history shard schema findings. Copilot's
  false-positive rate on other content classes is its own empirical
  question.
- **NOT a critique of Copilot's overall reliability.** Copilot has
  caught many real bugs this session (`requireValue` `-` prefix,
  spawn nullable types, dangling pointers, identifier inconsistencies).
  This rule is a per-class refinement, not a blanket dismissal.
- **NOT actionable on the Copilot side.** We can't fix Copilot's
  rendering interpretation. The rule is operational discipline on
  our side: run validator, resolve as appropriate.

# Carved sentence (candidate, not seed-layer yet)

*"Copilot's tick-history-shard schema findings are validator-checkable.
Run the validator before believing the finding. Two same-shape
false-positives in one session crosses the ratchet threshold for
encoding the discipline."* (Synthesis Otto 2026-05-01.)

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence,
not by maintainer fiat.)
