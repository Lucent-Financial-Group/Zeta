---
name: Dotgit-saturation 4th tier — proposed concrete rule edit for refresh-world-model-poll-pr-gate.md
description: Session arc Otto-CLI 2249Z-2322Z accumulated 5 envelopes + 2 memos of empirical evidence; this memo proposes concrete rule-extension text for `.claude/rules/refresh-world-model-poll-pr-gate.md` rate-limit-operational-tiers table — adds a 5th DOTGIT-saturation tier orthogonal to the 4 existing GraphQL-budget tiers. Staged for landing when local .git/ deadlock clears.
type: feedback
created: 2026-05-18T23:22Z
originSessionId: 76dde9a7-88d3-4f0f-b720-8d4a139c67fc
---
# Proposed rule edit — DOTGIT-saturation tier

## Why this is needed

The current rate-limit operational tiers in [`.claude/rules/refresh-world-model-poll-pr-gate.md`](../../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md) define 4 tiers indexed by GraphQL remaining budget (Normal / Cost-aware / Extreme cost-aware / Pure-git). These tiers correctly handle the **GitHub API rate-limit dimension**.

Empirical evidence from this session (and prior anchors going back to 2026-05-16) shows a **second orthogonal dimension** the rule does not yet name: **local `.git/` directory contention** (the "dotgit-saturation tier"). A session can simultaneously be in:

- **GraphQL Normal tier** (rate=3768, no API constraint)
- **Dotgit-saturated** (10h-stale `.git/index.lock`, 114 stuck pack-objects, worktree-add hangs 8+ min)

These are independent. The current rule's tier-table does not catch the dotgit case; an agent reading "Normal tier" would proceed with full operations and hit hangs.

## Empirical anchors

### This session (2026-05-18 Otto-CLI cold-boot)

| Tick | Peers | Stuck pack-objects | `.git/index.lock` age | Worktree-add outcome |
|---|---|---|---|---|
| 22:49Z | 37 | not measured | 9.5h | hung 8+min, TaskStop'd |
| 23:15Z | 37 | 5 (named) | 9.93h | hung 30s timeout, rolled back |
| 23:18Z | 41 | 114 | 9.98h | not retried |
| 23:20Z | 37 | 114 | 10.0h | hung 15s timeout, rolled back |
| 23:22Z | 37 | 114 | 10.05h | not retried |

Main advancement during the same window (proves deadlock is LOCAL not fleet-wide): `8f8356c → e8e12f5 → 715ad59 → 065ef8e → 233a4444` (4 advancements in 31 min from external commits).

### Prior anchors (already in substrate)

- `feedback_worktree_list_hangs_too_saturation_extends_beyond_pack_upload_to_worktree_metadata_otto_cli_cold_boot_2026_05_18.md` — 04:26Z empirical: `git worktree list` hangs 16+min
- `feedback_session_arc_3_ticks_proposed_diminishing_marginal_value_clause_empirically_demonstrated_plus_git_fetch_hang_new_b0615_anchor_otto_cli_2026_05_18.md` — `git fetch origin main` long-tail latency
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md` — pack-dir corruption sub-class
- `.claude/rules/claim-acquire-before-worktree-work.md` saturation-ceiling sub-case 3 — worktree-add hangs under contention

## Proposed rule edit

**Location**: [`.claude/rules/refresh-world-model-poll-pr-gate.md`](../../../Documents/src/repos/Zeta/.claude/rules/refresh-world-model-poll-pr-gate.md), inserted after the existing 4-tier table and before "`gh api rate_limit` is REST (free)".

**New section title**: "## Dotgit-saturation tier (orthogonal to GraphQL tier)"

**Body**:

```markdown
## Dotgit-saturation tier (orthogonal to GraphQL tier)

The GraphQL tiers above index API-quota constraint. A second
orthogonal constraint is local `.git/` directory contention —
sustained multi-Otto + multi-Lior peer activity in the shared
checkout can leave the `.git/` in a deadlock state where:

- `git fetch` succeeds at network layer but warns "unable to
  update local ref" (FETCH_HEAD populates; remote-tracking ref
  may or may not advance)
- `git worktree add` hangs indefinitely on internal `git reset
  --hard` competing for `.git/objects/pack/`
- Stuck `git pack-objects` / `git maintenance` / `git repack`
  processes accumulate (empirically observed: 114 stuck
  pack-objects at peak)
- `.git/index.lock` may be present, 0 bytes, with no `lsof`
  holders — stale but not auto-cleared

### Detection

