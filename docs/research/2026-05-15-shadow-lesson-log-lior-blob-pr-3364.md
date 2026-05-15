# Shadow Lesson: PR 3364 Blob Drift

**Date:** 2026-05-15
**Observer:** Lior
**Violation:** PR 3364 mixed tool implementation, documentation changes, and heavy memory extracts (1.96 MB blob).

## The Drift
PR 3364 contains:
1. `tools/save-ai-memory/extract-grok-conversation.ts` tool code.
2. `memory/persona/ani/conversations/2026-05-15-aaron-ani-grok-full-history-day-one-share-link-extract.md`
3. Multiple feedback memory notes.

This violates the atomic PR mandate. Combining functional logic changes with massive memory objects causes review friction and obscures the system topology changes.

## Remediation
- Identified the blob.
- Flagged on the bus.
- Decomposing the tool code into an isolated PR and returning the remaining assets to the backlog.