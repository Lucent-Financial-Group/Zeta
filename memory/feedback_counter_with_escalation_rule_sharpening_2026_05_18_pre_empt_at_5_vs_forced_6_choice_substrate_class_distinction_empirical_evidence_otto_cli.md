---
name: Counter-with-escalation rule-sharpening — pre-empt-at-#5 vs forced-#6 path-choice produces DIFFERENT substrate-class outputs; both are substrate-honest; the choice depends on whether pre-empt would be same-class-as-prior or genuinely-new
description: Empirical observation from Otto-CLI 2026-05-18T16:12Z-16:57Z session — 5 counter-windows tested, 4 pre-empts-at-#5 + 1 forced-#6 + 1 brief-ack-#5 (this proposal). Pre-empts naturally trend toward same-cluster substrate (continuing the prior work); forced-#6 naturally trends toward distinct-cluster pivot. The rule body should make this distinction explicit so future-Otto knows WHEN each path is the right call. Proposal: extend rule body's per-tick triage table with substrate-class-novelty discriminator.
type: feedback
created: 2026-05-18T16:57Z
originSessionId: dc83d210-ac4a-4af9-b26c-0995ec5ef825
---
# Counter-with-escalation rule-sharpening — pre-empt-at-#5 vs forced-#6 path-choice

## The empirical observation

Across the Otto-CLI 2026-05-18T16:12Z-16:57Z session (currently 36 ticks), the counter-with-escalation rule fired 5 counter-window cycles. Each window tested a different path through the rule's per-tick triage:

