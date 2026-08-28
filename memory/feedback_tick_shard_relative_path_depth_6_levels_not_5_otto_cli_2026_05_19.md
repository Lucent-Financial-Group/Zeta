---
name: Tick shard relative paths need 6 levels of ../ to reach repo-root, NOT 5
description: Empirical anchor 2026-05-19 — tick shards at `docs/hygiene-history/ticks/YYYY/MM/DD/X.md` are 6 levels deep; relative links to `.claude/rules/` or any repo-root surface need 6 `../` segments, not 5. PR #4343 (my 0608Z shard) introduced 10 broken links using 5 `../`; PR #4357 (peer Otto-CLI 0803Z shard) inherited the same pattern with 3 broken links. Peer-Otto-authored PR #4358 fixed both via the `audit-tick-shard-relative-paths` lint check. Future-Otto cold-boot writing tick shards: count the path depth explicitly before authoring relative links; do NOT default to 5 segments by pattern-match.
type: feedback
created: 2026-05-19
originSessionId: cf61b600-c393-47eb-abb2-bf4cab3e0146
---
# Tick shard relative-path depth — 6 levels, not 5

## Failure-mode anchor

Tick shard canonical path: `docs/hygiene-history/ticks/YYYY/MM/DD/X.md`

Depth components (from repo root): `docs/` (1) + `hygiene-history/` (2) + `ticks/` (3) + `YYYY/` (4) + `MM/` (5) + `DD/` (6) → file at depth 6.

Therefore relative links from the shard to repo-root surfaces (e.g., `.claude/rules/<rule>.md`) need:

```
[link text](../../../../../../.claude/rules/<rule>.md)
                ^6 segments of ../^
```

My 0608Z shard PR #4343 used **5 segments**, producing 10 broken links. Peer Otto-CLI 0803Z shard PR #4357 inherited the same pattern with 3 broken links. Aaron + peer Otto authored fix PR #4358 with corrected 6 segments.

## How the lint check catches it

`tools/hygiene/audit-tick-shard-relative-paths.ts` (or equivalent) validates relative-path depth against actual filesystem. The check is non-required (didn't block CI), so the broken links merged. Composes with PR-thread-resolve discipline if the lint becomes required.

## Future-Otto operational rule

Before authoring a tick shard with any relative link to repo-root surface (rule, doc, memory, etc.):

1. **Count the path depth explicitly**: `docs/hygiene-history/ticks/YYYY/MM/DD/X.md` = 6 levels
2. **Use 6 `../` segments** for repo-root surfaces, NOT 5
3. **OR use absolute repo paths** via `https://github.com/Lucent-Financial-Group/Zeta/blob/main/...` (no path-depth dependency)
4. **OR use bare paths** if the lint check accepts them (e.g., `.claude/rules/X.md` — depends on local lint conf)

The safest pattern under uncertainty is option 3 (absolute GitHub URL) — works regardless of file location, doesn't break on file moves, and renders identically in GitHub UI.

## Compositional anchor

My 0608Z shard was 135 lines of substrate-engineering substance with 10 path-depth errors. Future-Otto cold-boot writing similar shards should:

- Treat the content discipline (substrate-engineering findings + counter-with-escalation trace) as load-bearing — that landed correctly
- Treat the path-depth lint as a checkable artifact at PR-create time — easy to verify locally before push if Pure-git tier permits (GraphQL-independent)

## Composes with

- [`.claude/rules/tick-must-never-stop.md`](../../Documents/src/repos/Zeta/.claude/rules/tick-must-never-stop.md) — tick shard canonical path
- `tools/hygiene/audit-tick-shard-relative-paths.ts` — the lint check that catches this class of error
- `feedback_otto_cli_cold_boot_0608z_maji_shadow_critique_acknowledged_15_peer_3_lior_saturation_no_worktree_2026_05_19.md` — the session that produced the failure-mode anchor
- `feedback_post_session_arc_completion_brief_ack_six_recursion_termination_natural_wait_state_not_failure_mode_otto_cli_2026_05_19.md` — same session arc; this memo is a sibling lint-failure-mode anchor

The fire is watched. Future tick shards count path-depth before linking.
