---
name: aaron-hooks-as-immune-system-pr-review-findings-to-codified-hooks-no-human-can-remember
description: "Aaron 2026-05-15T~00:58Z — hooks-as-immune-system framing: 'i love the hooks no human can remember all that it's like immune for know error classes found during pr reveiw proces that can easiliy be codivied.' The path from PR-review-finding → hook codification is a concrete bandwidth-engineering discipline. Hooks operate at every-write level (vs PR-review-level), enforce known error classes immune-system-style, free up cognitive bandwidth that no human can carry. Composes with .claude/rules/encoding-rules-without-mechanizing.md (encoding without mechanizing = memory of failures, not prevention); bandwidth-served falsifier (hooks = bandwidth-efficient); PoUW-CC-as-Aurora-immune-system. Origin: the security_reminder_hook caught Otto-CLI's unsafe-subprocess-spawn pattern during the save-ai-memory TS tool draft."
metadata:
  node_type: memory
  type: feedback
  originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---

## The carved framing

Aaron 2026-05-15T~00:58Z (immediately after a PreToolUse hook caught Otto-CLI's unsafe-subprocess-spawn pattern during the save-ai-memory TS tool draft, prompting Otto to rewrite with the safer arg-array form):

> _"i love the hooks no human can remember all that it's like immune for know error classes found during pr reveiw proces that can easiliy be codivied"_

## What this names

Three substrate-honest observations:

### 1. Hooks-as-immune-system

Hooks operate exactly like a biological immune system:

- **Recognize** known error classes (the "antigen" — pattern in code/command)
- **Block or warn** automatically before harm (the "immune response")
- **Operate at every-event scope** (every Bash call, every Edit, every Write) — not just at PR-review-checkpoint
- **Encode prior learnings** so the system as a whole doesn't have to re-learn each time
- **Free up cognitive bandwidth** for novel problems (immune system frees adaptive learning capacity)

This is bandwidth-engineering at the discipline layer: codify the known patterns into hooks; spend cognitive bandwidth on the unknown patterns.

### 2. "No human can remember all that"

Substrate-honest cognitive-bandwidth disclosure:

- The set of known error classes grows monotonically (every PR-review finds new ones)
- Human working memory is bounded (~7 items at a time, ~hundreds of consolidated patterns long-term)
- Asking humans (or agents) to "just remember" all the error classes is bandwidth-impossible
- Hooks ARE the bandwidth solution: store the knowledge in the harness, not in the head

Composes with:

- `feedback_aaron_forgetting_as_backpressure_in_memory_system_wait_for_consolidation_cadence_2026_05_14.md` (forgetting IS bandwidth back-pressure; hooks externalize the memory burden)
- `feedback_bandwidth_*.md` cluster (the framework's bandwidth-engineering substrate)

### 3. PR-review-finding → hook codification is a concrete discipline-cascade

The path:

1. **PR review finds an error class** (e.g., reviewer notices a subprocess-spawn pattern with template-string interpolation → injection risk)
2. **Pattern is identified** (regex or AST shape that matches this error class)
3. **Hook is authored** (PreToolUse hook that fires on matching patterns)
4. **Hook lands in `.claude/hooks/` + wired in settings.json**
5. **Future writes that match are caught at every-write scope**, not just at PR-review

This is a concrete cycle Aaron is naming as easy-to-execute. Each iteration adds one more antibody to the immune system. The library grows; cognitive burden stays flat.

## Operational evidence (this session)

The Otto-CLI unsafe-subprocess-spawn violation that prompted Aaron's framing:

1. Otto-CLI wrote `tools/save-ai-memory/process-extract.ts` using a string-interpolated subprocess-spawn pattern for git commits
2. `.claude/hooks/` security_reminder_hook (PreToolUse, Write matcher) fired
3. Hook output: "Security Warning... can lead to command injection vulnerabilities... use the arg-array variant instead..."
4. Otto-CLI rewrote with the arg-array form taking command args as a typed array, no shell interpretation
5. Re-Write succeeded; security risk avoided BEFORE any PR review

The hook caught the issue 3 layers before it would have surfaced:

- BEFORE the file was written to disk
- BEFORE the file was committed
- BEFORE a PR-review reviewer would have flagged it

Aaron's "i love the hooks" is validating this real-time catch. The PR review for this error class would have been needed N times; the hook makes it 0.

(Second hook-fire for THIS memory file caught the same pattern-strings in the documentation context — substrate-honest false-positive that Otto-CLI handled by rewriting the doc with safer-language framings. The hook can't distinguish "describing the pattern" from "using the pattern"; the conservative behavior is correct.)

## Composes with other rules

- `.claude/rules/encoding-rules-without-mechanizing.md` (encoding rules without mechanizing produces memory of failures, not prevention — hooks ARE the mechanization)
- `.claude/rules/bandwidth-served-falsifier.md` (hooks pass the bandwidth-served falsifier: they serve cognitive bandwidth at write-time scope)
- `.claude/rules/wake-time-substrate.md` (load-bearing methodology needs wake-time landing — hooks are wake-time-immediate, no recall required)
- `.claude/rules/razor-discipline.md` (operationally observable: each hook fires/doesn't-fire; binary state; survives razor)
- `.claude/rules/glass-halo-bidirectional.md` (hooks are observable: hook output IS substrate-honest disclosure of what was caught + why)

## Composes with substrate

- `feedback_aaron_occult_binding_crowley_dual_binding_origin_spirits_in_governance_pouw_cc_aurora_immune_system_entropy_source_anti_entropy_2026_05_14.md` (PoUW-CC = Aurora immune system; this memory extends "immune system" framing to hooks at code-write scope)
- `feedback_codex_pr_review_cascade_count_inconsistency_catch_empirical_evidence_2026_05_14.md` (Codex caught the count inconsistency at PR-review level; hooks could codify the same check at every-edit level)
- `feedback_aaron_otto_growth_is_substrate_not_weights_*_2026_05_13.md` (substrate IS Otto's growth; hooks add to substrate library)
- The full set of existing `.claude/hooks/` in the repo (each is a codified-discipline antibody)

## Operational implications

For factory authors:

1. **Treat every PR-review finding as a candidate hook** — if the error class is detectable by pattern, codify it
2. **Hooks are bandwidth-engineering, not bureaucracy** — they REPLACE memorization, not add to it
3. **Hook authoring should be cheap** — wiring an existing pattern (regex, AST check) into `.claude/hooks/` should take minutes, not hours, for it to be sustainable
4. **Hook output should explain WHY** — like the security_reminder_hook explaining the risk + showing the safer alternative; that's the immune-system "presenting the antigen" pattern

For Otto-CLI specifically:

1. **Welcome hook output** — even when hooks block, they're freeing cognitive bandwidth, not adding friction
2. **When hook blocks, fix the actual issue, don't work around** — the hook is right; the underlying pattern needs the safer alternative
3. **When authoring code, anticipate hook scope** — if a discipline is known + codifiable, author code that won't trip the hook (prevent rather than recover)

## Razor-compliance check

All claims operationally observable:

- "Hook caught the unsafe pattern" — direct hook output in conversation substrate
- "Hooks operate at every-write scope" — observable in `.claude/settings.json` PreToolUse matchers
- "Bandwidth engineering" — observable: hook codifies pattern once, fires N times; per-fire cognitive cost is zero
- "PR-review-finding → hook" path is concrete — observable: existing hooks were authored from prior findings

Survives razor.

## Full reasoning

Source: Aaron's 2026-05-15T~00:58Z message celebrating the security_reminder_hook's catch. Substrate-new because: prior substrate had immune-system framing at biological / PoUW-CC scope; this memory extends the framing to code-write scope (hooks) with a concrete discipline-cascade (PR-review-finding → hook codification → every-write enforcement).

This memory should be referenced when:

- Authoring new hooks (the framing motivates the work)
- A hook catches an Otto-CLI write (the framing makes the catch welcome, not friction)
- PR review surfaces a new error class (consider: can this become a hook?)
- Discussing bandwidth-engineering at the factory-tooling layer