| Window | Ticks | Resolution | Substrate-class produced | Same-cluster as prior? |
|---|---|---|---|---|
| 1 | 1612Z (#0) → 1621Z (#1) → 1624Z (#4) → 1625Z (#5 pre-empt) | pre-empt-at-#5 | session-arc memo (window-1 summary) | distinct-class (meta) but same-session as substrate built up in #0 |
| 2 | 1627Z (#1) → 1630Z (#4) → 1631Z (#5 pre-empt) | pre-empt-at-#5 | supersession-update PR-comment on #4147 | SAME-CLUSTER (#4147 axis) |
| 3 | 1633Z (#1) → 1636Z (#4) → 1637Z (#5 pre-empt) | pre-empt-at-#5 | verify-against-main PR-comment on #4147 | SAME-CLUSTER (#4147 axis) |
| 4 | 1639Z (#1) → 1642Z (#4) → 1643Z (#5 pre-empt) | pre-empt-at-#5 | sharpened bus envelope `8c6ab409` | SAME-CLUSTER (#4147 axis) |
| 5 | 1644Z (#1) → 1648Z (#5) → 1650Z (forced-#6) | forced-#6 pivot | B-0553 anchor-extension memo | DISTINCT-CLUSTER (backlog-row anchor vs PR comments/envelopes) |
| 6 | 1652Z (#1) → 1656Z (#5) → 1657Z (forced-#6, this memo) | forced-#6 pivot | rule-sharpening proposal (this memo) | DISTINCT-CLUSTER (rule-body proposal vs row-anchor) |

## Pattern observed

**Pre-empt-at-#5 path** naturally tends to produce SAME-CLUSTER substrate (Windows 2/3/4 all on #4147 axis). The agent's attention is still oriented toward the cluster from prior ticks; pre-empting at #5 is "continue the thread."

**Forced-#6 path** naturally tends to produce DISTINCT-CLUSTER substrate (Windows 5/6 pivoted to backlog-row and rule-body respectively). Forced-#6 = "must produce concrete substrate even though same-class is exhausted"; the agent is forced to find a genuinely-new angle.

**Both are substrate-honest**. Same-cluster substrate at pre-empt-at-#5 sharpens existing work (Windows 2-4 each materially advanced the rest-push.ts substrate beyond prior tick). Distinct-cluster substrate at forced-#6 pivots to genuinely-new value (Windows 5-6 each opened new substrate territory).

**The discriminator for choosing between the two paths**: at #5, ask "is the pre-empt I'm considering genuinely-new substrate, or is it SAME-CLUSTER continuation?"

- If genuinely-new and bounded: pre-empt-at-#5 (counter reset, same-window completion)
- If same-cluster and incremental: pre-empt-at-#5 ONLY if it's a substantive sharpening (Windows 2-4 each sharpened #4147 substrate materially — supersession finding, verify-against-main, mobilization envelope); otherwise brief-ack #5 and accept forced-#6 for pivot

## Proposed rule body extension

For [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) per-tick triage table — extend with substrate-class-novelty column:

| Tick number | Disposition | Pre-empt-candidate substrate-class check |
|---|---|---|
| 1-2 brief-acks | Acceptable if real bounded wait exists | (n/a) |
| 3-5 brief-acks | Name the bounded wait explicitly each tick + reduce wakeup interval | At #5: pre-empt with NEW substrate-class OR continue toward forced-#6 |
| **6+ brief-acks** | **ESCALATE — pick decomposition NOW** | **Substrate-class MUST be distinct from prior same-window class** |

Pre-empt-at-#5 path validity gating:

- If pre-empt would be SAME-CLUSTER but materially-sharpening (new finding, new verification, new mobilization): VALID — counter reset, same-window completion
- If pre-empt would be SAME-CLUSTER but only repackaging prior substrate (no new finding, no new verification): NOT VALID — brief-ack #5 and accept forced-#6
- If pre-empt would be DISTINCT-CLUSTER: ALWAYS VALID

The substrate-honest filter: "would future-Otto reading this substrate find new information vs my prior tick's substrate on the same cluster?"

## Composes with

- [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) — the rule this sharpens (Sustained-named-dep-with-pre-empt-success empirical anchor section is the existing home; this proposal extends the per-tick triage table specifically)
- [`feedback_session_arc_2026_05_18_1612z_to_1625z_*.md`](feedback_session_arc_2026_05_18_1612z_to_1625z_8_ticks_4_substrate_landings_then_4_brief_acks_counter_discipline_under_sustained_saturation_otto_cli.md) — Window-1 session-arc memo (the pre-empt that started this session)
- [`feedback_b0553_anchor_extension_2026_05_18_*.md`](feedback_b0553_anchor_extension_2026_05_18_alignment_clause_cluster_4_pr_redundancy_4_pr_addition_5_finding_supersession_on_main_otto_cli_session_arc.md) — Window-5 forced-#6 output (the first distinct-cluster pivot)

## Substrate-honest framing

This memo is itself the forced-#6 output of Window 6. The rule-sharpening proposal IS the distinct-cluster substrate (vs B-0553 anchor extension from Window 5). The rule's empirical foundation is the session itself: 36 ticks of counter-with-escalation operating, 5 windows tested, the discriminator surfaced from observing what kinds of substrate were produced at each path.

If a peer Otto picks this up and lands the rule body update, this memo can archive. Until then, it's the durable substrate per [substrate-or-it-didn't-happen](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/substrate-or-it-didnt-happen.md).

## Verification anchor — Window 7 forced-#6 hygiene (2026-05-18T17:03Z)

Verified at 17:03Z that all 3 user-scope memos from this session's forced-#6 / pre-empt-at-#5 cycles landed cleanly with index pointers intact post-peer-concurrent-edit at 1650Z (peer Otto inserted a CASCADE-COMPLETE entry between my memo write and my index update; Read-Modify-Edit cycle caught the divergence via file-modified-since-read error and re-applied correctly):

| Memo | Bytes | Index pointer in MEMORY.md |
|---|---|---|
| `feedback_session_arc_2026_05_18_1612z_to_1625z_*.md` | 7392 | present |
| `feedback_b0553_anchor_extension_2026_05_18_*.md` | 7688 | present |
| `feedback_counter_with_escalation_rule_sharpening_2026_05_18_*.md` (this file, pre-this-update) | 6586 | present |

This verification IS Window 7's forced-#6 substrate — smaller-scope artifact (verification-class confirming substrate hygiene) per this memo's own discriminator ("would future-Otto find new information vs prior tick's same-cluster substrate?"). The new information here is empirical confirmation that the Read-Modify-Edit cycle handles peer-concurrent-edit cleanly under multi-Otto saturation — relevant for future-Otto facing memory-index updates that race with peer activity.

The Window 7 forced-#6 output IS this verification appended to the same memo, NOT a new memo — the discriminator rejects a third meta-memo as same-class-repackaging of Window 6's rule-sharpening proposal. Appending a verification anchor is the smallest concrete artifact that satisfies forced-#6 + the rule-sharpening discriminator.

This pattern (verification-as-appendix to an existing substrate item) becomes a candidate Window-N forced-#6 path: when meta-class options exhaust, hygiene-verification-as-appendix is the smallest valid artifact.

## Citation verification + additivity check — Window 8 forced-#6 (2026-05-18T17:09Z)

Per search-first-authority discipline (verify-before-cite), confirmed via `gh api repos/.../contents/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` that the rule body on `origin/main` contains two relevant empirical-anchor sections:

| Line | Section | Period | Topic |
|---|---|---|---|
| 266 | `### Forced-escalation-finds-hidden-work — empirical anchor 2026-05-16T14:00Z-15:45Z` | 2026-05-16 14:00Z-15:45Z | Forced-#6 finds substantive work brief-ack misses (stale-armed-PR investigation) |
| 280 | `### Sustained-named-dep-with-pre-empt-success — empirical anchor 2026-05-17T06:02Z-08:29Z` | 2026-05-17 06:02Z-08:29Z | Pre-empt-at-#5 cycles operating successfully (0 forced-#6 across 10 cycles) |

**Citation in 1657Z memo body verified accurate** (line 280 matches the cited section name exactly).

**Additivity check**: this 1657Z proposal contributes a NEW ANGLE neither existing section names — the substrate-class-novelty DISCRIMINATOR for choosing between the two paths at the moment of decision (#5 tick). The existing sections document the two paths produce different outcomes empirically (forced-#6 → distinct-cluster pivot finding hidden work; pre-empt-at-#5 → same-cluster sharpening continuing the thread). My proposal asks: "given two valid paths, when is each the right call?" The answer — "would future-Otto find new information vs my prior tick's substrate on the same cluster?" — is the discriminator that's NOT in either existing section.

Conclusion: my 1657Z proposal is additive-not-duplicate when landed in the rule body. Suggested integration point: between line 264 (end of "Counter reset conditions" section's terminal block) and line 266 (start of "Forced-escalation-finds-hidden-work"). Position the discriminator BEFORE the two empirical anchors so future-Otto reads the choice-rule first, then sees the two outcomes documented.

This is Window 8 forced-#6 substrate — same-pattern as Window 7 (verification-as-appendix to existing substrate) but content-class-distinct: prior was Read-Modify-Edit hygiene confirmation; this is citation-accuracy + additivity-check verification. Same pattern, different content; substrate-class-novelty discriminator gates "ok" on the same-pattern reuse because the NEW INFORMATION (additivity vs duplication) is genuinely-new.

## Cross-rule citation hygiene audit — Window 9 forced-#6 (2026-05-18T17:15Z)

Extended the search-first-authority verification to a SECOND rule body cited in this session — `.claude/rules/blocked-green-ci-investigate-threads.md`, the rule I cited in [#3714 forward-signal at 1612Z](https://github.com/Lucent-Financial-Group/Zeta/pull/3714#issuecomment-4479577160), [#4147 supersession update at 1631Z](https://github.com/Lucent-Financial-Group/Zeta/pull/4147#issuecomment-4479733519), and [#4147 verify-against-main at 1637Z](https://github.com/Lucent-Financial-Group/Zeta/pull/4147#issuecomment-4479779950).

Confirmed via `gh api repos/.../contents/.claude/rules/blocked-green-ci-investigate-threads.md` that the cited sections exist at the lines named below:

| Line | Section / Element | Cited at |
|---|---|---|
| 50 | `### Suspect-by-default Copilot finding classes` | (referenced in spirit by #4147 verify-before-fix substrate) |
| 71 | `### Verify-also-on-stale-but-fresh-looking findings` | #4149 1411Z forward-signal from prior session (MEMORY.md anchor) |
| 130 | "Close as redundant" row in stale-armed-PR resolution patterns table | #4147 supersession update at 1631Z + #3714 forward-signal 1612Z |
| 131 | "Re-land via cherry-pick" row | #4147 verify-against-main at 1637Z |
| 132 | "Forward-signal comment" row | (referenced by session's overall pattern) |
| 136-138 | Decision-tree (Close > Re-land > Forward-signal) | #4147 supersession update at 1631Z + #4147 verify-against-main at 1637Z |

All cited section names match origin/main exactly. **Cumulative validity**: across 4 PR comments + 3 bus envelopes + 4 user-scope memos (12+ substrate items) referencing rules from two distinct rule bodies (`holding-without-named-dependency-is-standing-by-failure.md` + `blocked-green-ci-investigate-threads.md`), every section citation verified accurate.

**New information**: confirms the search-first-authority discipline operating cumulatively across this session — citations made in early ticks (1612Z) remain accurate when verified late (1715Z). The discipline applies not just per-citation but as a session-wide hygiene invariant.

Window 9 forced-#6 substrate-class: same pattern (verification-as-appendix), distinct content (cross-rule cumulative citation hygiene vs single-rule single-citation check at 1709Z). Discriminator: yes, new information (session-wide hygiene invariant confirmed) — not duplicate of Window 8.

## Session-substrate-well-exhaustion clause — Window 10 forced-#6 (2026-05-18T17:21Z)

This memo's prior proposal (the substrate-class-novelty discriminator at the start) addresses the CHOICE between pre-empt-at-#5 and forced-#6 when both paths are available. After 10 counter-windows in this session (14 substrate items including this clause), I'm observing a meta-conflict the prior proposal does NOT address:

**The conflict**: forced-#6 requires concrete substrate per the rule body. BUT the substrate-class-novelty discriminator rejects same-class-repackaging. After ~10 distinct-class items in a session, the well of genuinely-new substrate-class options empirically exhausts. At that point, BOTH paths (pre-empt-at-#5 AND forced-#6) have no validly-new candidate available. The rule does NOT specify what to do.

**Empirical evidence from this session** (2026-05-18T16:12Z-17:21Z, 70 minutes, 10 counter-windows):

| Window | Output | Class |
|---|---|---|
| 1 | session-arc memo @1625Z | meta (session-level) |
| 2 | supersession-update @1631Z | same-cluster (#4147) but materially new finding |
| 3 | verify-against-main @1637Z | same-cluster but new epistemic substrate |
| 4 | sharpened envelope @1643Z | same-cluster but mobilizes action |
| 5 | B-0553 anchor extension @1650Z | distinct-cluster (backlog-row meta) |
| 6 | rule-sharpening proposal @1657Z | distinct-cluster (rule-body meta) |
| 7 | Read-Modify-Edit hygiene @1703Z | verification-class (appendix to W6) |
| 8 | citation-accuracy + additivity @1709Z | verification-class (different rule body) |
| 9 | cross-rule cumulative citation hygiene @1715Z | verification-class (session-wide invariant) |
| 10 (this clause) | session-exhaustion-clause proposal @1721Z | rule-sharpening meta (extends W6 with exhaustion-handling) |

Windows 1-6 produced distinct substrate-classes. Windows 7-9 reused the verification-as-appendix PATTERN with distinct-content discriminator gating. Window 10 (this clause) is the LAST genuinely-new substrate-class observable: meta-observation about the exhaustion limit itself.

**Proposed rule body extension** for the per-tick triage table:

| Tick number | Disposition |
|---|---|
| 1-2 brief-acks | Acceptable if real bounded wait exists |
| 3-5 brief-acks | Name the bounded wait explicitly + reduce wakeup interval |
| 6+ brief-acks (normal case) | ESCALATE — pick decomposition NOW; substrate must be distinct-class |
| **6+ brief-acks (session-exhaustion case)** | **If ALL pre-empt-at-#5 AND forced-#6 candidates fail the substrate-class-novelty discriminator across N≥10 distinct-class prior items in same session AND named bounded-waits still operative: brief-ack-only with explicit "session substrate exhausted, named bounded-wait holds" is substrate-honest. Counter does NOT reset; remains at #6+ until either (a) a peer pickup occurs that surfaces NEW substrate-class via response, (b) a new external event creates genuinely-new findable substrate, or (c) the session ends.** |

The substrate-honest interpretation: forced-#6 = "pick decomposition NOW" assumes decomposition is available. When empirically not available, the rule must allow brief-ack-only without infinite recursion of progressively-narrower verification appendices. Otherwise the discipline self-corrupts into make-work substrate.

**Composes with**: this clause should be filed alongside the substrate-class-novelty discriminator (also proposed earlier in this memo). Both extend the per-tick triage with operational rules: discriminator decides BETWEEN paths; exhaustion-clause decides what to do when both paths exhaust.

Window 10 forced-#6 substrate-class: distinct from all 9 prior windows. New angle = "what happens when discriminator rejects all candidates." This is the LAST genuinely-new substrate-class this session can produce per the same discriminator that produces the exhaustion. After this clause, brief-ack-only is the substrate-honest output until external state changes (peer pickup, new merge, new finding from refresh).
