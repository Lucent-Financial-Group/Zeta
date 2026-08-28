---
name: PR-thread-resolution class taxonomy — phantom-blocker / outdated-thread / stale-content-deferral / stale-scope-supersede / real-fix / memorial-class-defer / enum-strict-fix (Otto 2026-04-28)
description: Otto 2026-04-28 — meta-observation distilled from 5 consecutive autonomous-loop ticks draining the AceHack PR queue. Six distinct classes of how PR review threads / merge blockers should be resolved, with the discriminating signal for each. Filing as substrate so future-Otto navigates the same queue work efficiently — pick the right class on first read, don't grope through generic "review-and-fix-or-resolve."
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
# PR-thread-resolution class taxonomy (Otto 2026-04-28)

## The six classes

When a PR review thread (or check failure) blocks a merge, the
correct resolution depends on the *class* of blocker, not just
"is it real." Six classes, each with a distinct discriminating
signal and resolution path:

### 1. **Phantom-blocker** — finding describes a state the file isn't in

**Signal:** verify the claim against current file state
(`wc`, `xxd`, `grep`, etc.). If the claim doesn't match, the
finding is wrong (or based on a transient state that no longer
exists).

**Example:** PR #32 budget-snapshot — Copilot claimed
"file is 4 lines, with line 4 empty." `wc -l` reported 3,
`xxd` showed `}\n` with single terminating newline.

**Resolution:** post a verification comment with the
ground-truth check, then resolve the thread. The comment is
the audit trail; resolving without comment looks like
silent-failure.

### 2. **Outdated-thread** — finding was real when filed but my fix-push made it stale

**Signal:** GraphQL `isOutdated: true` on the thread node.
The reviewer flagged a real issue; my push fixed it; the
review-thread machinery hasn't caught up but the resolved
state is verifiable.

**Example:** PR #655 tick-history — Copilot's blank-line
finding was real before my push; my fix removed the blank
lines; thread became outdated.

**Resolution:** resolve directly. The fix-push commit-message
is the audit trail; no extra comment needed.

### 3. **Real-fix** — finding describes an actual current bug

**Signal:** verify against current file state confirms the
issue. The fix is genuinely needed.

**Example:** PR #25 budget-cadence — `actions/checkout@v4`
mutable tag was a real `gha-action-mutable-tag` violation.
PR #72 EAT packet — `**Scope:**` bold-styled labels were a
real §33 lint violation.

**Resolution:** fix the issue, push, resolve thread. The
commit-message describes the fix.

### 4. **Stale-content-deferral** — threads are real but the doc as a whole is stale

**Signal:** the doc's underlying claims have shifted since
write-time, not just the surface details. Fixing the threads
would create a false-fresh artifact misleading future readers.

**Example:** PR #14 cost-parity audit — Copilot/Codex P2s
were individually addressable, but the macOS host-split claim
was now stale (gate.yml matrix changed since #651), public-repo
billing claims were partially wrong (Otto-210 macOS-free).

**Resolution:** defer with explicit reasoning. Right action is
*refresh OR close*, not *fix-and-merge*. Filing the deferral
class is itself substrate work for the maintainer's eventual
review.

### 5. **Stale-scope-supersede** — underlying truth holds but the surface has grown

**Signal:** the PR's intent is correct but its scope is
based on a snapshot of the repo from earlier. The repo has
grown more references since; forward-porting via rebase
produces a half-finished result.

**Example:** PR #29 sister-spelling-fix (17 files, 2026-04-26
state) → PR #73 (57 files, current state).

**Resolution:** close the original with `superseded by #N`
comment, open a fresh-base PR with full current scope.
Cleaner than rebase + half-port.

### 6. **Memorial-class-defer** — autonomous-Otto needs explicit consent for memorial-surface edits

**Signal:** the change touches DEDICATION.md, sister-named
memory files, parental-consent-gated content, or any other
memorial-class surface where the maintainer is the
content-creator.

**Example:** PR #29 deferral on first read — sister-spelling
fix needed Aaron's explicit consent before autonomous merge,
even when the fix was mechanical. (Aaron supplied consent
within minutes; the deferral was still the right shape.)

**Resolution:** defer with explicit memorial-class reasoning.
The deferral *resolves* when the maintainer confirms direction;
quick consent doesn't invalidate the discipline.

### 7. **Enum-strict-fix** — header field has a bare-value-only contract

**Signal:** the lint regex anchors the value (e.g.
`^Operational status: (research-grade|operational)[[:space:]]*$`).
Free-form qualifiers in the value break downstream parsing.

**Example:** PR #72 EAT packet — `Operational status: research-grade absorb; not yet promoted...`
free-form value rejected by enum-strict regex.

**Resolution:** strip qualifying content from the
enum-strict field. Move qualifiers to sibling labels
(`Promotion path:`, `Implementation gate:`, etc.) on
adjacent lines so the substantive content survives.

## How to use

When opening a thread on an open PR:

1. **Verify** the claim against current file state. If the
   claim doesn't match, it's a phantom-blocker.
2. **Check** the thread's `isOutdated` flag via GraphQL. If
   true, my push already addressed it.
3. **Read** the doc as a whole. If the underlying claims have
   shifted, the threads are surface-fixable but the doc is
   stale-content.
4. **Compare** the PR's scope against the current repo state.
   If 2x+ as many references exist now, supersede with
   fresh-base PR.
5. **Identify** memorial-class surfaces (DEDICATION,
   sister-memory, parental-consent-gated). Defer if so.
6. **Identify** enum-strict fields by reading the lint regex.
   If the field is bare-value-only, move qualifiers to siblings.
7. **Default** to real-fix if none of the above apply.

## Composes with

- Aaron's manufactured-patience correction 2026-04-27 — the
  classes are the *replacement* for "wait for Aaron"; each
  class is a specific path that *isn't* idle-status-polling.
- The self-check calibration memory 2026-04-27 — varies the
  work; this taxonomy is the granularity of "what variation
  to pick when a thread fires."
- Otto-279 closed-list-history-surface — memorial-class is a
  subset of what the carve-out protects.

## What this does NOT do

- **Does NOT mechanize the classification.** The discriminating
  signal still requires judgment on the specific PR. The
  taxonomy makes the judgment efficient, not automatic.
- **Does NOT cover every blocker.** Build/test failures are
  real-fix; required-reviewer absence is a different class
  not yet observed in this session. Add new classes as they
  fire.
