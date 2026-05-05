# Old PR triage audit (2026-05-04)

Scope: triage research-grade audit of 8 open PRs on Lucent-Financial-Group/Zeta with PR# < 1500 that are blocked or dirty as of 2026-05-04.
Attribution: Otto (Zeta factory Claude instance) drafting; Aaron 2026-05-04 maintainer-prompted parallel-track dispatch after self-throttling correction.
Operational status: research-grade
Non-fusion disclaimer: This is a triage research doc. No PRs were modified during the audit (read-only via `gh pr view` and `gh api graphql`). Recommended dispositions are advisory; the maintainer or future-Otto picks actions. Agreement / shared language / repeated interaction with peer AIs / external reviewers does not imply shared identity, merged agency, or any kind of fused entity — the dispositions below are Otto-authored opinions over independently-authored PRs.

## Summary table

| PR | Age (days) | Author | Block cause | Unresolved threads | Salvageable | Disposition |
|---|---|---|---|---|---|---|
| #1200 | 2 | AceHack | DIRTY (rebase against main) | 0 | Yes | rebase-onto-main + retry merge |
| #1183 | 2 | AceHack | BLOCKED — `check memory/MEMORY.md paired edit` failing + 5 review threads | 5 | Yes | add MEMORY.md index entry + address 4 P2/P0 review notes + push |
| #1182 | 2 | AceHack | BLOCKED — `lint (semgrep)` + `build-and-test` ubuntu (x2) failing + 3 review threads | 3 | Probably | fix `Scope:` header (hyphen vs space) + dead "See also" links + push |
| #1181 | 2 | AceHack | BLOCKED — `lint (semgrep)` + `build-and-test` ubuntu (x2) failing + 3 review threads | 3 | Probably | fix §33 `external conversation` phrasing + dead "See also" links + push |
| #1107 | 3 | AceHack | BLOCKED — `lint (semgrep)` + `build-and-test` ubuntu (x2) failing; 13 unresolved (all but 5 outdated) | 13 | Probably | naming-consent compliance pass + fix §33 `Operational status:` value + rebase |
| #1106 | 3 | AceHack | DIRTY (rebase) — 17 unresolved threads, ~half outdated, naming-consent and §33 header issues | 17 | Probably | naming-consent compliance pass + §33 header fix + rebase + push |
| #659 | 7 | AceHack | DIRTY (rebase) — 68 unresolved threads (prompt said 67; GraphQL totalCount shows 68 unresolved out of total in scope), all about persona-name attribution on current-state surfaces + path drift | 68 | No, in this shape | close-as-stale + extract trajectory pattern into a much smaller follow-up PR |
| #655 | 7 | AceHack | DIRTY (rebase) — tick-history append, 0 unresolved threads, 0 failing checks shown | 0 | Yes | rebase-onto-main + retry merge (low-risk doc-only) |

