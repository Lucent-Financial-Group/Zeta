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
