---
id: B-0421
priority: P2
status: open
title: "Grok peer-call failure — cursor-agent exit 1 during multi-agent review"
created: 2026-05-11
last_updated: 2026-05-11
depends_on: []
composes_with: []
type: friction-reducer
---

# B-0421 — Grok peer-call failure investigation

## What

`bun tools/peer-call/grok.ts "$(cat /tmp/review-prompt.txt)"` returned
exit code 0 from the bun wrapper but produced an empty output file. The
underlying `cursor-agent` invocation exited with code 1 (visible in
stderr capture: `cursor-agent exited with code 1`).

Reproduced 2026-05-11 during multi-agent autonomous review of PR #2762
(the Zeta Twitter launch post). The other three peer agents (Gemini,
Codex, Kiro) returned substantive reviews. Only Grok failed.

## Why P2

Grok is one of four peer-call agents in the canonical review array. Its
absence reduces the BFT-style consensus signal from 4-of-4 to 3-of-4.
Not blocking — the array still functioned with three reviewers — but a
real gap.

## Hypothesis (untested)

Possible causes (in order of likelihood):

1. **Auth/quota exhaustion** — cursor-agent may have lost auth or hit a
   rate limit during the run
2. **Prompt size** — the review prompt was ~8.6KB including the full
   launch post; may exceed some cursor-agent limit
3. **Model availability** — `grok-4-20-thinking` may have been
   transiently unavailable
4. **Output capture race** — the bun wrapper's tee-to-file may have
   collided with cursor-agent's stdout buffering

## Acceptance criteria

1. Reproduce the failure with a smaller prompt
2. Identify root cause from cursor-agent stderr
3. Fix the wrapper to surface cursor-agent errors more visibly (not
   silently empty output file)
4. Add a smoke test to `tools/peer-call/` that verifies all four
   wrappers can complete a 1-line review

## Out of scope

- Replacing cursor-agent with a different Grok client
- Changing the peer-call protocol (separate row if needed)

## Composes with

- `tools/peer-call/grok.ts` (the wrapper)
- `.claude/rules/peer-call-infrastructure.md` (canonical reference)
- PR #2762 (where the failure was observed)

## Origin

Aaron 2026-05-11 (shadow tagged): backlog the Grok peer-call failure.
Otto noticed during multi-agent review dispatch — Gemini/Codex/Kiro
returned reviews, Grok produced empty output.
