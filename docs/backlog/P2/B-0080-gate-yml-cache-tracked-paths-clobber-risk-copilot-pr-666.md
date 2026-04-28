---
id: B-0080
priority: P2
status: open
title: gate.yml cache step uses tracked repo paths (`tools/tla`, `tools/alloy`) — Copilot P1 on PR #666
effort: S
ask: refactor cache step to use a non-tracked path OR add a guard step to verify tracked-file invariance before restore
created: 2026-04-28
last_updated: 2026-04-28
tags: [pr-666, copilot, gate-yml, cache, deferred]
---

# B-0080 — gate.yml cache step clobber risk

## Source

Copilot P1 on PR #666 (3 threads on the same step):

> The `actions/cache@...` step for verifier jars has `path: tools/tla / tools/alloy`. Both directories contain tracked repo sources (`tools/alloy/AlloyRunner.java`, `tools/alloy/specs/*.als`, `tools/tla/*.tla`). Cache restore can clobber PR-changed files in those directories since the cache key only busts on `tools/setup/manifests/verifiers` hash.

## Pre-existing in LFG main

Verified via `git diff origin/main -- .github/workflows/gate.yml` on PR #666 — the cache step is identical on both sides. PR #666's surgical edit only touched the matrix-setup OS list. This is an inherited concern, not introduced by #666.

## Two fix options

1. **Move jars to a cache-only path:** download to `~/.cache/zeta-verifiers/{tla2tools.jar, alloy.jar}` instead of in-tree. Update `tools/setup/common/verifiers.sh` to point install.sh at the new path; update Alloy/TLA invocations to read from there.
2. **Add a guard step:** before cache restore, snapshot the tracked-file SHAs in `tools/tla/specs/*` and `tools/alloy/{AlloyRunner.java,specs/*}`; after restore, verify they match. Fail fast on mismatch.

Option 1 is cleaner long-term (separation: cache = scratch, repo = tracked). Option 2 is a quick guard that preserves the current install.sh layout.

## Why P2 not P0/P1

No incident has occurred yet — the verifiers manifest hash key probably never collides with a PR that touches `tools/alloy/AlloyRunner.java` AND keeps the manifest hash stable. But the structural risk is real: a PR touching only `AlloyRunner.java` would NOT bust the cache, and a stale cache could overwrite the in-flight change.

## Acceptance

- [ ] Decide between option 1 (move-to-cache-path) or option 2 (guard step)
- [ ] Implement on AceHack first (per forward-sync canonical-direction)
- [ ] Forward-sync to LFG
- [ ] Verify by running a test PR that touches `tools/alloy/AlloyRunner.java` — cache should either bust correctly or guard should fail fast

## Composes with

- PR #666 (where Copilot surfaced this)
- B-0077..B-0079 (sibling Codex deferrals on PR #663 — same forward-sync-canonical-content principle)
