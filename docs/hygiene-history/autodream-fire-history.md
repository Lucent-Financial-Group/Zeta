# AutoDream fire history

Per-fire ledger for FACTORY-HYGIENE row #53 (AutoDream cadenced
consolidation — upstream Anthropic Q1 2026 + factory overlays
A/B/C/D). Schema per row #44 (date / agent / output / link /
next-expected).

Authoritative policy:
`docs/research/autodream-extension-and-cadence-2026-04-23.md`.

Upstream feature references:

- `~/.claude/projects/<slug>/memory/reference_autodream_feature.md`
- `~/.claude/projects/<slug>/memory/reference_automemory_anthropic_feature.md`

| Date | Agent | Gate | Overlays fired | Findings | Next expected |
|---|---|---|---|---|---|
| 2026-04-20 | Claude (manual approximation pre-row-#53) | No marker — first known fire | Pre-overlay era | MEMORY.md bootstrap — no overlay framework yet | Superseded by the 2026-04-23 policy doc |
| 2026-04-23 | Claude (first row-#53 fire) | 3 days + ≥5 sessions since 2026-04-20 marker — both gates pass | Light pass: Orientation + Gather Signal (findings-only); Overlays A/B/C/D scheduled for follow-up tick | Per-user MEMORY.md is 345 lines (well over the 200-line cap); 14+ new 2026-04-23 memories not yet indexed cleanly; generic rules in per-user worth candidate migration to in-repo. Full consolidation deferred to a dedicated tick — this fire records the cadence observance and the findings. | Next fire gate-open at ≥24h AND ≥5 sessions from 2026-04-23 (likely 2026-04-26 or later). Overlay A migration candidates land on that fire or earlier opportunistic-on-touch. |
| 2026-04-23 (later, same-day) | Claude (auto-loop-50 opportunistic-on-touch Overlay A) | Same session — not cadence-gated; opportunistic-on-touch per row #53 | Overlay A — first execution | Migrated `feedback_signal_in_signal_out_clean_or_better_dsp_discipline.md` from per-user to in-repo `memory/` (PR #157). Dangling citations from `docs/FACTORY-HYGIENE.md` + `docs/research/autodream-extension-and-cadence-2026-04-23.md` resolved. Per-user source retained with "Migrated to" marker (provenance preserved). Candidate next migrations identified: `feedback_outcomes_over_vanity_metrics_goodhart_resistance.md`, `feedback_deletions_over_insertions_complexity_reduction_cyclomatic_proxy.md`, `feedback_external_signal_confirms_internal_insight_second_occurrence_discipline_2026_04_22.md`, `project_semiring_parameterized_zeta_regime_change_one_algebra_to_map_others_2026_04_22.md` — all generic factory-shape, all cited from the just-migrated file. | Next full-cadence fire at ≥24h AND ≥5 sessions from 2026-04-23. Opportunistic-on-touch continues for the 4 identified candidates as future ticks have budget. |
