---
pr_number: 3974
title: "backlog(B-0583): cross-machine account-scoped scarcity bus \u2014 refine B-0570 substrate location"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-16T23:31:43Z"
merged_at: "2026-05-17T00:15:11Z"
closed_at: "2026-05-17T00:15:11Z"
head_ref: "backlog/b-0583-cross-machine-account-scoped-scarcity-bus-2026-05-16"
base_ref: "main"
archived_at: "2026-05-17T01:13:19Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3974: backlog(B-0583): cross-machine account-scoped scarcity bus — refine B-0570 substrate location

## PR description

## Summary

Refines B-0570 (scarcity tracker) substrate location after Aaron's 2026-05-16 correction: rate-limit is account-scoped (tied to AceHack), not agent-scoped; cross-machine matters because Otto-CLI on Aaron's laptop + ServiceTitan-replicated Otto share the same bucket.

## Why

Per-agent-named files mis-frame the partition key. Machine-local /tmp/zeta-bus is insufficient for cross-machine visibility. GitHub-branch-as-bus is sharper but hits the Copilot review cost trap from enterprise ruleset #16490134 (`review_on_push: true` on ~ALL repos = burns premium requests on minute-cron pushes).

## Design space (options in row body)

- Machine-local /tmp/zeta-bus/scarcity-<ts>.json — single-machine only
- Long-lived LFG branch with ruleset carve-out for Copilot review
- Sidecar repo (LFG/Zeta-bus) without enterprise ruleset
- GitHub Action cron writes single state file
- Gist with append-only updates

Each has trade-offs; row body weighs them. Aaron's explicit framing: 'we can build and try a few different things' — authorizes experimentation rather than pre-commits.

## Composes with

- [B-0570](https://github.com/Lucent-Financial-Group/Zeta/pull/3950) (scarcity tracker — REFINES substrate location, keeps tracker logic)
- B-0400 (bus protocol)
- [B-0571](https://github.com/Lucent-Financial-Group/Zeta/pull/3951) (GitHub App — separate pool that would also be tracked)
- [B-0580](https://github.com/Lucent-Financial-Group/Zeta/pull/3957) (Enterprise ruleset — the cost trap to navigate)
- [B-0582](https://github.com/Lucent-Financial-Group/Zeta/pull/3964) (destructive-verb gate — adjacent infrastructure)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-16T23:36:33Z)

## Pull request overview

Adds backlog row B-0583 refining B-0570's substrate location: the scarcity tracker should be account-scoped (not agent-scoped) and cross-machine visible, with a design-space exploration of bus surface options.

**Changes:**
- New per-row file `docs/backlog/P2/B-0583-*.md` documenting the refinement, design space, acceptance criteria, and open questions.
- Generated index entry added to `docs/BACKLOG.md` under P2.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0583-cross-machine-account-scoped-scarcity-bus-2026-05-16.md | New P2 backlog row refining B-0570 substrate location for cross-machine, account-scoped scarcity tracking. |
| docs/BACKLOG.md | Adds the generated index entry for B-0583 under the P2 section. |

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T00:13:59Z)

## Pull request overview

Copilot reviewed 2 out of 2 changed files in this pull request and generated no new comments.
