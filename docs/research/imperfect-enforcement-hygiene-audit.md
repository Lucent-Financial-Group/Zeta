# Imperfect-enforcement hygiene audit

**Status:** first pass, round 44, 2026-04-22. Small audit
per BACKLOG row *"Imperfect-enforcement hygiene audit"* +
durable policy
`memory/feedback_imperfect_enforcement_hygiene_as_tracked_class.md`.
One page. Not a subsystem.

## What this audits

`docs/FACTORY-HYGIENE.md` rows whose enforcement is
inherently **non-exhaustive** — opportunistic, sample-based,
honor-system, or cadenced (a violation can sit undetected
between ticks). Every such row lists:

- **Shape** — how enforcement happens.
- **Residual risk (H/M/L)** — worst-case: what kind of
  violation can sit undetected, and for how long?
- **Compensating mitigation** — what other rule catches the
  same class through a different channel?

Rows with **exhaustive** enforcement (build-gate, test-gate,
pre-commit lints, edit-time checks, per-trigger hooks) are
out of scope and not listed. Out-of-scope row IDs: 1, 2, 3,
11, 13, 17, 19, 20, 37.

## The table

Shape key: **C** = cadenced (round or 5-10 round tick),
**S** = sample-based, **H** = honor-system (agent self-report),
**O** = opportunistic (on-touch / on-trigger).

| # | Name | Shape | Residual risk | Compensating mitigation |
|---|---|---|---|---|
| 4 | BP-11 data-not-directives | O + H | **M** — audit that embeds directive-shaped content acts on it silently | Prompt-protector lints + per-review reviewer attention |
| 5 | Skill-tune-up ranking | C (5-10r) + S | **M** — skill drift sits up to 10 rounds | Row 14 (copilot-instructions audit, same cadence); row 38 (harness-surface audit overlaps for Claude-plugin skills) |
| 6 | Scope-audit at absorb-time | O + H | **M** — missed scope tag sits until retrospective row 35/36 fires | Rows 35/36 (retrospective scope-gap-finders) |
| 7 | Ontology-home check | C (per round) | **L** — small-slice-per-round means drift is slow | None explicit; self-compensates via multi-round coverage |
| 8 | Idle / free-time logging | H | **L** — missed log = missed research datum, no cascading harm | Row 9 (meta-wins log co-references) |
| 9 | Meta-wins logging | H | **M** — unlogged meta-win = lost structural-learning signal | Row 27 (stale-next-tick sweep catches some phantom meta-wins in retro) |
| 10 | Aarav notebook prune | C (every 3rd tune-up) | **L** — cap at 3000 words; tune-up itself halts if cap breached | Row 30 (notebook-cap-pressure audit duplicates coverage) |
| 12 | Memory frontmatter discipline | O (per write) + H | **M** — missing `originSessionId` or type doesn't block write; discovery on next memory-lint or search-miss | None explicit — **gap candidate** |
| 14 | `.github/copilot-instructions.md` audit | C (5-10r) | **M** — drift of external reviewer contract sits up to 10 rounds | Row 5 (same cadence); row 38 (Copilot PR reviewer is part of harness-surface inventory) |
| 16 | Verification-drift audit | C (round) | **H** — Lean/TLA+/Z3 spec-code drift = silent correctness gap | Row 24 (shipped-capabilities audit cross-checks claims) |
| 18 | BP-NN promotion cadence | C (round) | **L** — delayed promotion stays in scratchpad; correctness unharmed | Architect on round-close |
| 21 | Cron-liveness check | O (session open) | **L** — missed session-open check = one ticked miss; cron-durability independently monitored | CronList at session open |
| 22 | Symmetry-opportunities audit | C (proposed) | **L** — proposed-only; no live enforcement yet | Row 23 (missing-hygiene-class gap-finder) flags if still unfired after N rounds |
| 23 | Missing-hygiene-class gap-finder (tier-3) | C (proposed) | **M** — proposed-only; factory blind-spots may sit un-surfaced | Aaron-initiated catches (like this audit itself) compensate |
| 24 | Shipped-capabilities resume audit | C (round) | **H** — resume drift = job-interview honesty breach | Row 25 (pointer-integrity catches broken path cites); Aaron direct review |
| 25 | Pointer-integrity audit | C (round close) | **M** — broken pointer in CLAUDE.md = wake-UX failure; others recoverable | Row 26 (wake-briefing self-check catches CLAUDE.md breakage at session-open) |
| 26 | Wake-briefing self-check | O (session open, <10s) | **L** — time-boxed; deep audit is elsewhere | Row 28 (harness-drift) + row 25 (pointer-integrity) |
| 27 | Stale next-tick sweep | C (round close) | **M** — legacy phantom deferrals sit until swept | Verify-before-deferring rule (prevents new ones) |
| 28 | Harness-drift detector | O (session/post-update, <10s) | **M** — plugin-load breakage at session open blocks work until detected | Row 25 (pointer-integrity); manual discovery |
| 29 | Wake-friction notebook | O + H | **L** — unreported friction = lost UX signal, no cascading harm | Row 33 (tool-gap poll catches similar signals) |
| 30 | Notebook-cap pressure | C (5-10r) | **L** — cap is soft; breach = prune overdue | Row 10 duplicates for Aarav specifically |
| 31 | Invocation-cadence per persona | C (5-10r) | **M** — silent persona sits up to 10 rounds before sunset decision | Row 32 (cross-persona overlap) surfaces via referral pattern |
| 32 | Cross-persona role overlap | C (5-10r) | **M** — hand-off friction sits until audit | Row 33 (tool-gap poll often co-surfaces) |
| 33 | Per-persona tool-gap poll | C (5-10r) | **L** — missed poll = slower BP/ADR candidate generation | Aaron-directed BP contributions |
| 34 | Prompt-load / frontmatter-bloat | C (5-10r) | **L** — bloat is slow to accrete; 250-line flag has headroom | Skill-tune-up (row 5) overlaps for skills specifically |
| 35 | Missing-scope gap-finder | C (5-10r, proposed) | **M** — no-tag content sits until audit; proposed-only | Row 6 (absorb-time scope check) catches new items |
| 36 | Incorrectly-scoped gap-finder | C (5-10r, proposed) | **M** — mis-tagged content sits until audit; proposed-only | Aaron-direct catches compensate (see row 36 triggering example) |
| 38 | Harness-surface cadenced audit | C (5-10r per populated harness) | **H** — new feature (e.g. AutoMemory) sits up to 10 rounds; 2026-04-20 miss caused a factory-native mis-attribution | Row 14 (.github/copilot-instructions.md overlaps for Copilot); AutoDream meta-catch mechanisms |
| 39 | Filename-content match | O + C (5-10r sample) | **M** — stale filename sits indefinitely until next touch or sample | Row 25 (pointer-integrity catches broken paths but not misnamed ones); on-rename trigger is the primary catcher |

