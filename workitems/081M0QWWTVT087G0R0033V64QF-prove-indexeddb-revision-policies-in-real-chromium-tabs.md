---
id: 081M0QWWTVT087G0R0033V64QF
type: task
state: backlog
priority: P2
slug: prove-indexeddb-revision-policies-in-real-chromium-tabs
title: "Prove IndexedDB revision policies in real Chromium tabs"
created: 2026-08-23T18:07:32.218Z
depends_on: []
composes_with: []
---

# Prove IndexedDB revision policies in real Chromium tabs

## Context

The native IndexedDB checkpoint adapter currently embeds monotone
last-writer-wins revision handling, while the in-memory adapter uses strict
compare-and-swap. Both behaviors are intentional, but the native adapter does
not expose the choice through its hexagonal boundary and the policy difference
is not exercised against real browser transactions.

## Acceptance

- `NativeIndexedDbCheckpointOptions` accepts an injected `RevisionPolicyPort`.
- Omitting the policy preserves monotone last-writer-wins behavior.
- One deterministic transcript runs the same history in two real Chromium tabs
  against compare-and-swap and monotone last-writer-wins.
- Both policies serialize a concurrent same-revision fork to one accepted write
  and one typed revision conflict.
- The transcript demonstrates the intentional difference for revision gaps and
  recreation after deletion.
- Failures are returned as typed feedback and the transcript validator rejects
  a missing policy or a falsified compare-and-swap result.

## Verification

- `bun test src/Core.TypeScript/browser-node/browser-revision-policy-smoke.test.ts`
- `bun run test:browser-revision-policy`
- `bunx tsc --noEmit --pretty false`
- `bun run lint:typescript`
