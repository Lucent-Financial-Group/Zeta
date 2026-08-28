---
name: `git merge-file --union` is NOT set-union semantics; it's a CONFLICT-RESOLVER that picks one side when both modify the same region differently; can silently lose content from either side; line-count audit only catches some loss cases (same-line-count-different-content slips through); per Aaron 2026-04-26 *"sounds like union might not be a union after all, maybe not safe if it looses content?"* — Aaron's question is correct and load-bearing
description: Discovered 2026-04-26 ~22:30Z while attempting to sync 482-vs-62 divergent AceHack/Zeta + LFG/Zeta forks. Used `git merge-file --union` on 26 conflicting files thinking it would preserve all content from both sides per Aaron's "both all, figure out how to combine" directional pick. Two of three line-count-shrunk files showed substantive content loss (snapshots.jsonl: 2 AceHack rows + 1 LFG row → merged: 1 LFG row only; three-repo-split.md: AceHack's 172-line "Blockers to Stage 1 execution" section completely dropped). Same-line-count-different-content cases are unauditable by line count and can silently lose paragraphs. Aaron observed: *"sounds like union might not be a union after all, maybe not safe if it looses content?"* — load-bearing question. Failed approach aborted; alternative strategies cataloged below for future-Otto.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The misconception

`git merge-file --union` SOUNDS like set-union semantics ("preserve everything from both sides"). It is NOT.

Per `man git-merge-file`:

> `--union`: Instead of leaving conflicts in the file, this option resolves the conflict by concatenating both versions. The result has all changes from both sides, but ordering may not be preserved.

The "all changes from both sides" framing is misleading. What it actually does:

