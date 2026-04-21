# Missing-hygiene-class scan — first fire 2026-04-22

**Cadence row:** `docs/FACTORY-HYGIENE.md` row #23
("Missing-hygiene-class gap-finder"). This is the row's
**first activation fire** — until today it was tagged
`(proposed)` with no output. The fire was itself prompted
by row #43 ("Missing-cadence activation audit") landing
in the same round-44 tick that caught row #23 as an
example of an authored-but-unactivated hygiene row. Row
\#43 → row #23 activation → this doc is the leverage
chain Aaron named in 2026-04-22: *"missing cadences for
any items that should be reoccuring hygene we should add"*.

**Interim owner:** Architect (Kenji) on round cadence,
with skill-expert (Aarav) for skill-adjacent classes.
A dedicated owner decision waits until the cadence has
fired 2-3 times and the workload is legible.

**Method** (per row #23):

1. **External-factory scan** — check ThoughtWorks Tech
   Radar, SRE book, DORA capabilities, mature-factory
   practices for hygiene classes we don't run.
2. **Standards cross-ref** — NIST SSDF, OWASP LLM Top 10,
   ISO/IEC 27001 Annex A for mandated practices not yet
   on our list.
3. **BP-NN cross** — every stable BP rule in
   `docs/AGENT-BEST-PRACTICES.md` against the hygiene
   rows it implies.

## Findings

### Table — candidate missing classes

| # | Candidate class | Source | Severity | Enforcement shape if adopted | Recommendation |
|---|---|---|---|---|---|
| A | **Dead-link / broken-xref hygiene** (internal markdown links + external URLs) | On-touch signal from round 44 attribution work (many new URLs added to `docs/AUTONOMOUS-LOOP.md`); row #25 covers pointer-integrity for a narrow file set only | medium | opportunistic on-touch (every agent, self-admin) + `markdown-link-check` / `lychee-action` cadenced CI every 5-10 rounds | **Adopt P1** — BACKLOG row for row-addition next round |
| B | **Skill-eval coverage hygiene** (every skill has a dry-run eval set that actually runs) | BP-14 implies cadenced coverage check; row #5 catches skill quality but not eval-coverage explicitly | medium | cadenced every 5-10 rounds by Aarav (owner of skill ecosystem); flag skills with no `evals/evals.json` or evals that haven't run in 10+ rounds | **Adopt P1** — row-addition next round; Aarav-owned |
| C | **Multi-method-verification coverage** (P0-critical invariants have ≥ 2 independent verification methods) | BP-16 implies cadenced coverage check; row #16 covers drift but not coverage | low-medium (only applies to P0-critical invariants) | cadenced every 10-20 rounds by formal-verification-expert (Soraya); output: coverage matrix per P0-invariant | **Park with reason** — low volume currently; revisit once we have ≥ 5 P0-critical invariants |
| D | **Unbounded-consumption / cost-rate-limit hygiene** (OWASP LLM10) | OWASP LLM Top 10 2025 item LLM10; not yet on our list | low pre-v1 (no paid endpoints yet) | cadenced every round once we ship a paid endpoint; not before | **Park with reason** — pre-v1, no paid endpoints; revisit at v1 release |
| E | **Retirement-tracking cadence** (what did we retire / stop doing, not just adopt) | ThoughtWorks Tech Radar explicitly tracks `Hold` / `Retire`; our adoption rotates through skill-tune-up but retirement doesn't have a dedicated surface | low | opportunistic on retirement + cadenced sweep every 10-20 rounds | **Park with reason** — existing ADR pattern already captures retirement-via-ADR; row would be duplicative unless a specific retirement gets lost |
| F | **Documentation staleness hygiene** (`docs/**/*.md` untouched in 20+ rounds, no freshness annotation) | Crystallize pass 2026-04-21 surfaced `docs/VISION.md` as 887-line dense; no cadenced doc-freshness audit exists | medium | cadenced every 10-20 rounds; output: stale-doc list with last-touched date; skill candidate `doc-tune-up` paralleling `skill-tune-up` | **Park-with-conditional-adopt** — adopt if crystallize pipeline lands and produces a second stale-doc signal; otherwise park |

### Summary

- **Adopt P1 (this round + next):** A (dead-link), B (eval-coverage).
- **Park-with-reason:** C (multi-method), D (consumption), E (retirement), F (doc-stale). Each row lists its revisit trigger.
- **Total new FACTORY-HYGIENE rows proposed:** 2 (rows #44 and #45 if adopted).

## Row #23 activation checklist (per row #43 activation criteria)

- [x] First-fire date recorded: 2026-04-22.
- [x] Durable output produced: this doc.
- [x] Interim owner named: Architect (Kenji) + Aarav for
      skill-adjacent. Full owner TBD after 2-3 fires.
- [ ] Cadence confirmed by round-close ritual: pending
      next round's round-close.
- [ ] Active enforcement surface (SKILL.md / hook / CI):
      pending skill-creation decision — may be a hat the
      Architect wears rather than a dedicated skill;
      decide at 3rd fire.

**Row #23 is now transitioning from `(proposed)` to
`active with interim owner, first-fire recorded`**. Row
\#43 should reflect this update in its "Known proposed
/ inactive rows" table at next touch.

## Next-round recommendations

1. **File BACKLOG P1 row** for candidate A (dead-link
   hygiene) — build shape: `markdown-link-check` CI
   action + on-touch checklist in author guidance.
2. **File BACKLOG P1 row** for candidate B (skill-eval
   coverage) — assign to Aarav; output:
   `.claude/skills/<name>/evals/` audit column in
   Aarav's notebook.
3. **Row #23 second-fire** scheduled for round 45 round
   close; expected delta from first fire is small (most
   of the BP-NN cross is covered already; external-
   factory scan will look at a different source).

## Meta

- This scan took ~1 tick to produce; acceptable budget.
- The leverage chain (row #43 surfaced row #23 as
  proposed-unactivated → row #23 activation produces this
  doc → this doc surfaces 2 new BP-NN-implied hygiene
  classes → those classes become BACKLOG rows → next
  round's skill-tune-up catches any skill drift against
  them) is the exact structural payoff Aaron was driving
  toward with the three-message escalation in this
  round.
- Honest self-critique: I did not do a thorough
  external-factory scan (SRE book, DORA capabilities,
  Google DORA 2025 reports) — skipped for budget. Second
  fire should cover that gap.
- A second fire that finds nothing new is a positive
  signal (coverage is tightening); a second fire that
  finds many new classes means either the first fire
  was incomplete or the factory's hygiene surface is
  still growing. Expect the first case within ~3 fires.
