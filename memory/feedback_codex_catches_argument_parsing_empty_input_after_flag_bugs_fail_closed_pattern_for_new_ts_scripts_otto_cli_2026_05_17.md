---
name: Codex catches empty-input-after-flag arg-parsing bugs; fail-closed by default
description: Empirical from PR #3990 — Codex P1 caught `--files` with zero paths falling through to full-tree scan. New TS scripts should fail-closed on empty-input-after-flag by default.
type: feedback
created: 2026-05-17
originSessionId: 89704f27-73c5-4b05-b253-3aff806ab1b6
---
Empirical from 2026-05-17 autonomous-loop session, PR [#3990](https://github.com/Lucent-Financial-Group/Zeta/pull/3990) (`tools/hygiene/add-pipe-row-header.ts`).

**The bug pattern:** the script accepted `--files <paths...>` to restrict to specific shards, with a fallback to full-tree scan when no `--files` was provided. The naïve implementation tracked `inFiles: boolean` and `files: string[]`, then branched on `files.length > 0`. If a caller passed `--files` with zero paths after it (typo, empty dynamically-generated list, shell-glob that matched nothing), the script SILENTLY fell through to full-tree scan. In `--write` mode this would have prepended pipe-row headers across all 359 non-compliant shards — a high-impact unintended bulk rewrite.

**Codex's catch (P1 review thread on PR #3990):**

> The `--files` mode is documented as a restriction, but when `--files` is present and no paths are parsed, this branch silently falls back to scanning the entire shard tree. In `--write` mode, a caller typo or an empty dynamically-generated file list will prepend headers across all shards instead of doing a no-op/error, which is a high-impact unintended bulk rewrite. Treating `--files` with zero paths as an explicit error (or zero-target run) would prevent this.

**The fix shape:** track `filesFlagSeen: boolean` SEPARATELY from the accumulated `files: string[]`. The branching condition becomes `if (filesFlagSeen)` (was: `if (files.length > 0)`). Then explicitly fail-closed when `filesFlagSeen && files.length === 0`:

```ts
if (filesFlagSeen && files.length === 0) {
  process.stderr.write(
    "error: --files specified but no paths provided; refusing to fall back to full-tree scan\n",
  );
  return 1;
}
```

**Why:** Code that:

- (a) takes a restriction-flag with a list payload
- (b) falls back to broad-default when the flag is absent
- (c) does destructive operations under another flag (`--write` / `--apply` / `--delete`)

...is structurally vulnerable to "empty list under flag" silent broadening. The fail-closed pattern catches it.

**How to apply (operational discipline for future-Otto authoring new TS scripts):**

1. When a flag introduces a list-payload restriction (e.g., `--files`, `--items`, `--targets`), track the flag's presence independently from the payload count.
2. The restriction branch should fire on the FLAG being seen, not the payload being non-empty.
3. If flag-seen AND payload-empty: fail-closed with explicit error. Default behaviour should never broaden silently.
4. Especially when there's a `--write` / `--apply` / destructive-mode flag in the same script.
5. Static-analysis-AI (Codex / Copilot) catches this class reliably. Welcome the catch; don't treat as nitpick.

**Composes with:**

- [`.claude/rules/blocked-green-ci-investigate-threads.md`](../../Documents/src/repos/Zeta/.claude/rules/blocked-green-ci-investigate-threads.md) — verify-before-fix on reviewer findings; this finding was REAL and verified.
- [`.claude/rules/hooks-as-immune-system`](MEMORY.md) lineage (`feedback_aaron_hooks_as_immune_system_pr_review_findings_to_codified_hooks_no_human_can_remember_2026_05_15.md`) — if this pattern recurs, codify into a hook or lint rule. Single instance today; threshold is 2+ instances per the empirical-FP-class promotion rule.
- [`docs/backlog/P2/B-0529-tick-shard-schema-validator-vs-practice-drift-2026-05-15.md`](../../Documents/src/repos/Zeta/docs/backlog/P2/B-0529-tick-shard-schema-validator-vs-practice-drift-2026-05-15.md) — the row this script ships under; the script's `--files` arg-parser is the substrate that surfaced the failure mode.

**Future-Otto operational test:** when writing a new TS script with a `--files` / `--items` / `--targets` flag in the next several sessions, default to the fail-closed pattern from the start. Don't wait for Codex to catch it.

**Substrate-honest framing:** Codex caught this in commit `9df78b2`'s push; fixed in commit `88666d8` within the same session, 1 cron tick later. Substrate-quality improved without merge-friction. The asymmetric-critic-AI (Codex as static reviewer) operated correctly; the operating discipline absorbed the catch.
