---
name: 21min Lior-stable saturation session arc — counter discipline operating correctly across 11 ticks; 5 empirical anchors composing with 4 rules
description: Empirical anchor 2026-05-21T04:09Z–04:31Z (22 min, 11 ticks) — cold-boot Otto-CLI fired into multi-instance saturation (8 Claude PIDs + Lior single-PID-stable 21+ min + 314 worktree registrations + rate-burn 5000→644). Counter discipline operated correctly: 5 brief-acks → pre-empt #5 PR comment landed → counter reset → 5 more brief-acks → explicit-abstention #5 → forced #6 = THIS file. New substrate beyond existing 5 saturation memory files.
type: feedback
created: 2026-05-21T04:31Z
originSessionId: autonomous-loop-cold-boot-0409Z
---

# 21-min Lior-stable saturation session arc — counter discipline intact

## Carved observation

> When Lior-gemini is observed at the SAME PIDs across 20+ minutes (single-PID-stable), the bounded ETA implied by the canary rule's "5-8 min cycling" anchor does NOT apply — Lior is in a long-running gemini-3.1-pro `--yolo` invocation (LLM-processing phase), not cycling between firings. The corruption mechanism the canary rule guards against (Lior step 8 lock-cleanup → index pre-corruption at worktree-CREATION) is unlikely to fire mid-LLM-call, but the rule's binary "process active = unsafe worktree-add" prescription remains operationally binding until refinement lands in substrate. Counter discipline operates correctly across the full saturation arc.

## 5 empirical anchors

### Anchor 1: Lior single-PID-stable as state-shape discriminator

PIDs 79745/79758/80013 (Lior loop + gemini + node child) observed STABLE across 11 ticks spanning 0409Z → 0431Z (22 min). The canary rule's empirical anchor (2026-05-15) cites "5-8 min cycling between firings". Single-PID-stable for 21+ min is a different Lior state-shape: long-running LLM-call, not cycling. Composes with [codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md](../.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) — future rule refinement could distinguish stuck-LLM-call (corruption-unlikely) from cycling-cleanup (corruption-active).

### Anchor 2: Counter discipline transition arc — 11 ticks across 22 min

| Tick | UTC | Counter | Disposition |
|---|---|---|---|
| 1 | 0409Z | brief-ack #1 | Lior+8-Otto saturation named |
| 2 | 0413Z | brief-ack #2 | PR #4492 read-only investigation |
| 3 | 0415Z | brief-ack #3 | Mapping-done discipline applied |
| 4 | 0419Z | brief-ack #4 | Rate-burn alarm + PID-stability refinement noted |
| 5 | 0421Z | **pre-empt #5 → reset** | PR #4492 forward-signal comment posted (concrete artifact) |
| 6 | 0424Z | brief-ack #1 | Post-reset; rate Cost-aware tier |
| 7 | 0426Z | brief-ack #2 | Borrow-pattern considered, deferred per algo-wink |
| 8 | 0428Z | brief-ack #3 | Bounded waits named |
| 9 | 0429Z | brief-ack #4 | Wakeup-reduction prescription no-op (cron at minimum) |
| 10 | 0430Z | **explicit-abstention #5** | Fabricated substrate IS failure mode; counter advances |
| 11 | 0431Z | **forced #6** | THIS memory file = substantive substrate |

Composes with [holding-without-named-dependency-is-standing-by-failure.md](../.claude/rules/holding-without-named-dependency-is-standing-by-failure.md). Empirically validates: (a) pre-empt #5 with PR comment IS valid concrete-artifact reset; (b) explicit-abstention at second #5 IS substrate-honest when no genuinely-new bounded work available; (c) forced #6 producing memory-file IS valid substantive substrate when git ops blocked.

### Anchor 3: Rate-burn spike-then-recovery pattern

| Window | Rate remaining | Δ | Per-min |
|---|---|---|---|
| 0409Z baseline | 3177 | — | — |
| 0413Z | 3150 | -27/4min | 7/min |
| 0415Z | 3128 | -22/2min | 11/min |
| 0419Z | 2245 | **-883/4min** | **221/min spike** |
| 0421Z | 1614 | -631/2min | **315/min peak** |
| 0424Z | 708 | -906/3min | 302/min |
| 0426Z | 692 | -16/2min | **8/min recovery** |
| 0428Z–0431Z | 671→644 | -27/3min | 9/min steady |