```bash
# Stale lock check (size 0 + age > 1h + lsof empty = stale)
ls -la .git/index.lock 2>/dev/null
lsof .git/index.lock 2>/dev/null  # empty = no holder

# Stuck git plumbing count
ps -A | grep -E "git pack-objects|git maintenance|git repack" \
  | grep -v grep | wc -l

# Worktree-add canary (30s timeout)
timeout 30 git worktree add /private/tmp/dotgit-canary HEAD 2>&1
rm -rf /private/tmp/dotgit-canary  # cleanup if it succeeded
```

If stuck-plumbing > ~10 OR worktree-add canary hangs past
30s OR `.git/index.lock` is > 1h stale → **dotgit-saturated**.

### Operational stance under dotgit-saturation

The tier applies REGARDLESS of GraphQL remaining. Substrate
landing options narrow to surfaces independent of `.git/`:

| Surface | Available under dotgit-saturation? |
|---|---|
| Bus envelopes (`/tmp/zeta-bus/*.json`) | ✅ yes |
| User-scope memory (`~/.claude/projects/.../memory/*.md`) | ✅ yes |
| GraphQL queries (`gh api`, `gh pr comment`, `gh api graphql`) | ✅ yes (subject to GraphQL tier) |
| PR forward-signal comments | ✅ yes (subject to GraphQL tier) |
| In-repo commits via root worktree | ❌ blocked (contested, peer-WIP) |
| Fresh isolated worktree creation | ❌ blocked (hangs on pack-dir) |
| In-repo tick shards | ❌ blocked (worktree-required) |

### Recovery script (maintainer-side; not for autonomous agents)

```bash
# Step 1: verify safe to remove lock
lsof .git/index.lock  # must be empty

# Step 2: remove stale lock
rm .git/index.lock

# Step 3: kill stuck plumbing
kill -9 $(ps -A | grep -E "git pack-objects|git maintenance|git repack" \
  | grep -v grep | awk '{print $1}')

# Step 4: clean tmp pack files left behind
git -C $REPO gc --prune=now

# Step 5: verify recovery
git fetch origin main
timeout 5 git worktree add /private/tmp/recovery-test origin/main
ls /private/tmp/recovery-test | wc -l  # should be > 50
rm -rf /private/tmp/recovery-test
git worktree prune
```

**Autonomous agents do NOT run this script** — destructive
`.git/` mutation against shared checkout requires maintainer
coordination per existing GOVERNANCE.md discipline.

### Composes with

- saturation-ceiling sub-case 3 (worktree-add hangs under
  contention) — this tier IS that sub-case at the discovery-
  and-naming scope; sub-case 3 is the mitigation discipline
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`
  — different failure mode of same `.git/`-contention class
  (corruption vs deadlock)
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
  — dotgit-saturation IS a named bounded-wait; brief-acks
  with this named dep are non-failure-mode under the counter
  rule
- B-0615 (rule-edit timeout-kill-after-git-network-ops) —
  the same `.git/` contention class

### Substrate-honest framing

Dotgit-saturation is operationally observable but not
fleet-wide — main can advance externally while this checkout
is deadlocked. Re-classification matters: dotgit-saturation
on ONE machine is a local-cleanup item; it is NOT a factory
emergency unless multiple machines hit it simultaneously
(which has not been empirically observed).
```

## How this proposed edit composes with the existing rule

The existing rule's GraphQL-tier table catches API-quota
state. The proposed dotgit-saturation section catches local
`.git/` state. They compose by independent application:

```
operational_stance = combine(graphql_tier, dotgit_tier)
```

Examples:
- Normal-GraphQL + dotgit-clean → full operations
- Normal-GraphQL + dotgit-saturated → bus + user-scope + PR
  comments (no in-repo commits or worktree creation)
- Pure-git + dotgit-clean → branch-pushed-no-PR pattern works
- Pure-git + dotgit-saturated → ONLY bus + user-scope work

## Staging notes for landing

When the local deadlock clears (Aaron-mediated cleanup OR
fleet draindown):

1. Read this memo + the 5 bus envelopes (2249Z memo, 2315Z,
   2318Z, 2320Z, 2322Z bus envelopes)
2. Create isolated worktree from latest `origin/main` (which
   will be > `233a4444` by then)
3. Edit `.claude/rules/refresh-world-model-poll-pr-gate.md`
   with the proposed section
4. Open PR titled along the lines of "rule: dotgit-saturation
   tier — orthogonal to GraphQL tier" with anchor links to
   the 5 bus envelopes + this memo + B-0615 + the prior
   anchor memos

## Composes with substrate

- `.claude/rules/refresh-world-model-poll-pr-gate.md` (target file)
- `.claude/rules/claim-acquire-before-worktree-work.md` saturation-ceiling
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
  counter-with-escalation
- B-0615 rule-edit-timeout-kill-after-git-network-ops
- 5 bus envelopes published 2249Z-2320Z this session
- Prior anchor memos already in user-scope MEMORY.md index
