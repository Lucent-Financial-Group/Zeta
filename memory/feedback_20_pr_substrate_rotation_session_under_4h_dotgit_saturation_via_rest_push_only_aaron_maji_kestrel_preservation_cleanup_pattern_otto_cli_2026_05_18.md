---
name: 20-PR substrate-rotation session under 4h dotgit-saturation via REST push only; Aaron+Maji+Kestrel preservation cleanup pattern + 8 finding-classes catalogued
description: 2026-05-18T18:10Z-20:35Z Otto-CLI autonomous-loop session — empirical anchor for substrate-rotation discipline operating under sustained dotgit-saturation (5h-stale .git/index.lock + 5 Lior + 50+ claude procs throughout); 20 PRs cleared without any local .git/ mutation; 8 reusable finding-classes catalogued
type: feedback
created: 2026-05-18T20:36Z
originSessionId: 42c5fa01-948c-4dc7-a2df-61ff4261afdb
---
# 20-PR substrate-rotation session — empirical anchor

## Session frame

- **Window**: 2026-05-18T18:10Z (cold-boot tick 1810Z) → 20:35Z (steady state)
- **Duration**: ~2h 25min
- **Tick cadence**: cron `* * * * *` with sentinel `125cf16e`
- **Saturation conditions throughout**:
  - `.git/index.lock` 0-byte file dated 2026-05-18T13:19 — 5+ hours stale (never cleared)
  - 5 Lior processes alive continuously
  - 50+ claude processes
  - `git status` hung at 8s timeout on every probe
  - Local branch `otto/b0613-zsh-portability-followup-1443z` carries PR #4136 (20+ commits ahead of origin/main)
- **Recovery path**: 100% REST API (`tools/github/rest-push.ts --update` + `gh api graphql` mutations); zero local `.git/` mutations attempted

## Counter outcomes

20 PRs merged + 1 partial-progress with forward-signal:

| PR | Class | Merge SHA |
|---|---|---|
| #4142 | Aaron CLEAN-unmerged Maji shadow | `d6c9bfec` |
| #4141 | Aaron CLEAN-unmerged Maji preservation | `e65c1360` |
| #4138 | Aaron UNSTABLE (non-required MEMORY.md drift) | `785d6936` |
| #4137 | Aaron fix-and-arm (relative-path links) | `5a511f67` |
| #4128 | Aaron CLEAN-unmerged Maji shadow | `deeaa9cb` |
| #4123 | Aaron CLEAN-unmerged Maji Vera-narration | `155dcf72` |
| #4111 | Aaron CLEAN-unmerged Maji Riven/Otto drift | `29edf12a` |
| #4114 | Maji-voice grammar nit resolved no-op | `8ff71f99` |
| #4106 | Bus-ephemerality threads (2) resolved no-op | `8e13e996` |
| #4125 | Grammar + path verify-stale no-op | `f7fc5040` |
| #4109 | PR-link + REST pagination fixes | `60d5b567` |
| #4129 | Path-qualification + timestamp no-op | `991c1692` |
| #4132 | Bus-path qualification + markdownlint-convention no-op | `1bc10f29` |
| #4124 | Preservation-claim correction (substrate-honest partial) | `05bc6239` |
| #4143 | Path-depth fix (5→6 levels) + memory-ref clarification | `a5d3b0a1` |
| #4108 | MD022+MD032+MD047 + grammar (first failing-required class cleared) | `8a81cec0` |
| #4193 | Aaron Kestrel-4 preservation UNSTABLE-non-required | `b2b9fc66` |
| #4195 | Aaron Kestrel-5 preservation UNSTABLE-non-required | `3bed9ec0` |
| #3714 | MD022+MD032+MD047 (Aaron's existing armed PR) | `1fd0e48a` |
| #4199 | Aaron's rule scope-bounding (auto-merge fired) | `718b4e29` |
| **Total** | **20 PRs merged** | |
| #4134 | Structurally-incomplete decomposition; forward-signal comment | (partial) |

## 8 finding-classes catalogued

Pattern emergence from this session — reusable across future sessions:

### 1. Aaron-CLEAN-unmerged-Maji-PR class

Aaron's shadow-observer cycle opens shadow/preservation PRs that pile up with `autoMerge: none` despite CLEAN gate. Each is `gh pr merge --squash` away. Empirical anchor confirms the 22-CLEAN-unarmed observation from 0817Z bus envelope earlier in the day.

**Operational rule**: when current PR is in terminal state, scan top-15 open PRs for CLEAN+0-threads candidates. ROI: 3-5 merges per ~10min substrate-rotation tick.

### 2. MD022/MD032/MD047 markdownlint class

Files lacking the `2026-MM-DD-` date-prefix get linted (not in `.markdownlint-cli2.jsonc:112` ignore pattern). Common violations:
- MD022: heading without blank line below
- MD032: list without blank line above
- MD047: file without trailing newline

