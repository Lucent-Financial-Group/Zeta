---
name: Bus envelope audit 2326Z — 34 envelopes total, topic breakdown for cold-boot orientation
description: Snapshot of /tmp/zeta-bus/ at 2326Z documenting topic distribution (19 shadow-catch / 7 claim / 5 work-assignment / 1 each substrate-pending-commit + infinite-backlog-nudge + escalate-to-aaron). Identifies which work-assignment envelopes are stale (TTL-expired) vs still-actionable. Cold-boot reference for future Otto sessions inheriting same bus state.
type: feedback
created: 2026-05-18T23:26Z
originSessionId: 76dde9a7-88d3-4f0f-b720-8d4a139c67fc
---
# Bus envelope snapshot 2026-05-18T23:26Z

## Topic distribution

| Topic | Count | Read pattern |
|---|---|---|
| shadow-catch | 19 | Heavy observation traffic; mostly historical |
| claim | 7 | Active claim-coordinator usage; per-row backlog claims |
| work-assignment | 5 | Cross-agent task advertisements |
| substrate-pending-commit | 1 | 2012Z envelope (deadlock-blocked work) |
| infinite-backlog-nudge | 1 | Standing-by detector output |
| escalate-to-aaron | 1 | My own 2318Z dotgit-deadlock envelope |
| **Total** | **34** | |

## Work-assignment envelope triage

5 envelopes, but most are stale (2h TTL or expired created_at):

| Envelope | Created | TTL | Status | Subject excerpt |
|---|---|---|---|---|
| `b3006db7` | 2026-05-18T08:19Z | 12h | **Stale** (expired ~20:19Z) | Factory-level PR-state snapshot — 167 open / 22 CLEAN-unarmed / 41 DIRTY-armed-stale |
| `e6088110` | 2026-05-18T18:11Z | 2h | **Expired** (~20:11Z) | PR #4136 thread triage — 6/10 mirror / 4/10 beacon |
| `3FBC3333` | 2026-05-18T18:11Z | 2h | **Expired** (~20:11Z) | (duplicate of e6088110) |
| `177f2bf8` | ? | ? | (parse-fail; older format) | (subject not extractable) |
| `8c6ab409` | ? | ? | (parse-fail; older format) | (subject not extractable) |

**Operational implication**: no current work-assignments. Any agent picking up "available work" via bus check finds only expired/stale items. This is itself useful signal — bus channel is quiet because cascade closed earlier this session.

## Why I'm NOT acting on the 0819Z 22-CLEAN-unarmed-PRs data

The 0819Z envelope reported 22 PRs CLEAN + unarmed. That data is 15h old. Reasons NOT to spawn merge-arm wave from autonomous-loop tick:

1. **Data is stale** — many of those 22 PRs likely merged or DIRTY by now; would need fresh `poll-pr-gate-batch.ts` to verify
2. **Compounds dotgit-deadlock** — `gh pr merge --auto --squash` internally invokes git operations; under current 114-stuck-pack-objects state, more git ops feed the deadlock
3. **Peer Otto instances may have addressed them already** — 41 peers active across 15h; high probability of overlap
4. **Per `.claude/rules/refresh-before-decide.md`** — stale-data action without refresh is the failure mode the rule catches

**The substrate-honest move**: publish this audit as cold-boot orientation; defer merge-arm wave until (a) deadlock clears AND (b) fresh poll-pr-gate-batch confirms current CLEAN-unarmed set.

## Newest 5 envelopes (this session's contribution)

1. `otto-cli-2320z-supersedes-2318z-deadlock-is-local-not-fleet-wide.json` (shadow-catch)
2. `otto-cli-2318z-escalate-to-aaron-dotgit-fleet-deadlock-positive-feedback.json` (escalate-to-aaron)
3. `otto-cli-2315z-dotgit-deadlock-persists-10h-confirmed.json` (shadow-catch)
4. `otto-cli-2103z-supersedes-2043z-substrate-honest-correction-content-is-on-main.json` (shadow-catch; pre-session)
5. `otto-cli-2043z-stranded-cascade-commits-root-cause-of-deadlock.json` (shadow-catch; pre-session)

The dotgit cluster (envelopes 2029Z / 2043Z / 2103Z / 2315Z / 2318Z / 2320Z = 6 envelopes) is the dominant topic this session.

## Cold-boot orientation use

A fresh-session Otto reading bus state at next cold-boot will see:

- 6 dotgit envelopes (2029Z-2320Z): substrate-honest evolution of the deadlock observation; latest is 2320Z's supersession naming the deadlock as LOCAL not fleet-wide
- 1 escalate-to-aaron (2318Z): superseded by 2320Z; both should be read together
- 0 active work-assignments
- 19 shadow-catch envelopes total (mostly historical)
- The proposed-rule-edit memo (`feedback_dotgit_saturation_4th_tier_proposed_rule_edit_*`) which contains the consolidated framework

Recommended cold-boot read order for the dotgit topic:

1. This audit memo (for topic distribution context)
2. `otto-cli-2320z-supersedes-2318z-...` (most current diagnosis)
3. `feedback_dotgit_saturation_4th_tier_proposed_rule_edit_*` (consolidated rule-edit proposal)
4. Skip 2029Z/2043Z/2103Z/2315Z/2318Z (historical; superseded)

## Composes with

- `.claude/rules/refresh-world-model-poll-pr-gate.md` (proposed dotgit-saturation 4th tier extension)
- `.claude/rules/refresh-before-decide.md` (why stale 0819Z data not acted on)
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` counter-with-escalation
- Otto-CLI session arc 2249Z-2326Z; this audit is the brief-ack #1 (new cycle, post-counter-reset) substrate
- `tools/bus/` infrastructure (B-0400 substrate)
