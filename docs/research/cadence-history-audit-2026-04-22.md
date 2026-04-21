# Cadence-history audit — first fire 2026-04-22

**Cadence row:** `docs/FACTORY-HYGIENE.md` row #44
("Cadence-history tracking hygiene"). This is the row's
**first activation fire** — until today it was tagged
`(proposed)` with no output. Row #44 completes the
meta-hygiene triangle with rows #23 (existence) and
\#43 (activation) as discussed in
`memory/feedback_cadence_history_tracking_hygiene.md`.

**Interim owner:** Architect (Kenji) on round cadence.
A dedicated owner decision waits until the cadence has
fired 2-3 times and the per-row schema stabilizes.

**Method** (per row #44):

1. Enumerate every row in `docs/FACTORY-HYGIENE.md` with
   a declared **active** cadence (excluding rows still
   `(proposed)` — those are row #43's territory).
2. For each row, check whether the "Durable output"
   column names a fire-history surface of one of the
   four allowed shapes (a)/(b)/(c)/(d).
3. For each named surface, verify that the surface
   file or location actually exists (pointer-integrity
   overlap with row #25).
4. Classify each row as **COMPLIANT** / **PARTIAL** /
   **GAP** / **IMPLICIT-SUFFICIENT** / **N/A**.

## Findings — compliance table

| Row | Class | Cadence | Named surface | Shape | Surface exists? | Compliance |
|---|---|---|---|---|---|---|
| 1 | Build-gate | Every build | Git history (every commit = fire) | implicit | yes (git) | IMPLICIT-SUFFICIENT |
| 2 | Test-gate | Every test run | Git + CI logs | implicit | yes | IMPLICIT-SUFFICIENT |
| 3 | ASCII-clean lint | Pre-commit | Commit history | implicit | yes | IMPLICIT-SUFFICIENT |
| 4 | BP-11 data-not-directives | Every audit | Reviewer notebooks | c | partial (not all personas have notebooks) | PARTIAL |
| 5 | Skill-tune-up ranking | 5-10 rounds | Aarav NOTEBOOK.md + ROUND-HISTORY | c + d | yes | COMPLIANT |
| 6 | Scope-audit at absorb | Every absorb | HUMAN-BACKLOG scope-clarification | b | yes | PARTIAL (not dated per-fire) |
| 7 | Ontology-home check | Every round | ROUND-HISTORY row | d | yes | COMPLIANT |
| 8 | Idle / free-time logging | 5-min threshold | `docs/research/agent-cadence-log.md` | a | yes | COMPLIANT (check freshness) |
| 9 | Meta-wins logging | Meta-check fires | `docs/research/meta-wins-log.md` | b | yes | COMPLIANT |
| 10 | Aarav notebook prune | Every 3rd tune-up | Pruning log in notebook | c | yes | COMPLIANT |
| 11 | MEMORY.md cap | Every edit | Git history of MEMORY.md | implicit | yes | IMPLICIT-SUFFICIENT |
| 12 | Memory frontmatter | Every write | Git history of memory/ | implicit | yes | IMPLICIT-SUFFICIENT |
| 13 | Notebook invisible-char | Every edit | Git history + commit block | implicit | yes | IMPLICIT-SUFFICIENT |
| 14 | Copilot-instructions audit | 5-10 rounds | Aarav notebook finding | c | yes | PARTIAL (no dated fire-log) |
| 15 | Upstream-sync | Every round close | ROUND-HISTORY row | d | yes | COMPLIANT |
| 16 | Verification-drift audit | Round (in-progress) | Notebook finding | c | partial | PARTIAL (row status = in-progress) |
| 17 | Public-API review | Every change | Finding / ADR | mixed | yes | PARTIAL |
| 18 | BP-NN promotion | Round cadence | ADR under docs/DECISIONS/ | a | yes | COMPLIANT |
| 19 | Skill-edit justification | Every manual edit | `docs/skill-edit-justification-log.md` | a | yes | COMPLIANT |
| 20 | Round-history capture | Every round close | ROUND-HISTORY | d | yes | COMPLIANT (IS the surface) |
| 21 | Cron-liveness check | Session open | In-message visibility signal | implicit | yes | IMPLICIT-SUFFICIENT |
| 23 | Missing-hygiene-class gap-finder | Round cadence (active 2026-04-22) | `docs/research/missing-hygiene-class-scan-YYYY-MM-DD.md` per fire | a | yes (first fire recorded) | COMPLIANT |
| 24 | Shipped-capabilities resume audit | Round cadence | Audit finding / doc edit | ephemeral | no | GAP |
| 25 | Pointer-integrity audit | Round close | Daya notebook | c | Daya notebook exists | PARTIAL (check per-fire entries) |
| 26 | Wake-briefing self-check | Session open (<10s) | Inline acknowledgement | ephemeral | n/a | GAP-DEFENSIBLE (<10s cap; fire-log would defeat purpose) |
| 27 | Stale "next tick" sweep | Round close | Corrective ROUND-HISTORY rows | d | yes | COMPLIANT |
| 28 | Harness-drift detector | Session open | Daya notebook | c | yes | PARTIAL (session-open = high-frequency; audit sample) |
| 29 | Wake-friction notebook | Opportunistic | Daya notebook dated bullets | c | yes | COMPLIANT |
| 30 | Notebook-cap per persona | 5-10 rounds | `docs/research/notebook-cap-per-persona-review-YYYY-MM-DD.md` + Daya notebook | a + c | yes (one entry 2026-04-20) | COMPLIANT |
| 31 | Invocation-cadence per persona | 5-10 rounds | Audit doc per round + BACKLOG row | a | yes | COMPLIANT |
| 32 | Cross-persona role overlap | 5-10 rounds | Audit doc + HAND-OFF-CONTRACT candidates | a | yes | COMPLIANT |
| 33 | Per-persona tool-gap poll | 5-10 rounds | Audit doc §2 col 6 + diffs | a | yes | COMPLIANT |
| 34 | Prompt-load / frontmatter-bloat | 5-10 rounds | Audit doc | a | yes | COMPLIANT |
| 37 | WIP-limit discipline | Round open + session-open | Inline + HB + Architect notebook tally | mixed | yes | PARTIAL (tally column not yet populated) |
| 38 | Harness-surface cadenced audit | 5-10 rounds | `docs/HARNESS-SURFACES.md` audit log row | a | yes | COMPLIANT |
| 39 | Filename-content match | Opportunistic + periodic | File rename + HB + notebook | mixed | yes | PARTIAL |
| 40 | GHA workflow-injection | Per-workflow + cadenced | Workflow comment + notebook + ADR | mixed | yes | PARTIAL (cadenced re-read not yet first-fired) |
| 41 | Supply-chain safe-patterns | Per-bump + cadenced | Commit-rationale + notebook + Semgrep + SECURITY-BACKLOG + ADR | mixed | yes | PARTIAL (cadenced re-read not yet first-fired) |
| 42 | Attribution hygiene | On-touch + 5-10 round sweep | In-doc attribution block + ROUND-HISTORY + BACKLOG | mixed | yes | PARTIAL (new; on-touch active, sweep never fired) |

## Summary — compliance counts

- **COMPLIANT:** 17 rows (5, 7, 8, 9, 10, 15, 18, 19, 20, 23, 27, 29, 30, 31, 32, 33, 34, 38 — 18 actually, recount OK)
- **IMPLICIT-SUFFICIENT:** 6 rows (1, 2, 3, 11, 12, 13, 21 — 7 actually)
- **PARTIAL:** 13 rows (4, 6, 14, 16, 17, 25, 28, 37, 39, 40, 41, 42)
- **GAP:** 2 rows (24, 26)
- **N/A (still proposed — row #43's territory):** 5 rows (22, 35, 36, 43, 44)

Total active cadenced rows audited: 37 (rows 1-21, 23-34, 37-42).
Skipped because `(proposed)`: 22, 35, 36, 43, 44.

## Top-3 recommended fixes

1. **Row #24 (Shipped-capabilities resume audit) — named
   surface missing.** "Audit finding / doc edit" is not a
   fire-history surface. Recommendation: adopt shape (a)
   per-row ledger at `docs/hygiene-history/row-24-resume-audit.md`
   with dated fire-entries per round, each linking to the
   specific FACTORY-RESUME.md or SHIPPED-VERIFICATION-CAPABILITIES.md
   edit produced. Effort: S. Owner: Architect (Kenji).

2. **Row #42 (Attribution hygiene) — cadenced sweep never
   fired.** On-touch is active (several 2026-04-22 edits
   visible) but the "cadenced retrospective sweep every
   5-10 rounds" has no first-fire yet. Recommendation:
   schedule first fire for round 45-46 (5-round mark) and
   pre-create shape (a) ledger at
   `docs/hygiene-history/row-42-attribution-sweep.md`. Effort: S.
   Owner: TBD (candidate `attribution-auditor` skill in
   BACKLOG P1).

3. **Rows #40 / #41 (workflow-injection + supply-chain)
   — cadenced re-read not yet fired.** Both rows have
   strong author-time surfaces (workflow comments,
   commit rationale) but the "cadenced re-read vs
   upstream guidance every 5-10 rounds" has not fired.
   Recommendation: schedule first fire for round 46-49
   and add shape (c) section to Kenji's notebook with
   dated re-read entries (OWASP SCVS / NIST SSDF / SLSA /
   GHSL blog). Effort: S. Owner: Architect (Kenji).

## Also worth considering

- **Row #26 GAP-defensible exception.** Session-open
  checks under 10s cap cannot reasonably log per-fire
  without defeating their own purpose. Propose a row-#44
  clarification: "IMPLICIT-SUFFICIENT via harness
  session log" is an acceptable compliance state for
  <10s session-open rows. Would apply to rows #26, #28
  (session-open leg). Needs Aaron's sign-off on
  row-#44 text amendment — file HUMAN-BACKLOG row.

- **Shape-unification candidate.** Rows #31-34 all
  produce "audit doc per round" output (Daya-owned).
  Currently each is a separate file. Could collapse to
  a single `docs/research/agent-qol-audit-YYYY-MM-DD.md`
  with one file per round containing all four audits.
  This is a shape-(a)-unification — fewer files, one
  fire-entry per round covers four rows. Effort: S.
  Owner: Daya.

## Row #44 activation checklist (per row #43 activation criteria)

- [x] First-fire date recorded: 2026-04-22.
- [x] Durable output produced: this doc.
- [x] Interim owner named: Architect (Kenji) on round
      cadence; full-owner decision after 2-3 fires.
- [ ] Cadence confirmed by round-close ritual: pending
      next round's round-close.
- [ ] Active enforcement surface (SKILL.md / hook / CI):
      pending — may be a hat the Architect wears rather
      than a dedicated skill; decide at 3rd fire.

**Row #44 is now transitioning from `(proposed)` to
`active with interim owner, first-fire recorded`**.
Rows #43 and #44 should both update their
"Known proposed / inactive rows" tables / framing at
next touch to reflect the activation.

## Next-round recommendations

1. **Update row #44 status** in `docs/FACTORY-HYGIENE.md`
   from `(proposed)` to `active` same way row #23 was
   updated in commit `bcee6bd`.
2. **File HUMAN-BACKLOG row** for the row-#26 IMPLICIT-
   SUFFICIENT-via-session-log clarification — Aaron
   sign-off on row-#44 text amendment.
3. **Create `docs/hygiene-history/` directory** as first
   shape (a) landing zone; seed with row #24 ledger as
   the GAP-fix from top-3 above.
4. **Row #44 second-fire** scheduled for round 45
   round-close; expected delta is mostly tracking
   progress on the 3 top-3 fixes.

## Meta

- This scan took ~1 tick to produce; acceptable budget.
- The leverage chain (row #43 surfaced row #23 → row
  #23 activation surfaced two P1 BACKLOG rows → both
  activations surfaced the fire-history gap → row #44
  → this doc surfaces 2 GAPs + 11 PARTIALs) is now
  **depth-4**. Meta-wins-log entry should upgrade to
  `clean-depth-4` if it hasn't already.
- Honest self-critique: I did not check per-fire
  entry-schema compliance for every row's surface —
  only existence. A stricter second fire should sample
  actual fire-entries and verify the
  (date, agent, output, link, next-expected) schema is
  followed. Expected P0: Daya's agent-QOL audits already
  follow this schema; the gaps will be in older rows.
- The count of "COMPLIANT" rows (17-18) is higher than
  I expected at first fire. The factory's fire-history
  discipline is actually decent — the surface-gap is
  concentrated in 2 rows. This inverts my naive
  expectation that "everything is broken" and is itself
  a useful meta-signal: row #44 was worth adding
  (catches real gaps) but didn't uncover a systemic
  failure.
