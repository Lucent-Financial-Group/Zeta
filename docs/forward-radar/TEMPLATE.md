# Forward-Radar Memo Template

> **PM-2 role** — proactive product-discovery output surface.
> One memo per research cycle (default: weekly, Sundays UTC).
> Distinct from `docs/ROUND-HISTORY` (backward look) and
> `docs/backlog/` rows (atomic work items). The memo is a
> _forward look_ — what is coming, not what shipped.
> The persona-to-role mapping lives in `docs/EXPERT-REGISTRY.md`.

---

## Memo header

```
id: FR-YYYY-MM-DD
period-start: YYYY-MM-DD
period-end: YYYY-MM-DD
author: pm2
signal-sources: [list below]
predicted-gaps-filed: [B-NNNN, ...]
tech-radar-changes: [list below]
calibration-note: see docs/forward-radar/calibration.md
```

---

## 1 · Signal sources reviewed

List every surface consulted this cycle. Mark each as:

- `✅ reviewed` — surveyed; findings below
- `⏭ skipped` — skipped with reason
- `🔄 deferred` — will catch next cycle

| Surface | Status | Key observations |
|---|---|---|
| `docs/TECH-RADAR.md` (Trial / Adopt / Hold rows) | | |
| `docs/research/` — recent peer-AI ferries | | |
| Upstream-doc WebSearch (Otto-364 search-first) | | |
| Demo target requirements (task #244 / current demo) | | |
| `src/Core/**` public API surface audit | | |
| `docs/GLOSSARY.md` churn (vocabulary signals evolution) | | |
| `docs/CONFLICT-RESOLUTION.md` recent conferences | | |
| Mateo (security-researcher) outputs — non-security gaps | | |
| External: competitor / ecosystem WebSearch | | |

---

## 2 · Predicted feature gaps

_One sub-section per predicted gap. File a `B-NNNN` row immediately;
link it here. PM-2 predicts, PM-1 delivers — keep these rows short
and buildable._

### Gap N — [Short gap name]

- **Signal source**: [what evidence pointed here]
- **User / moment**: [who hits this gap, when]
- **Expected encounter window**: [when will the loop hit this naturally]
- **Backlog row**: B-NNNN (filed / existing)
- **Priority proposed**: P0 / P1 / P2 / P3
- **Scope estimate**: XS / S / M / L

---

## 3 · TECH-RADAR row changes

List any promotions, demotions, or new entries proposed this cycle.
Each change must include the evidence that drove it.

| Row | Change | Evidence |
|---|---|---|
| e.g. `bun` | Trial → Adopt | 6 months of stable build tooling; zero regressions |

---

## 4 · Calibration note

> See `docs/forward-radar/calibration.md` for the running metric.

For this cycle: of friction-encounters that surfaced in the loop since the
last memo, how many were already in the backlog as PM-2-predicted gaps?

- Friction-encounters this period: N
- Of those, predicted in backlog: M
- Lead-time %: M/N × 100 = ___%

---

## 5 · What is coming (the forward look)

Narrative synthesis: 2–4 sentences. What should the factory prepare for
in the next 2–4 weeks that isn't yet in the backlog? Name the signal.
Do not list everything — only the highest-leverage forward signal.

---

_Memo ends. File at `docs/forward-radar/YYYY-MM-DD-[slug].md`._
