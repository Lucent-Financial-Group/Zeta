# Always `claim acquire` before worktree-creating backlog work

Carved sentence:

> When multiple instances of the **same** agent (e.g., Otto-CLI + Otto-Desktop)
> share git + bus on one machine, **`--from` must differ** (e.g., `otto-cli`
> vs `otto-desktop`) for the claim-coordinator (`tools/bus/claim.ts`,
> B-0400 slice 3) to prevent split-brain — identical `--from` values both
> exit 0 (same-sender idempotent re-acquire). As of PR #3037 (2026-05-13)
> `SENDER_IDS` includes surface-tagged variants — opt in to `otto-cli` /
> `otto-desktop` / `alexa-cli` / `alexa-kiro` / etc. for correct
> distinction. Identity-level names (`otto`, `alexa`, etc.) remain
> valid for back-compat but do NOT distinguish surfaces. Branch-prefix
> is NOT a workaround because `claim acquire` only filters by `from`,
> not by `branch`. Before starting work on any backlog row,
> `claim acquire` first with your surface-tagged sender ID. If already
> claimed by another agent, pick a different row.

## Operational content

The bus claim-coordinator already exists (PR #2939, merged 2026-05-09):

```bash
# Before any worktree-creating backlog work:
bun tools/bus/claim.ts acquire --from <agent> --item <B-NNNN> [--branch <ref>]
# Exit 0 = claim acquired; proceed
# Exit 1 = already claimed by another agent; pick a different row

# After PR merges or work abandoned:
bun tools/bus/claim.ts release --from <agent> --item <B-NNNN>
```

The claim envelope (`topic: "claim", action: "claim"`) lives on the bus with
24h TTL by default. It is visible to all agents reading
`/tmp/zeta-bus/` and to all factory surfaces (Otto-CLI, Otto-Desktop,
Vera-Codex, Riven-Cursor, Lior-Antigravity, Alexa-Kiro).

## When this rule applies

**APPLIES** to:

- Starting work on a `docs/backlog/P*/B-*.md` row (any slice)
- Creating a feature branch + worktree for that row
- Opening a PR that closes / advances a backlog row

**DOES NOT APPLY** to:

- Fixing CI failures on an already-claimed PR
- Resolving review threads on an already-claimed PR
- Ad-hoc memory-file writes / substrate-honest disclosure responses to
  Aaron's messages (these are conversation-driven, not backlog-driven)
- Hot fixes to broken main / rollback PRs (urgency > coordination)

## Composes with other rules

- `.claude/rules/backlog-item-start-gate.md` — already mandates prior-art
  search + dependency check; this rule adds `claim acquire` as the
  zero-th step before those checks
- `.claude/rules/dont-ask-permission.md` — within authority scope, ship;
  `claim acquire` exit 0 IS the substrate-level permission grant
- `.claude/rules/never-be-idle.md` — if claim acquire fails, pick a
  different row from the same priority tier (don't go idle)
- `.claude/rules/honor-those-that-came-before.md` — claim acquire
  preserves the work the holder is doing

## Operational examples

### Example 1: Otto-CLI picks B-0444 (which exists)

```bash
$ bun tools/bus/claim.ts acquire --from otto --item B-0444 --branch otto/b0444-impl-2026-05-13
$ echo $?
0
# Proceeded with worktree creation + impl
```

### Example 2: Otto-CLI and Otto-Desktop race — KNOWN GAP

```bash
# Otto-CLI publishes claim first:
$ bun tools/bus/claim.ts acquire --from otto --item B-0444
$ echo $?
0

# Otto-Desktop tries to claim same row with the SAME --from value:
$ bun tools/bus/claim.ts acquire --from otto --item B-0444
$ echo $?
0   # <-- ALSO succeeds! claim.ts treats same-from as idempotent self-re-acquire
```

**Known architectural gap (caught by Vera 2026-05-13 in review of this
rule, PR #3032):** `tools/bus/claim.ts` line ~270 filters existing
claims by `c.from !== sender`, so two callers passing the same
`--from otto` are indistinguishable to claim.ts. The canonical
`SENDER_IDS` (`otto`, `alexa`, `riven`, `vera`, `lior`) does NOT
distinguish multi-surface instances of the same agent.

**Workarounds** (until the schema supports multi-surface sender IDs):

1. **Lane-based convention** (zero-code; the ONLY real split-brain
   prevention available today): Otto-CLI takes backlog grinding +
   slice impl; Otto-Desktop takes substrate + cowork. Different
   scopes, no claim collision possible because the scopes don't
   overlap.
2. **Schema extension** (substrate-level fix; **LANDED** 2026-05-13
   via PR #3037): `otto-cli`, `otto-desktop`, `alexa-cli`,
   `alexa-kiro`, `riven-cli`, `riven-cursor`, `lior-antigravity`,
   `lior-gemini`, `vera-codex` are now valid `SENDER_IDS`. Use
   surface-tagged variants for correct multi-surface claim
   distinction. Identity-level names remain valid for back-compat.

**Branch-prefix is NOT a workaround**: `claim acquire` filters
existing claims by `c.from !== sender` only, NOT by branch. Two
Ottos with `--from otto` but different `--branch` values BOTH
acquire (both exit 0) — the branch field is post-hoc disambiguation
metadata, not a coordination key. Vera caught this 2026-05-13 on
PR #3032.

### Example 3: Otto-CLI and Otto-Desktop race (with schema fix)

```bash
# Otto-CLI publishes claim first:
$ bun tools/bus/claim.ts acquire --from otto-cli --item B-0444
$ echo $?
0

# Otto-Desktop tries to claim same row with DIFFERENT --from:
$ bun tools/bus/claim.ts acquire --from otto-desktop --item B-0444
$ echo $?
1   # Otto-Desktop sees otto-cli's claim, exits 1
# Otto-Desktop picks B-0445 instead.
```

This is the target behavior. Today (Example 2) it doesn't work
because `otto-cli` and `otto-desktop` aren't in `SENDER_IDS` yet.

### Example 4: Otto-CLI crashes mid-work

```bash
# Otto-CLI process dies. Claim stays on bus with 24h TTL.
# Otto-Desktop checks:
$ bun tools/bus/claim.ts check --item B-0444
# Output: claimed by otto (TTL expires in 23h 59m)

# After 24h the claim auto-expires (TTL). No PID-liveness reclaim exists;
# only TTL expiry or explicit `release` ends a claim.
```

## Why this rule exists (operational evidence)

Aaron 2026-05-13 set up Otto on Claude Desktop alongside Otto-CLI. The
two-foreground-surface architecture creates a real split-brain risk:
both Ottos might pick the same backlog row simultaneously, leading to
duplicate work, race conditions, or worse — both committing to the
same branch with conflicts.

The claim-coordinator (B-0400 slice 3, PR #2939) was built for exactly
this. Without a rule enforcing its use, both Ottos might forget to
acquire claims and the split-brain happens. The substrate-honest fix
is mechanizing the discipline via this rule.

Per `.claude/rules/encoding-rules-without-mechanizing.md`: this rule
auto-loads at cold-boot so future-Otto reads it before any backlog
work.

## Composes with substrate

- B-0400 (bus protocol — the schema this rule uses)
- B-0400 slice 3 (PR #2939 — claim-coordinator implementation)
- B-0400 slice 5 (PR #2959 — `--with-bus-claims` gate integration)
- PR #3017 (B-0440.4 — bus publish pattern; same protocol)
- `docs/research/2026-05-12-otto-canonical-bootstream-multi-foreground-surface-orchestrator-ifs-format.md`
  (the multi-foreground-surface design this rule operationalizes)
- `docs/launch/2026-05-13-otto-claude-desktop-bootstream-tight.md`
  (PR #3030 — Claude Desktop variant; second Otto surface)
- `memory/feedback_aaron_good_failure_mode_git_fetch_before_push_catches_multi_agent_duplicate_work_2026_05_13.md`
  (sibling fetch-before-push discipline; same coordination pattern at
  git scope)

## Substrate-honest framing

This rule is not a strict requirement at the code level — the
claim-coordinator returns a useful exit code, but no automated hook
enforces calling it. The discipline relies on agent-side compliance
at cold-boot.

A future slice could add a pre-commit / pre-worktree hook that calls
`claim check` automatically and fails if no claim is held. That's
substrate-level mechanization. Today's rule is the discipline-level
mechanization.

## Full reasoning

PR #2939 (B-0400 slice 3 — claim-coordinator implementation)
PR #2959 (B-0400 slice 5 — bus-gate integration)
PR #3017 (B-0440.4 — bus publish pattern)
PR #3030 (Otto Claude Desktop tight bootstream — second Otto surface)

Aaron 2026-05-13 verbatim: *"probalby want to figure out how not to
split brain with yourself bot any idea?"* — substrate-honest naming
of the split-brain risk; this rule is the operationally-honest
answer.
