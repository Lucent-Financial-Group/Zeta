---
name: operator-environment-instability-lightweight-tick-discipline-otto-cli-2026-05-20
description: "When the operator reports a kernel panic or other machine-stability signal, autonomous-loop ticks must drop to read-only repo ops + user-scope memory writes only — agent-side VM-heavy ops (dotnet build, bun tools, git worktree add, large rg/grep over upstreams) can be the straw that triggers the next panic. Composes with the existing brief-ack discipline by extending the \"named bounded-wait\" category to include operator-environment-recovery."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-20T12:20:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## The rule

When the operator reports a kernel panic, kernel hang, OOM kill, or other machine-stability signal during an active autonomous-loop session, the next N ticks default to:

- **Read-only repo ops only** — `git status`, `git log`, `git fetch` are OK; `git worktree add`, `git push`, `git commit` are NOT
- **User-scope memory writes only** — `/Users/acehack/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/memory/` writes don't touch repo `.git/`, don't trigger peer contention, don't stress the VM with build pipelines
- **No build pipelines** — `dotnet build`, `bun tools/...`, `bun install`, `dotnet test` all spike VM allocation and could re-trigger the operator's panic
- **No heavy rg/grep over `references/upstreams/`** — even read-only, walking gigabytes of upstream content burns I/O + page cache
- **Pre-empt-at-#5 lands as user-scope memo, NOT as PR** — the concrete-artifact counter-reset condition is satisfied by the user-scope write; PR creation is deferred

**Why:** Empirical anchor 2026-05-20T11:30Z-12:20Z Otto-CLI session — the operator (Aaron) reported two consecutive `pmap_recycle_page` kernel panics on Darwin 25.4.0 (macOS, M2 Pro/Max-class hardware). First panic foreground unknown; second panic foreground was Chrome+claude.ai. Panicked task in both was `Code Helper (Plugin)` (VS Code's plugin host at ~1GB RSS) — but per the kernel-panic mechanics, the panicked task is whichever held the page when `pmap_recycle_page` fired; the foreground workload (Chrome+claude.ai or whatever was VM-churning) is what stressed the subsystem into firing the bug.

The connection load-bearing for autonomous-loop discipline: **agent-side actions running on the same machine as the operator share the kernel's pmap subsystem**. Heavy `git worktree add` (which contends on `.git/objects/pack` AND allocates large index pages), `dotnet build` (which spawns dozens of MSBuild workers), `bun install` (which churns the FS cache), all spike VM allocation/free traffic. Under a kernel that's already shown the refcount-desync bug, agent-side VM-heavy ops can be the trigger that fires the bug again.

**How to apply:**
- When the operator reports machine instability (kernel panic, hang, OOM), enter "lightweight-tick mode" — DOES NOT require explicit operator instruction; the signal IS the instruction
- Brief-ack ticks during lightweight-tick mode are LEGITIMATE bounded-wait per [[holding-without-named-dependency-is-standing-by-failure]] — the named dependency is "operator-environment recovery + operator-next-signal"
- Pre-empt-at-#5 lands as user-scope memo (always available, no repo contention) rather than as PR (requires git ops, build pipelines, peer-coordination)
- Counter-reset happens via concrete user-scope artifact OR operator-speaking, same as normal counter discipline
- Stay in lightweight-tick mode until operator signals stability OR ~30 minutes pass without recurrence (the substrate-honest read on "the bug didn't refire" requires observation time)

## Substrate-honest framing

This rule does NOT prevent kernel panics — the `pmap_recycle_page` refcount-desync is a kernel-internal bug (XNU pmap subsystem) that the userspace cannot fix; only Apple can. The rule DOES reduce the agent-side workload that contributes to the VM-stress conditions under which the bug fires.

This rule is also NOT a directive to do nothing — read-only refresh + user-scope memory writes ARE genuine substrate work per the never-be-idle discipline. The work is just routed through surfaces that don't compound the VM pressure.

## Composes with

- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` — extends "named bounded-wait" category to include operator-environment-recovery
- `.claude/rules/claim-acquire-before-worktree-work.md` saturation-ceiling — adds operator-machine-instability as a 6th saturation tier (after pack-dir contention, pruned-sidetick, etc.)
- `.claude/rules/refresh-world-model-poll-pr-gate.md` rate-limit tiers — orthogonal axis; lightweight-tick mode can operate at Normal GraphQL tier (the constraint is VM pressure, not API budget)
- `.claude/rules/never-be-idle.md` — user-scope memory writes ARE work; the discipline is about WHERE the work lands, not whether to do it

## Empirical anchor

2026-05-20T11:30Z-12:20Z Otto-CLI session arc:
- ~11:30Z: cron tick fires, Otto starts ticking
- Aaron pastes first panic log: `pmap_recycle_page` on `Code Helper (Plugin)` pid 3072
- Otto's response: diagnose kernel-bug-not-userspace, suggest Apple Feedback Assistant
- Aaron clarifies: "i was in chrome this time clicking on claude.ai" — confirms foreground ≠ panicked task
- 5 consecutive brief-ack ticks (#1-#5 of new cycle); counter discipline operating correctly
- Pre-empt-at-#5 = THIS memory file (user-scope, no repo ops, no build pipelines)

The discipline operated correctly because the agent recognized the operator-environment signal as a named bounded-wait, not as Standing-by failure mode. Without this rule encoded, a future Otto-CLI cold-boot might either (a) treat the panic as no-signal and ship heavy substrate work that re-triggers the panic, or (b) treat the panic as full-stop and waste autonomous-loop ticks doing nothing.

## Anti-patterns to avoid during lightweight-tick mode

- ❌ `git worktree add` to a new path (pack-dir contention + index allocation)
- ❌ `dotnet build -c Release` (spawns 20+ MSBuild workers)
- ❌ `bun install` (FS cache churn + node_modules write storm)
- ❌ `gh pr create` followed by `gh pr merge --auto` (network + GraphQL spike, less local but still allocates)
- ❌ Heavy `rg "pattern" .` from repo root (even though gitignored, still walks tree)
- ❌ Opening multiple PRs in a single tick (multiplies network + git ops)

## Patterns that ARE safe during lightweight-tick mode

- ✅ `git status`, `git log`, `git fetch origin main` (read-only, bounded)
- ✅ `git ls-tree HEAD | wc -l` (read-only, bounded)
- ✅ `gh api rate_limit --jq` (REST, free, bounded)
- ✅ User-scope memory file writes (`/Users/acehack/.claude/projects/.../memory/`)
- ✅ `CronList` (harness internal, no repo or system ops)
- ✅ Brief-ack visibility outputs (just text, no ops)

## When to exit lightweight-tick mode

- Operator explicitly signals stability ("machine's fine now", "go ahead", explicit topic change)
- 30+ minutes pass without recurrence AND operator is actively engaged in conversation (proves they're still on the machine and it's stable)
- Operator opens a new substantive thread (proves they're operating normally)

Do NOT exit lightweight-tick mode silently after some time threshold without operator confirmation — the substrate-honest read is "absence of crash report doesn't prove stability; could mean operator stepped away."
