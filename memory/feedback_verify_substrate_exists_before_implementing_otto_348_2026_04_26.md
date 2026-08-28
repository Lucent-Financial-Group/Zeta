---
name: Otto-348 — verify-substrate-exists BEFORE implementing (symmetric extension of CLAUDE.md verify-before-deferring; failed twice in consecutive ticks 2026-04-26)
description: Before drafting/building any tool/script/skill/doc, run `ls` or `grep` against the canonical home location FIRST. The existing-substrate is what you should use. If you skip the check, you waste a tick on duplicate work AND drift the substrate (two scripts solving the same problem in different files). This is symmetric to CLAUDE.md verify-before-deferring (which says: verify deferred targets exist before promising them) — applied to the implementation direction (verify candidate primitives DON'T already exist before coding them). Failed twice in 2 ticks 2026-04-26: `tools/hygiene/append-tick-history-row.sh` (existed, 81 lines) — almost rebuilt; `tools/hygiene/fix-markdown-md032-md026.py` (existed) — wrote a one-off python pass instead of using it.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The rule

**Before drafting or building any tool / script / skill / doc / lint / helper, run `ls <canonical-home>/<candidate-name>*` (or `grep -r` on canonical-home directory) FIRST.** If the substrate exists, USE IT. If it doesn't exist, build it.

**Order of operations:**

1. Identify candidate primitive name (e.g., `tools/hygiene/check-jq-add-default.sh`)
2. Verify-doesn't-exist: `ls <path>` AND/OR `grep -r <similar-pattern> tools/`
3. ONLY if both confirm absence: draft + build
4. If exists: read existing tool, decide use-as-is OR enhance-rather-than-replace

**Why:**

- The existing substrate IS what you should use. Re-implementing duplicates work AND drifts the substrate (two scripts solving the same problem in different files).
- This is **symmetric to CLAUDE.md verify-before-deferring** (which says: verify deferred targets exist before promising them) — applied to the implementation direction.
- Cost asymmetry: 5-second `ls` check vs 5-15 minutes of duplicate implementation.

## How to apply

**Trigger conditions** — every time I'm about to write any of:

- A new file under `tools/hygiene/`, `tools/setup/`, `tools/`, `.claude/skills/`, `.claude/agents/`
- A new doc that "should exist" by my mental model
- A new memory file (check `~/.claude/projects/<slug>/memory/` first; canonical home distinct from in-repo `memory/`)
- An ad-hoc one-shot script (e.g., the inline `python3 << EOF` blank-line fixer I wrote)

**Mandatory check before drafting:**

```bash
# For tools/skills:
ls tools/hygiene/<candidate-name>* 2>&1 | head -3
grep -lE "<keyword-pattern>" tools/hygiene/*.{sh,py} 2>&1 | head -3

# For docs:
ls docs/research/<candidate-name>* 2>&1 | head -3
grep -li "<topic-keyword>" docs/research/*.md 2>&1 | head -3

# For memories:
ls /Users/acehack/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/memory/<candidate>* 2>&1 | head -3
```

**If exists** → read it; decide whether to use as-is, enhance, or document why a parallel implementation is justified (rare; usually the right move is enhance).

**If doesn't exist** → proceed with build, but cross-reference via `Composes with:` to any related-but-distinct primitives.

## Composes with

- `feedback_verify_target_exists_before_deferring.md` (CLAUDE.md-level rule) — same shape, deferral direction; this is the symmetric implementation-direction extension
- Otto-289 verify-before-deferring discipline (already canonicalised in CLAUDE.md)
- Otto-220 don't-lose-substrate (re-implementing duplicates, doesn't lose; but it FRAGMENTS substrate into parallel implementations which is its own loss-shape)
- Otto-275 log-don't-implement (when in doubt, don't implement at all this tick — log as task)
- Otto-346 substrate-primitive pattern (verify-discipline applies BEFORE invoking the build-substrate-primitive lifecycle)

## Worked examples (2026-04-26 session, 2 consecutive failures)

**Failure 1: `tools/hygiene/append-tick-history-row.sh`**

- Tick 13:38Z: Identified parallel-tick-DIRTY cascade as failure mode; planned to build `tools/hygiene/append-tick-history-row.sh` as Otto-346 substrate-primitive.
- Started build, then ran `ls tools/hygiene/append-tick-history-row.sh` post-hoc.
- Result: **already exists, 81 lines, exactly the helper I was about to write** (heredoc-append + timestamp-non-decreasing validation).
- Wasted: ~30s on initial drafting; saved by accidental ls.

**Failure 2: `tools/hygiene/fix-markdown-md032-md026.py`**

- Tick 13:41Z: PR #602 had MD032 lint fails; wrote inline python script `python3 << EOF` to add blank lines around list starts.
- Committed + pushed (5cecc81).
- THEN noticed in tick-row body the existing `fix-markdown-md032-md026.py` and ran `ls` post-facto.
- Result: **already exists, would have done the job**.
- Wasted: ~3 min on the inline script + commit; the existing tool likely better-tested.

**Both failures share shape**: I was thinking about substrate-primitives in the abstract while writing tick-row content, then implementing the abstraction without first verifying it doesn't already exist concretely. The `ls` check is cheap; not running it is the failure.

## Mechanical-fix candidates (Otto-341 mechanism-over-vigilance)

- **Pre-commit hook** that warns when a new file is added under `tools/hygiene/` — prompts agent to confirm "I checked existing tools and this is genuinely new."
- **Skill wrapper** for the build-substrate-primitive workflow that mandates the verify-doesn't-exist step.
- **Skill-creator-style workflow** for tools where the first step is "search for existing tool with similar shape."

For now, this memory is the agent-vigilance layer until a mechanism lands.

## What this rule does NOT do

- Does NOT block legitimate parallel implementations when they ARE justified (e.g., one tool does X, another tool does X+Y; verify justifies the parallel).
- Does NOT require exhaustive search across all `tools/` for every minor inline command — apply judgment, the discipline is for **building or drafting NEW tools/scripts/docs**, not every individual `bash` invocation.
- Does NOT supersede Otto-275 log-don't-implement (when in doubt, log a task; don't pre-emptively build).

## The asymmetry to remember

Cost of running `ls` first: ~5 seconds.
Cost of implementing duplicate substrate: 5-30 minutes + drift cost.
Cost ratio: ~60-360x in favor of running the check.

Every time I "feel like building" something, the impulse should be checked by `ls` BEFORE the first line of code or text gets written.
