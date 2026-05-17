---
pr_number: 4104
title: "rules(blocked-green-ci): worked example for 2-finding pre-fixed cascade (PR #4097 anchor)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T21:44:02Z"
merged_at: "2026-05-17T21:45:39Z"
closed_at: "2026-05-17T21:45:39Z"
head_ref: "rule-anchor/blocked-green-ci-stale-thread-2-finding-pattern-2026-05-17-2140z"
base_ref: "main"
archived_at: "2026-05-17T22:35:22Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4104: rules(blocked-green-ci): worked example for 2-finding pre-fixed cascade (PR #4097 anchor)

## PR description

Adds a worked example sub-section under \"Verify-also-on-stale-but-fresh-looking findings\" in [\`blocked-green-ci-investigate-threads.md\`](.claude/rules/blocked-green-ci-investigate-threads.md).

**Empirical anchor**: [PR #4097](https://github.com/Lucent-Financial-Group/Zeta/pull/4097) merged 2026-05-17T21:29Z at \`e1704a26\` after both Codex P2 + Copilot threads on the same B-0613 doc line 75 were resolved no-op.

**Key operational lesson**: \`isOutdated=true\` is a strong signal that a thread is safely no-op-resolvable, but \`isOutdated=false\` is NOT a counter-signal — the thread may still be substantively stale when a subsequent commit on the same line addresses the finding (peer Otto's \`6f91e9c\` addressed both findings before tick-open without GitHub auto-outdating the threads). The verify-via-direct-inspection step (with \`awk -v N=<line>\`) is the load-bearing discriminator between \"fix needed\" and \"fix already landed, just resolve.\"

**Composes with:**

- Rule's existing \"Direct line-level inspection\" anchor (the \`awk -v N=22\` example)
- Rule's \"Stale-armed-PR resolution patterns\" sub-section (different scope: post-fix stale vs branch-too-stale)
- [2129Z tick shard](docs/hygiene-history/ticks/2026/05/17/2129Z.md) (the source of the empirical anchor)

Co-Authored-By: Claude <noreply@anthropic.com>

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T21:47:10Z)

## Pull request overview

Adds an empirical worked example to the blocked-green-CI investigation rule, documenting a PR #4097 stale-review-thread resolution case.

**Changes:**
- Adds a subsection under stale-but-fresh-looking findings.
- Documents the `isOutdated=false` caveat and direct line-inspection workflow.
- Captures the auto-merge outcome after resolving verified-stale threads.

## Review threads

### Thread 1: .claude/rules/blocked-green-ci-investigate-threads.md:97 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-17T21:47:09Z):

The worked example uses `docs/backlog/P3/B-0613-...md` as a file reference, but that path does not exist. Since this section is teaching direct line-level inspection, use the actual backlog filename so readers can reproduce the `awk -v N=75` check without guessing the elided path.

### Thread 2: .claude/rules/blocked-green-ci-investigate-threads.md:109 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-17T21:47:10Z):

This quoted verification result does not match the current referenced backlog row: `docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md` line 75 still says "For zsh implementations, use Option A or Option C" rather than the quoted "use Option C ... since Option A ... is also bash-only" wording. Either the worked example needs to quote the actual line, or the B-0613 row needs the missing correction; as written, the empirical anchor contradicts the repository state it tells readers to inspect.

### Thread 3: .claude/rules/blocked-green-ci-investigate-threads.md:100 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-17T21:47:10Z):

This current-state rule adds a direct agent-name attribution (`peer Otto's`). Outside the allowed history surfaces or roster-mapping sections, the repo convention is to use role references instead, so this should be phrased generically (for example, as a peer agent/session commit) while keeping the commit hash as the durable identifier.