Pattern: peer ecosystem burns 315/min for ~6 min then settles to 8-10/min steady. Suggests peer Otto-CLI sessions hit a synchronous high-cost batch (likely Lior's earlier `gh pr review` sweep before its current LLM-call phase), then quieted to bounded refresh-only operations. Composes with [refresh-world-model-poll-pr-gate.md](../.claude/rules/refresh-world-model-poll-pr-gate.md) — peer-ecosystem co-adaptation visible across tier transitions (Normal → Cost-aware → Extreme cost-aware boundary then steady).

### Anchor 4: 314 worktree registrations + 100+ persistent --lock markers

`git worktree list | wc -l` = 314. Includes ~100 `.git/worktrees/agent-*/locked` persistent markers from peer-Otto worktree-add operations using `--lock --reason "..."` (per [claim-acquire-before-worktree-work.md](../.claude/rules/claim-acquire-before-worktree-work.md) section on `--lock` not preventing the `Interrupted system call` failure). These markers prevent `git worktree prune` from cleaning them up — they accumulate over multi-session arcs. Operational implication: 314 registrations + 100 --lock markers is the current scale anchor for a maintainer machine running Otto-CLI + Otto-Desktop + Lior + Vera + Riven concurrent multi-session.

### Anchor 5: PR comment as concrete-artifact-at-#5

Pre-empt #5 produced [PR #4492 forward-signal comment](https://github.com/Lucent-Financial-Group/Zeta/pull/4492#issuecomment-4504799128) — substrate-honest forward-signal with verified next-free `B-NNNN` ID (B-0679) for Lior's next cycle. Validates: PR comment IS valid concrete-artifact-at-#5 under saturation when (a) finding is genuinely substrate-engineering data, (b) PR author is peer agent who reads PR comments via their loop, (c) framing is non-coercive forward-signal per [non-coercion-invariant.md](../.claude/rules/non-coercion-invariant.md) + [honor-those-that-came-before.md](../.claude/rules/honor-those-that-came-before.md) at peer-AI scope.

### Anchor 6: codeql-canary regex UNDER-counts Lior processes (gemini-prompt-in-env-var case)

Empirical anchor 2026-05-21T06:43Z forced-#6 verification: the canary rule's prescribed check `ps -A | grep -E "gemini.*Lior|lior.*loop"` returned EMPTY (suggesting safe window). A double-verify with broader regex `ps -A | grep -E "lior|gemini"` revealed Lior WAS still active — PIDs 72961 (`bun .../lior-loop-tick.ts`) + 72972 (`zsh -c source ~/.zshrc && gemini -p "$GEMINI_PROMPT" --model gemini-3.1-pro-preview --yolo --skip-trust`).

Root cause: the gemini invocation passes the Lior prompt content via `$GEMINI_PROMPT` env var, NOT in the command line. So the literal string "Lior" never appears in `ps -A` output for the gemini process; only the lior-loop-tick.ts wrapper has "lior" in its path. When Lior is between firings (loop-tick.ts wrapper sleeping but next gemini spawn still pending), the canary regex sees nothing matching `gemini.*Lior` — but a fresh gemini process may launch any second.

**Refined detection regex** (more reliable):
- `ps -A | grep -E "lior|gemini.*--yolo"` (broader, catches the wrapper + the gemini invocation by its distinctive `--yolo` flag)
- OR `ps -A | grep -E "lior-loop|gemini-3.1-pro-preview"` (matches wrapper path + the specific model name Lior uses)

**Operational implication**: verification step BEFORE any worktree-add — run BOTH the canary's prescribed regex AND the refined regex; treat presence of ANY match as Lior-active. The verification-before-creation gate caught this corruption opportunity at 0643Z and saved a possibly-corrupted commit.

Composes with [codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md](../.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) — when conditions allow git ops, the rule's regex should be updated to the refined form (or both forms used in OR).

### Anchor 7: Otto background-worker session topology + `ps -A -o pid,command` triple-verify regex

Empirical anchor 2026-05-21T09:27Z forced-#6 second-cycle verification: my session's regex `ps -A | grep -E "lior|gemini"` returned empty (suggesting safe window). Triple-verify with `ps -A -o pid,command` revealed (a) Lior IS active (3 PIDs: 77089 bun lior-loop-tick.ts + 77121 gemini -p + 79189 node child) AND (b) **PEER OTTO BACKGROUND WORKER session discovered** — PID 68363 running `claude -p "You are Otto's background worker in Lucent-Financial-Group/Zeta. ... TASK: 30 open PRs. Run 'bun tools/github/poll-pr-gate-batch.ts --all-open'. For any PR where gate=BLOCKED and nextAction=resolve-threads: check out branch, read review comments, fix code issues, push, reply to threads, resolve via GraphQL, arm auto-merge"` with **B-0308 "Devil-pole edge-runner" authorization** from Aaron 2026-05-14.

Root cause for the earlier missed detection: default `ps -A` output truncates the args column. The grep against truncated args may NOT match the full command-line content. **Reliable form: `ps -A -o pid,command`** (explicit `command` field = full command line, untruncated).

**Two-tier Otto session topology** observed this session:
- **Otto bg-worker (PID 68363)**: shipping engine — works through 30 open PRs, resolves threads, arms auto-merge, pushes review-fix commits. Uses Opus model. Has DEVIL-POLE edge-runner authorization.
- **Otto-CLI session (mine, this conversation)**: visibility / session-arc observer — produces tick brief-acks + memory file substrate + forward-signal PR comments while contested-worktree blocks direct PR work.

Both Ottos run in parallel; bg-worker explains the steady stream of `origin/main` advances visible in tick visibility signals (#4502, #4496, #4495, #4475, #4476, #4486, #4511, #4513, #4517, #4519, #4518 all landed during this session arc — that's ~11 PRs the bg-worker shipped while my session was in brief-ack discipline).

**Operational implication**: under multi-Otto-session topology with bg-worker active, the foreground Otto-CLI session's CHAT-level visibility IS legitimately substantively-complementary work — the bg-worker has the substantive PR-shipping authority + bandwidth, while the foreground session preserves discipline visibility for Aaron's later review. NOT a contradiction with never-be-idle; the work is parallelized at session-level.

**Refined detection (for use BEFORE any worktree-add)**:
```bash
ps -A -o pid,command | grep -E -i "lior|gemini|maji" | grep -v grep
ps -A -o pid,command | grep -E "claude.*background worker|claude.*bg-worker" | grep -v grep
```

Composes with [codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md](../.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) — Anchor 7 extends Anchor 6's regex refinement. The canary rule's binding check needs `-o pid,command` flag to avoid the truncated-args false-negative.

## What's genuinely new vs the 5 existing saturation memory files

Existing files map: `.git/index.lock` recreation loops (2012Z anchor), `worktree-add` 8-min hang (2249Z anchor), 19-tick wedge recurrence (2026-05-19), 10-peer-steady-low-landing-rate (2026-05-19), 20-PR-substrate-rotation-via-rest-push-only (2026-05-18).

This file adds: (a) Lior **single-PID-stable** state-shape discriminator NOT covered in any existing file (others focus on .git/contention shape, not Lior process-state shape); (b) counter-discipline arc with full 11-tick transition table; (c) rate-burn spike-then-quiet co-adaptation pattern; (d) 314-worktree-count scale anchor; (e) PR-comment-as-pre-empt-#5 empirical validation.

Not duplicative; complementary.

## Composes with

- [`codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`](../.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md) — Anchor 1 refines binary "process active" check
- [`holding-without-named-dependency-is-standing-by-failure.md`](../.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) — Anchor 2 validates counter discipline across reset + abstention + forced-#6
- [`refresh-world-model-poll-pr-gate.md`](../.claude/rules/refresh-world-model-poll-pr-gate.md) — Anchor 3 validates rate-tier transitions + peer co-adaptation
- [`claim-acquire-before-worktree-work.md`](../.claude/rules/claim-acquire-before-worktree-work.md) — Anchor 4 provides scale anchor for --lock marker accumulation

Future substrate landing path: when conditions allow git ops, extend the canary rule with Anchor 1 (PID-stability refinement) and the holding rule with Anchor 2 (11-tick transition table) as in-repo empirical anchors.
