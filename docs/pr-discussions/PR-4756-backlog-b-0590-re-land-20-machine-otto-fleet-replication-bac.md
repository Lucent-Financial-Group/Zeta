---
pr_number: 4756
title: "backlog(B-0590): RE-LAND 20-machine Otto fleet replication backlog row (supersedes stale #3986)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T19:17:05Z"
merged_at: "2026-05-23T19:18:56Z"
closed_at: "2026-05-23T19:18:56Z"
head_ref: "otto/cli-reland-b0590-fleet-replication-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4756: backlog(B-0590): RE-LAND 20-machine Otto fleet replication backlog row (supersedes stale #3986)

## PR description

## Summary

Re-lands **B-0590** (20-machine Otto fleet replication + bare-metal OS install via KVM mini-PCs) from stale PR #3986 (7 days old, DIRTY, 0 unresolved threads but unable to merge).

Per [`blocked-green-ci-investigate-threads.md`](.claude/rules/blocked-green-ci-investigate-threads.md) stale-armed-PR resolution decision tree:
- Substrate on main? **NO** (B-0590 row not on main)
- Small enough to re-land? **YES** (1 substantive file + auto-regenerated BACKLOG.md index)
- → **RE-LAND VIA CHERRY-PICK**

## What's in this PR

- `docs/backlog/P2/B-0590-fleet-replication-20-machines-bare-metal-os-install-kvm-mini-pcs-2026-05-16.md` — full backlog row content captures all 3 original PR commits collapsed (initial row + Copilot review fixes + MD047 trailing-newline fix)
- `docs/BACKLOG.md` — regenerated index via `bun tools/backlog/generate-index.ts`

## Composes with

- Original PR #3986 (this re-land supersedes it)
- B-0590 (the backlog row itself)
- PR #4754 (re-land of B-0581 — same pattern; sibling stale-PR rescue)
- Operator's 2026-05-23 invitation to triage old PRs in coordination with Lior

## Test plan

- [x] Cherry-pick succeeded (DU conflict resolved by taking PR-branch version)
- [x] File content matches PR #3986 head (3 commits collapsed via conflict resolution)
- [x] BACKLOG.md regenerated
- [x] Branch matches `ZETA_EXPECTED_BRANCH` guard
- [ ] CI green

Next step after merge: close #3986 with cross-link.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-23T19:17:09Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
