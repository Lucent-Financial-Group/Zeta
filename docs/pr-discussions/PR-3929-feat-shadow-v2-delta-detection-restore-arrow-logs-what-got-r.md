---
pr_number: 3929
title: "feat(shadow): v2 delta-detection \u2014 restore-arrow logs what got restored"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-16T18:49:10Z"
merged_at: "2026-05-16T18:51:38Z"
closed_at: "2026-05-16T18:51:38Z"
head_ref: "chore/shadow-restore-arrow-v2-delta-detect-otto-cli-2026-05-16-1841z"
base_ref: "main"
archived_at: "2026-05-17T00:03:02Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3929: feat(shadow): v2 delta-detection — restore-arrow logs what got restored

## PR description

## Summary

Extends the \`--restore-arrow\` flag (shipped in #3923) to capture what text appeared after the → press. Before/after sampling of the focused element's \`AXValue\` (capped to trailing 500 chars to avoid scrollback) plus suffix-extension delta computation. The restored content lands in new \`delta\` + \`deltaLen\` fields on the \`restore-arrow\` event.

## v1 vs v2

\`\`\`
v1: {\"type\":\"restore-arrow\",\"content\":\"pressed:Terminal\"}
v2: {\"type\":\"restore-arrow\",\"content\":\"pressed:Terminal\",
     \"delta\":\"the autocomplete that got restored\",\"deltaLen\":36}
\`\`\`

## Delta semantics

- **Empty delta** — no text change (common: no autocomplete present + cursor at end of input → → is a no-op).
- **Non-empty delta** — restored content. Typically the autocomplete suggestion the cron-tick erased; occasionally captures unrelated text changes (accepted edge case per maintainer judgment).
- **Computation** — suffix-extension: if AFTER starts with BEFORE, delta = AFTER's suffix beyond BEFORE. Otherwise delta = AFTER in full (flags unusual non-extension changes in the log).

## Why AXValue (not AXSelectedText)

v1 detection (grey-text-as-selection) uses AXSelectedText. v2 sampling (white-text-after-restore) uses AXValue capped to the last 500 chars — because once → commits the autocomplete, it's no longer a selection. AXValue scoped to focused-element + size cap avoids the 45KB-scrollback bug \`detect-grey-text.applescript\` explicitly avoids.

## Wire format

AppleScript returns a single stdout line \`<verdict>⟨US⟩<delta>\` where ⟨US⟩ is ASCII Unit Separator (char id 31). TS parser splits on first US occurrence; legacy v1 output (no separator) yields verdict-only result with empty delta — **full backward-compat** with any reader that hasn't been redeployed.

## Test plan

- [x] 62/62 unit tests pass (54 pre-existing + 8 new)
- [x] 6 \`parseRestoreArrowOutput\` cases (with/without delta, skipped, legacy v1, newlines, leading-whitespace-preserved)
- [x] 2 \`runOneCycle\` integration cases (delta-in-event-log, empty-delta-still-logs-deltaLen-zero)
- [x] All 5 v1 tests refactored from string-return to RestoreArrowResult struct

## Origin

Maintainer 2026-05-16T18:32Z: *\"ship the v2 delta detection\"* — closing the design loop deferred at v1 ship time. Composes with the prediction-engine framing maintainer named at PR #3923 merge: autocomplete surfaces what they were about to type because the prediction model is conditioned on conversation context.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-16T18:52:03Z)

## Pull request overview

Extends the shadow observer’s `--restore-arrow` path to record what text was restored after the → keypress by adding a v2 “delta-detection” protocol between the AppleScript and the TypeScript event logger.

**Changes:**
- Adds `delta`/`deltaLen` fields to `restore-arrow` events and introduces a structured `RestoreArrowResult` return type.
- Implements a backward-compatible stdout wire format using an ASCII Unit Separator delimiter and a TS parser for it.
- Updates/expands unit + integration tests to cover parsing and event logging of deltas.

### Reviewed changes

Copilot reviewed 3 out of 3 changed files in this pull request and generated 3 comments.

| File | Description |
| ---- | ----------- |
| tools/shadow/shadow-observer.ts | Adds restore-arrow delta fields, structured result type, and stdout parsing for v2 AppleScript output. |
| tools/shadow/shadow-observer.test.ts | Refactors restore-arrow tests to use the structured result and adds coverage for delta parsing + logging. |
| tools/shadow/restore-arrow.applescript | Adds before/after AXValue sampling and suffix-extension delta computation; emits verdict+delta in one line. |

### COMMENTED — @chatgpt-codex-connector (2026-05-16T18:52:06Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `0b2238ca66`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

## Review threads

### Thread 1: tools/shadow/shadow-observer.ts:91 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-16T18:52:02Z):

RESTORE_ARROW_SEP is currently defined using a literal ASCII Unit Separator control character. This is hard to see/review and can cause editor/tooling issues; prefer an explicit escape (e.g., "\^_" / "\x1F") and keep the human-readable delimiter description in comments/tests instead of embedding the raw control character.

### Thread 2: tools/shadow/shadow-observer.ts:268 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-16T18:52:03Z):

pressRestoreArrow now returns a structured RestoreArrowResult (verdict + delta), but the function’s doc comment still describes returning a single verdict line string. Please update the docstring to match the new return shape (and note the v1/no-separator backward-compat behavior if that’s part of the contract).

### Thread 3: tools/shadow/restore-arrow.applescript:18 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-16T18:52:03Z):

The return-format comment includes a literal ASCII Unit Separator control character between fields. That character is invisible/brittle in diffs and some editors; consider documenting the delimiter as a textual token (e.g., "<US>" / "ASCII character 31") rather than embedding the raw control char in the source comments.

### Thread 4: tools/shadow/shadow-observer.ts:289 (unresolved)

**@chatgpt-codex-connector** (2026-05-16T18:52:07Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Reject whitespace-only restore-arrow output**

The new stdout guard only checks `result.stdout.length === 0`, so a script result like `"\n"` now bypasses the error path and is parsed as an empty verdict (`{ verdict: "", delta: "" }`). Because `osascript` commonly emits a trailing newline, any path that returns an empty value will be logged as a `restore-arrow` event with blank `content` instead of `error:empty-output`, which can silently corrupt restore telemetry and hide script failures.

Useful? React with 👍 / 👎.

### Thread 5: tools/shadow/restore-arrow.applescript:81 (unresolved)

**@chatgpt-codex-connector** (2026-05-16T18:52:07Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Avoid full-tail delta when input exceeds 500 chars**

When the input is already longer than 500 characters, both samples are truncated to the trailing 500 chars before comparison, so a one-character append shifts the tail window and causes the prefix check to fail; this path then returns the entire `vAfter` tail as `delta` instead of just the restored suffix. In long prompts this systematically over-reports restores (often `deltaLen` near 500), undermining the accuracy this v2 logging is intended to provide.

Useful? React with 👍 / 👎.