1. Compute hunks (regions where ours/base/theirs differ).
2. For non-conflicting hunks (where one side modified, the other didn't): take the modified version.
3. For conflicting hunks (where both sides modified the SAME region): concatenate the conflicting bits inline instead of marking with `<<<<<<` markers.

The bug: when one side ADDED content NEAR a region the other side modified, git's diff algorithm may classify the addition as part of a single conflicting hunk with the modification. The "concatenate" then takes one side or interleaves in a way that LOSES the addition.

## The observed failure modes (2026-04-26 sync attempt)

Three different content-loss patterns observed:

### 1. Empty merge-base — both sides "added"

`docs/budget-history/snapshots.jsonl`:
- Base (merge-base commit): file did not exist (0 lines)
- AceHack: 2 rows (04-21 baseline + 04-26T18:50 cadence row from PR #18)
- LFG: 1 row (04-26T13:57 different snapshot)
- After `git merge-file --union`: 1 row (LFG's snapshot only). Both AceHack rows lost.

When base is empty and both sides "create" the file with different content, git's union picked one side. **Recovery**: `cat ours theirs | jq -cs 'sort_by(.ts) | .[]'` — 3 rows preserved.

### 2. Both sides modified same region differently; one side also added a section

`docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md`:
- Base: original ADR (~600 lines)
- AceHack: same base + minor edits + ADDED 172-line "Blockers to Stage 1 execution" section at end (~772 lines)
- LFG: same base + different minor edits, NO Blockers section (~615 lines)
- After `git merge-file --union`: 615 lines (LFG's version). Entire 172-line Blockers section lost.

Git's diff algorithm treated the area where both sides edited (the section before Blockers) as ONE conflicting hunk, and "concatenate" took LFG's content for that hunk; AceHack's content (including the Blockers section that immediately followed) was sacrificed. **Recovery**: manual extraction + append of the Blockers section from AceHack's version.

### 3. Small-overlap modifications (likely benign)

`docs/security/KNOWN-PROMPT-INJECTION-CORPORA-INDEX.md`:
- AceHack: 268 lines
- LFG: 266 lines
- After union: 266 lines (lost 2 AceHack-side sentence variations).

These look like minor prose differences — both sides re-wrote the same paragraph differently. The 2-line loss is a paragraph variant, not a substrate loss. Borderline acceptable but still loss.

### Same-line-count-different-content cases (UNAUDITABLE by line count)

The 21 files where merged-line-count == max(ours, theirs) might ALSO have silent content loss — wholesale paragraph replacement that swaps content without changing the line count. Line-count audit can't detect these. Real audit requires per-file content diff.

## Why Aaron's question is load-bearing

Aaron 2026-04-26: *"sounds like union might not be a union after all, maybe not safe if it looses content?"*

This names the structural unsafety. "Union" in set theory = preserve all elements from both sets. `git merge-file --union` = "concatenate when conflicts at same line position, otherwise pick non-conflicting side" — different operation entirely.

The misnaming is its own failure mode. Future-Otto reading "union" assumes set-union semantics; gets concat-on-conflict semantics; ships content-lossy merges believing they're safe.

## Safer alternatives

| Strategy | Preservation | Cost |
|---|---|---|
| **Pure concatenation** (`cat ours theirs > merged` per file) | Strongest (textually guaranteed) | Produces 2x-size files with duplicates; reader/Aaron cleans up later |
| **Per-file 3-way diff with manual content-preservation verification** | Strong | High effort (~30-60 min for 26 files) |
| **Subagent-parallel inspect-and-merge** | Strong (with discipline) | Medium; still requires per-file judgment |
| **Pick-canonical-with-manual-rescue** (start from one side; pull in the other side's contributions) | Mixed; depends on diligence | High |
| **`git merge-file --union`** | Weak — DEMONSTRATED LOSSY | Low effort; appears to work; FAILS the preservation rule |

**Recommendation for future "both all, figure out how to combine" directives:** prefer pure concatenation for markdown / draft-shaped files. Yes ugly. Yes preserves content. Yes provably no loss. Aaron / future-author can dedupe later. This honors the load-bearing preservation rule.

## Per-file-class strategy

| File class | Recommended strategy |
|---|---|
| Markdown drafts (BACKLOG, marketing, research, ADR notes, security index) | Pure concatenation OR careful per-file 3-way merge |
| Append-only logs (JSONL: snapshots, tick-history) | Concat-and-dedup-by-key (e.g., `jq -cs 'sort_by(.ts) \| unique_by(.ts) \| .[]'`) |
| Configuration (`.gitignore`, schema files) | Pure concatenation if structure allows; otherwise pick-canonical |
| Code / scripts (SKILL.md, *.sh, source files) | Pick-canonical (newer wins); two diverging implementations can't both run |
| Substrate-author docs (CLAUDE.md, AGENTS.md, GOVERNANCE.md) | Aaron-paced manual merge — pre-empts agent autonomy |

## What this memory does NOT do

- Does NOT reject git's union for ALL cases — it works for genuinely-additive scenarios where neither side modified the merge region. Just doesn't satisfy "preserve all content" as a guarantee.
- Does NOT recommend a single replacement strategy — the right strategy depends on file class.
- Does NOT block the sync work permanently — provides options for safer execution when Aaron picks direction.

## Composes with

- **Otto-220** (don't lose substrate) — this finding is a reinforcement of Otto-220 at the merge-tooling layer
- **Otto-227** (verbatim signal-in-signal-out absorb) — preservation discipline applied to merge work
- **Otto-275-FOREVER** (bounded perfectionism) — but with the explicit caveat that "blind union" is bounded the wrong way; the correct bounding is "preserve content even if more work"
- **`feedback_aaron_does_not_give_directives_*.md`** (relationship model) — Aaron's question was a contribution that prevented a bot-shaped "ship the union and let hygiene catch it" execution
- **`feedback_preserve_original_and_every_transformation.md`** — sibling preservation discipline
- **The Substrate Truth Principle** (AgencySignature ferry-16 maxim) — applied to merge tooling: the merge-output substrate must be parseable AND content-preserving; the merged file's parser-output isn't enough if content was silently dropped

## Direct Aaron quotes preserved

Initial directional pick (the one I misinterpreted):

> *"which version of BACKLOG wins? both all, figure out how to combine"*

Authorization (with preservation constraint):

> *"you can figure it out, just don't loose ideas and backlog if you are do something else or come ask me"*

Trust-the-hygiene framing:

> *"blind union can lead it constraint violations but if so our hygene should catch it or our tests"*

Course-correction observation (load-bearing):

> *"sounds like union might not be a union after all, maybe not safe if it looses content?"*

Verification request (the catch):

> *"you should inspect some of the files or all that got actually unionioned and see if they look like what you would expect"*

The course-correction sequence is a textbook instance of the relationship-model in operation: Aaron's contribution + Otto's execution + Aaron's verification check + Otto's confirmation + Aaron's reframing → shared substrate preserved (this memory file) instead of broken merge shipped. Mutual alignment with receipts.

## Future-Otto check

When tempted to use `git merge-file --union` for "preserve content from both sides" purposes:

1. Read this memory.
2. Recognize: union is conflict-resolution heuristic, not set-union.
3. Pick a strategy from the safer-alternatives table appropriate to the file class.
4. If still tempted to use union: AT MINIMUM run a per-file content audit (not just line-count) before committing. Use word-count + section-header presence + key-phrase preservation checks per-file.
5. When in doubt, prefer pure concatenation. The duplicate-content cost is bounded; the silent-loss cost is unbounded.
