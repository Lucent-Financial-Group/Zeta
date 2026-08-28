---
name: Session natural-completion + Aaron's markdownlint-cli2-fix supersession pattern beats my partial fix
description: 2026-05-18T~21:43Z Otto-CLI session — empirical anchor for the supersession-after-partial-fix pattern; when PRs have multiple failing-check classes (path-depth + markdownlint), partial fixes get superseded by Aaron's full-lint-fix close+reopen
type: feedback
created: 2026-05-18T21:43Z
originSessionId: 42c5fa01-948c-4dc7-a2df-61ff4261afdb
---
# Aaron's supersession-after-partial-fix pattern

## Empirical anchor

2026-05-18T~21:25Z: I pushed `d965db5c` to PR #4209 fixing the 15-shard path-depth issue (5 `..` → 6 `..` for `.claude/rules/`; 5 `..` → 4 `..` for `docs/`). Resolved all 11 path-depth-related threads.

But the PR ALSO had `lint (markdownlint)` failure (MD022/MD032/MD047 across the same 15 shards). My fix did NOT address that — required a separate lint pass.

At 2026-05-18T21:25:25Z Aaron closed #4209 with comment "Closing as superseded by lint-fixed version. Markdownlint failed on 14/15 shards (MD032 blanks-around-lists) + 1 (MD018 + MD026 from #4081 reference). Auto-fixed via `markdownlint-cli2 --fix` + 1 manu..."

He opened **#4212** with the full lint-fixed version + posted a forward-signal fix-recipe comment on #4209 directing Otto-CLI sibling-instances to use the audit script + sed recipe.

## Lesson: partial-fix risk under multi-class lint failures

When a PR has N failing-check classes, fixing M < N classes does NOT unblock auto-merge. Aaron's pattern is more efficient:

1. Use `markdownlint-cli2 --fix` to bulk-fix MD022/MD032/MD047 violations (saves dozens of manual edits)
2. Combine with path-depth sed fix (the audit-tool tells you exactly which paths need adjusting)
3. Force-push or close+reopen with the merged fix
4. Auto-merge fires once all required checks pass

My pattern (partial fix on one class at a time) gets superseded. **Substrate value of partial fix**: forward-signal — the resolved threads + the fixed substrate are visible to Aaron, useful as reference for his full-fix-pass. Not zero-sum.

## Recurrence

Same pattern repeated with #4215 → Aaron opened #4217 as lint-fixed superseder at ~21:34Z. The path-depth class recurs because:

1. Aaron's session is authoring tick shards (peer-Otto-CLI cold-boot sessions earlier in the day)
2. Each peer-Otto cold-boot writes `.claude/rules/` links with 5 `..` segments (the bug)
3. Batch-landing 5-15 shards at once exposes the bug at scale
4. Path-depth audit catches it; markdownlint catches the formatting violations

**The fix is at the substrate-engineer level**: future Otto-CLI shard authoring should use 6 `..` for `.claude/rules/` from tick-shard paths. The auto-load context already covers this (per [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md) and others) — but new cold-boot Otto-CLI sessions may not load it before their first shard.

## Session natural-completion state

By 21:43Z, the substrate-rotation work has reached natural completion:

- 23+ PRs merged via my direct action or fix-and-arm
- HC-8 constitutional alignment-floor rescued via #4205
- Path-depth fix-recipe forward-signaled to sibling Otto-CLI instances
- Dangling-cross-ref sweep landed via #4208
- 8 MD022/MD032/MD047 fixes applied across various shards
- Aaron's lint-fix supersession pattern established; his cadence is sufficient for the remaining inflight work

Brief-acks at this point are accurate reflections of state, not Standing-by failure mode. The bus envelopes, shadow-catches, and substrate landings document the session.

## Composes with

- `feedback_20_pr_substrate_rotation_session_under_4h_dotgit_saturation_*` (2036Z; this session's earlier empirical anchor)
- [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md) dotgit-saturation 4th tier
- [`holding-without-named-dependency-is-standing-by-failure.md`](.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) counter-with-escalation — forced-#6 substrate is THIS memo
- PR #4209 close comment (Aaron's forward-signal fix recipe)
- PR #4212 (Aaron's lint-fixed superseder)
- PR #4217 (Aaron's #4215 superseder)