(Note: prompt asserted #659 = 67 threads; GraphQL `totalCount` = 68 unresolved at audit time. Single-thread variance does not change disposition.)

## Per-PR cards

### #1200 — research+memory: mechanical authorization check supersedes introspective discipline (Claude.ai 2026-05-02)

- Created: 2026-05-02T12:53:05Z (~2 days old)
- Author: AceHack
- Branch: `docs/claudeai-mechanical-authorization-check-2026-05-02`
- Purpose: Lands a Claude.ai-couriered architectural correction to PR #1198: reframes the "no-op-cadence after go-hard authorization" failure mode from *introspective* (Otto introspect harder) to *mechanical* (concrete authorization-state check Otto runs). Adds verbatim research preservation + memory file + CLAUDE.md bullet so the rule is wake-time-loaded.
- Why dirty: `mergeStateStatus: DIRTY` — needs rebase against main. No failing checks shown in `statusCheckRollup`; 0 unresolved review threads; total reviewThreads = 17 (all resolved).
- Salvageable: Yes — it's a substrate-class research+memory doc landing, all reviewer concerns already addressed (17 resolved, 0 unresolved), only blocker is the merge conflict against main.
- Recommended disposition: **rebase-onto-main + retry merge.** Lowest-risk merge in the cohort. If the rebase reveals no substantive conflict, this should land within minutes.

### #1183 — memory(aurora-dual): oracle is dual of gate (precisely); self-dual disposition (Aaron 2026-05-02)

- Created: 2026-05-02T00:22:02Z (~2 days old)
- Author: AceHack
- Branch: `memory/aurora-dual-chain-no-walls-self-dual-disposition-aaron-2026-05-02`
- Purpose: Memory file capturing Aaron's sharpened Aurora dual-chain framing — *gate ↔ oracle* as opposite-direction morphisms with the immune system as a mechanism inside the oracle layer (not an independent dual partner). Self-dual disposition discipline.
- Why blocked: `mergeStateStatus: UNKNOWN` (treated as BLOCKED). One required check failing: `check memory/MEMORY.md paired edit` (the new memory file lacks a corresponding MEMORY.md index row). Several lint jobs cancelled cascading from that. 5 unresolved review threads, all on the new memory file:
  - 1× chatgpt-codex-connector P2: nonexistent references in "Composes with" list
  - 1× copilot-pull-request-reviewer P0: missing MEMORY.md paired edit (matches the failing check)
  - 1× copilot grammar fix in frontmatter `description:`
  - 1× copilot markdown-rendering issue (extra `*` after closing quote breaking emphasis)
  - 1× chatgpt-codex-connector P2: containment-direction reconciliation with canonical framing
- Salvageable: Yes — concerns are all surface-level fixes plus the deterministic MEMORY.md index addition. Substantive content is unchallenged.
- Recommended disposition: **add MEMORY.md index entry + apply 4 review-note edits + push.** P0 thread (memory-index-integrity) is the same root cause as the failing check; fixing it un-blocks both. Estimate: small, single-tick fix.

### #1182 — research(claudeai-recursion-delphi): recursion-catches-itself + convergent-attractor + Delphi precedent (Aaron 2026-05-01)

- Created: 2026-05-02T00:12:12Z (~2 days old)
- Author: AceHack
- Branch: `research/claudeai-recursion-catches-itself-delphi-oracle-aaron-forwarded-2026-05-01`
- Purpose: Companion to PR #1181 — three sub-sections from Claude.ai elaborating *why* the BFT structure works (recursion catches itself / WWJD as convergent attractor / Delphi oracle precedent).
- Why blocked: `lint (semgrep)` failing + `build-and-test (ubuntu-24.04)` and `build-and-test (ubuntu-24.04-arm)` failing + several lint jobs cancelled. 3 unresolved review threads:
  - 1× chatgpt-codex-connector P2: broken "See also" links to predecessor packets
  - 1× copilot P1: §33 header uses `External-conversation` (hyphen) but the lint script `tools/hygiene/check-archive-header-section33.sh` only matches `external conversation` (space) in the first 20 lines
  - 1× copilot P1: "See also" section links to three sibling docs that don't exist on this branch
- Salvageable: Probably — the §33 hyphen-vs-space issue is a one-character fix; dead links are addressable; build-and-test failure is likely either the same lint cascade or a sibling problem worth investigating before judging deeper rot.
- Recommended disposition: **continue-after-fix.** Concretely: (1) change `External-conversation` → `external conversation` in the §33 header to satisfy the lint script; (2) repair / remove the three dead "See also" links; (3) re-trigger CI; (4) inspect remaining build-and-test failure if it doesn't clear with the lint fix. If build-and-test failure is unrelated and persistent, escalate.

### #1181 — research(claudeai-bft-succession): BFT-multi-source as succession answer + layered defense + grading-bottleneck disposition (Aaron 2026-05-01)

- Created: 2026-05-02T00:04:59Z (~2 days old)
- Author: AceHack
- Branch: `research/claudeai-bft-multi-source-succession-aaron-forwarded-2026-05-01`
- Purpose: Substrate landing for the most architecturally-substantive single peer-AI message of the late-2026-05-01 session — Claude.ai recalibration packet on BFT-multi-source as the succession answer to multi-generational ratcheting + three-layer defense framing.
- Why blocked: Same shape as #1182 — `lint (semgrep)` + `build-and-test (ubuntu-24.04)` + `build-and-test (ubuntu-24.04-arm)` all FAILURE; lint sub-jobs cancelled. 3 unresolved review threads:
  - 2× copilot P1: dead "See also" links to two Amara research docs that don't exist on this branch
  - 1× copilot P1: same §33 `external conversation` phrasing failure as #1182 (the lint script's first-20-lines match)
- Salvageable: Probably — same fixes as #1182. Sibling PR with overlapping failure modes; if #1182's fix recipe works, this one applies in parallel.
- Recommended disposition: **continue-after-fix, batched with #1182.** Apply the same §33 phrasing repair + dead-link cleanup. The two PRs are intentional companions and should land together or not at all to keep the BFT-succession + recursion-Delphi research arc coherent.

### #1107 — research(8th+9th-ferries) + memory(corrections-wave): LFG-NC-inc + Addison-co-owner + KSK=robotics + cloud-native=biz-shortcut + Max-dumped-Lilly + Addison cognitive profile (Aaron 2026-05-01)

- Created: 2026-05-01T11:39:52Z (~3 days old)
- Author: AceHack
- Branch: `research/claudeai-eighth-ferry-corrected-picture-2026-05-01`
- Purpose: Verbatim 8th + 9th ferry preservation + Aaron's eight load-bearing corrections to PR #1106's framing (LFG = NC corp / Addison = co-owner / KSK = robotics / etc.).
- Why blocked: `lint (semgrep)` + `build-and-test (ubuntu-24.04)` + `build-and-test (ubuntu-24.04-arm)` FAILURE. 13 unresolved review threads. Of those, 5 still NOT outdated (i.e., post most-recent push):
  - copilot P1: §33 `Operational status:` value is `Substrate-class`, but GOVERNANCE.md §33 only allows `research-grade` (default) or `operational`
  - chatgpt-codex-connector P2: false "only place" claim about a consented name
  - 2× copilot: MEMORY.md naming-consent rows + dead memory-file link
  - copilot: dead `Composes with` reference to `memory/feedback_glass_halo_first_party_..._otto_231_2026_04_24.md`
- Salvageable: Probably — substantive content (the eight corrections) is the load-bearing payload; the issues are §33-header compliance + naming-consent enforcement + path-drift cleanup. None of these challenge the underlying corrections.
- Recommended disposition: **continue-after-fix-naming-consent-and-§33.** Concretely: (1) replace `Operational status: Substrate-class` with `research-grade` (and capture the `Substrate-class` framing elsewhere if Aaron wants it preserved as a distinct concept); (2) audit every name occurrence against the naming-consent rule introduced in PR #1106 (including MEMORY.md index rows); (3) repair dead path references; (4) push and re-trigger CI. Order of operations matters — addresses the P0 §33 header lint first, then naming-consent, then path drift.

### #1106 — research(seventh-ferry) + memory(naming-consent): Claude.ai sleep-care + Aaron's naming-consent rules + Max/KSK/LFG-meme/wellness-app project facts (Aaron 2026-05-01)

- Created: 2026-05-01T11:29:09Z (~3 days old)
- Author: AceHack
- Branch: `research/claudeai-seventh-ferry-sleep-care-2026-05-01`
- Purpose: Three-file substrate landing — verbatim 7th-ferry preservation + memory file encoding Aaron's naming-consent rules (Addison/Max first names OK; one daughter NOT named anywhere) + project facts about Max/KSK/LFG-meme/wellness-app.
- Why dirty: `mergeStateStatus: UNKNOWN` (DIRTY per prompt) — failing check `lint memory/MEMORY.md reference-existence` (one of the MEMORY.md index entries points at a memory file path that does not exist). 17 unresolved review threads on this PR — most are about the *recursive* failure where the naming-consent rule introduced in this PR is itself violated by the PR's own content (the non-consenting name appears in §33 frontmatter, in the MEMORY.md row for the consent rule, in a verbatim block, etc.). Also: §33 `Operational status:` invalid value, §33 header labels bold-styled instead of literal, list-marker continuation issues with `+`-starting lines.
- Salvageable: Probably, but this is the messiest of the cohort — the rule introduced in the same PR keeps catching the PR's own content. Roughly half the threads are outdated (older snapshots) and half are still on current content.
- Recommended disposition: **continue-after-fix, sequenced-after-#1107.** Concretely: (1) decide the canonical handling of the non-consenting name (likely: redact in all artifacts including verbatim quotes from this PR forward, or carve a narrow named exception in the rule itself); (2) apply naming-consent compliance pass across every file in this PR (including frontmatter, MEMORY.md row text, verbatim quote blocks); (3) §33 header fix — `Operational status:` to `research-grade`, labels back to literal `Scope:`/`Attribution:`/`Operational status:`/`Non-fusion disclaimer:` form; (4) rebase against main; (5) push. Sequence after #1107 because PR #1107 carries the corrections that may make some of #1106's framing obsolete (Aaron noted in #1107 description that #1106's framing is what's being corrected).

### #659 — docs: introduce trajectory pattern + 4 seed trajectories (Aaron 2026-04-28)

- Created: 2026-04-28T01:08:50Z (~7 days old, biggest-stale)
- Author: AceHack
- Branch: `docs/trajectories-pattern-2026-04-28`
- Purpose: Introduces a *trajectory* pattern (open-ended improvement surfaces with future-forecasts vs simple swim-lane organization) and 4 seed trajectory docs. Aaron 2026-04-28 framing: trajectories ≠ swim lanes; trajectories carry future forecasts and world-modelling, swim lanes are pure organization.
- Why dirty: `mergeStateStatus: UNKNOWN` (DIRTY per prompt). 68 unresolved review threads (prompt said 67; off-by-one). The threads pattern: ~50% are about persona-name attribution on current-state surfaces (`docs/trajectories/**` and `docs/TRAJECTORIES.md`) violating the rule in `docs/AGENT-BEST-PRACTICES.md:284-344` (no name attribution outside the closed list of history surfaces); ~40% are about path drift (`tools/TLA/*.tla` doesn't exist — it's `tools/tla/specs/`; `src/Zeta.Core/ZSet.fs` doesn't exist — it's `src/Core/ZSet.fs`; `docs/security/sdl-checklist.md` is actually `docs/security/SDL-CHECKLIST.md`; etc.); ~10% are content-count mismatches (PR description says "4 seed trajectories" but the table shows many more) and Markdown formatting (lines starting with `+` parsed as list markers).
- Salvageable: **No, in its current shape.** This PR collided with two policy surfaces hardened *after* it was opened (the persona-name attribution rule and several pieces of path-drift hygiene). Re-shipping it as 68-thread-fix-up is uneconomical — the diff against current main has likely drifted enormously over 7 days, and the reviewer concerns require a substantive rewrite (every trajectory doc needs persona-names stripped + paths re-verified against current source tree).
- Recommended disposition: **close-as-stale + extract trajectory pattern into a much smaller follow-up PR.** Concretely: (1) close #659 with a comment pointing at the recommended successor PR; (2) extract just the *pattern* — `docs/TRAJECTORIES.md` introducing the concept + 1 minimal seed trajectory authored fresh against current source tree, with role-refs not persona names — into a new PR; (3) backlog the remaining trajectory docs as separate, individually-reviewable PRs (one trajectory per PR). The 7-day age plus the policy-collision plus the 68-thread mass make this the highest-cost salvage; re-authoring smaller is cheaper than revising all 68.

### #655 — tick-history: 2026-04-27T23:58Z through 2026-04-28T03:23Z autonomous-loop session ticks

- Created: 2026-04-28T00:01:42Z (~7 days old)
- Author: AceHack
- Branch: `acehack/tick-history-2026-04-27T23-58`
- Purpose: Tick-history append for autonomous-loop ticks 2026-04-27T23:58Z through 2026-04-28T03:23Z. Documents the #651 + #654 LFG merge through rule-off window, the EAT-packet branch cherry-pick, and a manufactured-patience anti-pattern catch + calibration memory landing.
- Why dirty: `mergeStateStatus: UNKNOWN` (DIRTY per prompt). 0 failing checks. 0 unresolved review threads (12 total threads, all resolved). Pure rebase conflict.
- Salvageable: Yes — doc-only, no policy concerns, all review threads resolved.
- Recommended disposition: **rebase-onto-main + retry merge.** Caveat: this is a *historical* tick-history record (~7 days old). The legacy `loop-tick-history.md` table has since been superseded by `docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md` shards (per the 2026-04-29 surface change documented in CLAUDE.md). Before merging as-is, decide whether the historical tick rows should be (a) merged as-was for fidelity, (b) ported into the new shard format under `docs/hygiene-history/ticks/2026/04/27/` and `2026/04/28/`, or (c) simply abandoned because the new shard layout has filled in equivalent coverage post-2026-04-29. If (a): rebase + merge in one tick. If (b): port + close #655 + open new shard PR. If (c): close-as-stale.

## Recommended action sequence

In priority order (highest leverage / lowest risk first → biggest-effort / most-policy-laden last):

1. **#1200** — rebase + retry merge. Cleanest; 0 unresolved threads, 0 failing checks. Ships in minutes.
2. **#655** — decide (a)/(b)/(c) above; if (a), rebase + retry merge in one tick. (a) is the lowest-risk reading because it preserves history fidelity.
3. **#1183** — add MEMORY.md index entry (fixes the failing check + the P0 thread in one move) + apply 4 review-note edits + push. Single-tick fix.
4. **#1182 + #1181 (batched)** — same-shape fix recipe: §33 header `External-conversation` → `external conversation` + repair dead "See also" links + push. They are intentional companions; land together or not at all to preserve the research arc coherence.
5. **#1107** — naming-consent compliance pass + §33 `Operational status:` value fix + path-drift cleanup + rebase. Sequenced before #1106 because #1107 carries the corrections that supersede #1106's framing.
6. **#1106** — naming-consent compliance pass (the recursive failure where the rule introduced in the PR catches the PR's own content) + §33 header fix + rebase. Sequenced after #1107 to absorb its corrections first.
7. **#659** — close-as-stale + extract trajectory pattern into a much smaller follow-up PR. Highest-cost salvage; re-authoring smaller is cheaper than revising 68 threads against drifted main.

## Cross-cutting observations

- **§33 archive-header lint catches multiple PRs** — `external conversation` (space, lowercase) is the exact phrasing the lint script `tools/hygiene/check-archive-header-section33.sh` matches in the first 20 lines. Several PRs (#1182, #1181, #1107, #1106) violate this with hyphenated or capitalized variants. A documentation pass on `GOVERNANCE.md §33` examples + a §33-header authoring helper script would prevent recurrence. Backlog candidate.
- **Naming-consent rule introduced in #1106 is being violated by #1106 + #1107** — the rule is sound but the PRs that introduce / build on it have not been swept clean. A sweep-refs-style script for naming-consent enforcement (one daughter NOT named anywhere in substrate) would be valuable. Backlog candidate; composes with the existing `sweep-refs` skill.
- **Path-drift in #659** is informative — many references are to historical paths that have since moved (`tools/TLA/` → `tools/tla/specs/`, `src/Zeta.Core/` → `src/Core/`, `docs/security/sdl-checklist.md` → `docs/security/SDL-CHECKLIST.md`). A path-existence linter for new docs (catch broken in-repo links at PR time, not review time) would catch this class. Backlog candidate.
- **PR #1200's `mergeStateStatus: UNKNOWN`** is suspicious for a PR with 0 unresolved threads + 0 failing checks. May be a transient GitHub Pull Requests component degradation per `docs/dependency-status.md`; verify component status before classifying further wait.