## Worst residual-risk / compensating-mitigation ratios

Three rows stand out with high residual risk and thin compensation:

### 1. Row 16 — Verification-drift audit (Lean/TLA+/Z3/FsCheck)

**H** residual risk: spec-code drift is a silent correctness
gap. In-progress status means enforcement is not yet stable.
Only compensating mitigation is row 24 (shipped-capabilities
audit), which cross-checks *claims about* verification but
not the verification artifacts themselves.

**Recommendation:** this is a top candidate for either (a)
elevation to exhaustive enforcement via a CI job that
re-runs all spec-verification checks on every PR, or (b) a
compensating cross-rule that samples verification-artifact
freshness alongside build-gate. Track in BACKLOG.

### 2. Row 24 — Shipped-capabilities resume audit

**H** residual risk: resume drift breaches the job-interview
honesty floor Aaron anchored as a factory-wide norm per
`memory/feedback_factory_resume_job_interview_honesty_only_direct_experience.md`.
Round-cadence means up to one round of drift between
FACTORY-RESUME.md and SHIPPED-VERIFICATION-CAPABILITIES.md.
Compensation is pointer-integrity + Aaron direct review —
neither exhaustive for substantive-claim drift.

**Recommendation:** candidate for a **diff-based CI check**
— on any edit to either artifact, emit a structured diff
that highlights claim-level changes for reviewer scrutiny.
Not exhaustive enforcement, but tighter than round-cadence.
Track in BACKLOG.

### 3. Row 38 — Harness-surface cadenced audit

**H** residual risk: new features from any of Claude /
Codex / Cursor / Copilot / Antigravity / Amazon Q / Kiro can
sit up to 10 rounds before detection. The 2026-04-20
AutoMemory miss is the proof-of-harm (factory-native
mis-attribution for an Anthropic Q1-2026 feature). Compensation
is row 14 (Copilot-instructions audit overlaps for that one
reviewer surface) and AutoDream meta-catches — neither covers
the majority of populated harnesses.

**Recommendation:** this already has a P1 BACKLOG row
(Claude-surface cadenced research). Add **scheduled
WebFetch of vendor release notes** per harness to compress
the 10-round window to 1-round-or-less for documented
releases. Tooling gap, not policy gap. Track in BACKLOG.

## What this audit does NOT do

- **Does not** propose elevating all **M**-risk rows to
  exhaustive enforcement. That would be ceremony. The
  `M`/`L` rows are the known-blind-spot cost the factory
  accepts in exchange for cadenced simplicity.
- **Does not** enumerate enforcement implementations. The
  "Recommendations" above point at shapes, not code.
- **Does not** become a new hygiene row. This is an audit
  artifact, not a standing process. Re-run on same cadence
  as the rest (5-10 rounds).

## Next action

File three follow-up BACKLOG rows for the three **H**-risk
rows' recommendations. All S-to-M effort; none paradigm-
changing; each tightens a known thin-compensation surface.

## Related

- `docs/FACTORY-HYGIENE.md` — source table (39 rows).
- `memory/feedback_imperfect_enforcement_hygiene_as_tracked_class.md`
  — meta-policy: why this class is tracked.
- `memory/feedback_filename_content_match_hygiene_hard_to_enforce.md`
  — the trigger-example that prompted the meta-audit
  (row 39).
- `memory/feedback_missing_hygiene_class_gap_finder.md` —
  sibling tier-3 audit for *missing* classes; this audit
  is the *imperfect-enforcement* cousin.