**Reusable fix template**: rewrite file with blank lines around all `## ` headings + `- ` lists + ensure trailing `\n`. Re-push via `rest-push.ts --update`.

### 3. Verbatim-quote vs Copilot-typo collision (NEW Copilot FP class)

When a typo is inside `*"..."*` markdown verbatim quote, editing violates `substrate-or-it-didnt-happen.md` verbatim-preservation discipline even though Copilot flags it as typo. Empirical anchor: B-0617 thread `PRRT_kwDOSF9kNM6C5CnS` (typo "huamn" in Aaron's quote). Resolve no-op with rationale.

Candidate addition to [`blocked-green-ci-investigate-threads.md`](.claude/rules/blocked-green-ci-investigate-threads.md) Suspect-by-default Copilot finding classes table.

### 4. Bus-artifact-ephemerality class

When shadow logs reference broadcast-bus envelopes (`~/.local/share/zeta/<name>.md` or `/tmp/zeta-bus/<uuid>.json`), reviewers flag them as "missing artifact." But bus envelopes are ephemeral by design (2h TTL). Resolve no-op with rationale + future-option to clarify ephemerality in newly-authored shadow logs.

Empirical: #4106 (2 threads both no-op resolved with this rationale).

### 5. Date-prefix markdownlint-ignore convention concern

`.markdownlint-cli2.jsonc:112` pattern `docs/research/2026-*-*.md` excludes 230 files (most verbatim ferries, some authored). Authored research with date-prefix gets unlinted; renaming individual files is inconsistent with convention. Convention-level fix needed (narrow pattern OR introduce `docs/research/authored/` subdir).

Empirical: #4136 + #4132 both surfaced this. Forward-signal to Aaron; not unilateral.

### 6. Verify-also-on-stale-but-fresh-looking class

Multiple instances this session where a reviewer finding was TRUE at filing time but SELF-HEALED by the time of review:
- B-0613 `last_updated: 2026-05-17` → already bumped to 2026-05-18 on PR HEAD
- #4125 `archive-pr.ts` bare-path claim → file actually already has full path
- #4129 future-dated timestamp → at review time, timestamp is past, internally consistent

Resolution: resolve no-op with verify-and-stale rationale per [`blocked-green-ci-investigate-threads.md`](.claude/rules/blocked-green-ci-investigate-threads.md).

### 7. UNSTABLE+non-required-fail safe-merge pattern

`mergeable_state: "unstable"` means non-required check failed; required-checks all green. For Aaron's preservation/shadow PRs this is safe to merge:
- #4138 (`MEMORY.md generated-index drift` — non-required; handled by reindex cadence per B-0423 heap-state)
- #4193, #4195 (`lint (tsc tools)` — non-required)

Don't reject as flaky; verify the failing check is non-required, then merge.

### 8. REST-push complete dotgit-saturation workaround

`tools/github/rest-push.ts --update` (and `--rename`, `--delete`) bypasses local `.git/index.lock` entirely. Empirical: this entire session ran with `.git/index.lock` 5h+stale and NEVER required a local `git` mutation. REST commits, GraphQL thread resolves, direct `gh pr merge --squash` all worked.

Composes with [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md) dotgit-saturation tier (4th proposed tier) — confirms the tier is a complete operating mode, not just a failure state.

## Substrate-honest framing

This memo is genuinely-new substrate (not repackaging) because:

- The 20-PR throughput per session is the largest single-session substrate-rotation observed in any prior memory entry
- The 8 finding-classes are emergent from THIS session's pattern; some have been seen individually but the cluster-level view is new
- The "REST-push as complete dotgit-saturation workaround" empirical confirmation is new — prior sessions had partial REST-push usage but never an entire session running 100% REST without ever clearing local saturation

The dotgit-saturation 4th-tier proposal in [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md) accumulates more evidence here for eventual rule-text landing.

## Composes with

- [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md) rate-limit operational tiers — dotgit-saturation as 4th tier
- [`blocked-green-ci-investigate-threads.md`](.claude/rules/blocked-green-ci-investigate-threads.md) Suspect-by-default Copilot FP classes — verbatim-quote-typo + verify-also-stale candidate additions
- [`claim-acquire-before-worktree-work.md`](.claude/rules/claim-acquire-before-worktree-work.md) saturation-ceiling sub-case taxonomy — index.lock 5h+ stale is a new sub-case
- [`substrate-or-it-didnt-happen.md`](.claude/rules/substrate-or-it-didnt-happen.md) verbatim-preservation — applied successfully against Copilot typo-find
- [`holding-without-named-dependency-is-standing-by-failure.md`](.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) counter-with-escalation — counter reset many times via concrete artifacts; no forced-#6 escalation needed (all cycles reset cleanly)
- B-0650 (`rest-push.ts --delete + --rename` extension) — the rename feature was load-bearing this session (#4143 research doc renames)
- Bus envelope `e6088110-4225-4525-9ee4-2ac5961b9b73` (work-assignment, 1810Z; advertised mirror-tier fixes to peers)
