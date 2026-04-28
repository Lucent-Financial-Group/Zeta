---
id: B-0091
priority: P2
status: open
title: Audit + rename ServiceTitan references in live (non-historical) repo surfaces — use generic "external UI demo" / "external CRM API demo" forward-going
tier: factory-hygiene
effort: M
ask: maintainer Aaron 2026-04-28T23ish *"we don't have to say service titan anywhere in this repo other than to say that's my day job, they fund me, i fund you, and you don't have org rights to their github only the lfg."*
created: 2026-04-28
last_updated: 2026-04-28
composes_with:
  - B-0090
tags: [aaron-2026-04-28, factory-hygiene, naming-canonical, scope-of-org-access, external-ui-demo, beacon-safe-naming]
---

# B-0091 — Audit + rename ServiceTitan references in live docs

## Source

Aaron 2026-04-28T23ish:

> *"servicetitan-factory-demo-api-csharp we can just say
> external UI demo or something like that, we don't have to
> say service titan anywhere in this repo other than to say
> that's my day job, they fund me, i fund you, and you don't
> have org rights to their github only the lfg."*

Encoded as rule in
`memory/feedback_servicetitan_naming_scope_of_org_access_external_ui_demo_aaron_2026_04_28.md`.

## Audit results (2026-04-28)

Live-repo ServiceTitan references via:

```bash
rg -i 'service ?titan' \
   --glob '!**/memory/**' \
   --glob '!**/docs/research/**' \
   --glob '!**/docs/aurora/**' \
   --glob '!**/docs/amara-full-conversation/**' \
   --glob '!**/docs/hygiene-history/**' \
   --glob '!**/docs/pr-preservation/**' \
   --glob '!**/docs/decision-proxy-evidence/**'
```

12 files matched. 8 need active rewriting; 2 are historical narratives that stay verbatim; 2 are generated artifacts.

## Scope

### Active-rewrite files (8)

1. **`docs/plans/servicetitan-crm-ui-scope.md`** — PATH-RENAME — file path itself contains the term. Rename to `docs/plans/external-crm-ui-scope.md` (or similar) + update body to use generic terms.
2. **`samples/FactoryDemo.Db/README.md`** — BODY-REWORD — uses ServiceTitan as the demo's "what" name. Rewrite to "external UI demo" / "external CRM API demo."
3. **`docs/FACTORY-DISCIPLINE.md`** — MIXED — line-by-line inspection. Where it's naming the demo → generic; where it's structural disclosure of funding chain / org-access scope → preserve precisely.
4. **`docs/pitch/README.md`** — PUBLIC-FACING — pitch doc. Rewrite to generic; ServiceTitan stays only in funding-chain disclosure context if any.
5. **`docs/BACKLOG.md`** — AGGREGATE — references per-row files. Regenerate after per-row updates land (per the source-set-regeneration-hazard rule, only after ALL per-row files are rewritten).
6. **`docs/backlog/P2/B-0017-operational-resonance-dashboard-frontier-bulk-alignment-ui-with-continuous-ux-research-meta-recursive.md`** — PER-ROW — rewrite naming references.
7. **`docs/backlog/P2/B-0090-cadenced-lost-substrate-recovery-audit-aaron-2026-04-28.md`** — PER-ROW (just authored 2026-04-28) — already partially fixed in this session's commit; verify clean.
8. **`docs/backlog/P3/B-0008-investigate-ci-macos-slim-nightly-move-if-doubles-pr-wait-time.md`** — PER-ROW — rewrite naming references.

### Historical narrative (2 — preserve verbatim)

- `docs/ROUND-HISTORY.md` — round-by-round historical record per CLAUDE.md no-churn-history rule.
- `docs/force-multiplication-log.md` — historical narrative log.

### Generated artifacts (2 — accept as historical OR regenerate)

- `tools/alignment/out/round-39/citations.json` — alignment artifact from round 39. Either accept as historical record (most likely) or regenerate the round if the input substrate has changed.
- `tools/alignment/out/round-39/citations.dot` — same.

## Acceptance

- [ ] All 8 active-rewrite files use generic naming ("external UI demo" / similar) for the demo/sample/API context.
- [ ] Funding-chain + org-access-scope disclosure preserved precisely where it appears (e.g., FACTORY-DISCIPLINE governance section if relevant).
- [ ] PATH-RENAME applied for `docs/plans/servicetitan-crm-ui-scope.md`.
- [ ] BACKLOG.md regenerated AFTER all per-row updates land (avoids the source-set-regeneration-hazard).
- [ ] Audit re-run shows zero matches in live-repo scope (excluding the two historical narratives + two artifacts).
- [ ] No new ServiceTitan references introduced in subsequent commits (rule encoded in memory; future Otto applies it).

## Why P2

The brand-bleed risk is non-blocking but real. Forward-going work needs the discipline applied; existing references can be cleaned up on the same cadence as other factory-hygiene work (B-0090).

## Composes with

- `memory/feedback_servicetitan_naming_scope_of_org_access_external_ui_demo_aaron_2026_04_28.md`
  — the rule this row operationalizes.
- `B-0090` — cadenced lost-substrate recovery; this audit-and-rename work composes with that audit cadence.
- **Beacon-safe naming family** — Mirror→Beacon vocabulary upgrade; this rule applies the same discipline to brand naming.
- **Source-set-regeneration-hazard rule** — BACKLOG.md regeneration must wait until all per-row files are clean.

## What this row does NOT do

- **Does NOT** scrub historical surfaces. ROUND-HISTORY, force-multiplication-log, memory/*, docs/research/*, amara-conversation archives stay verbatim.
- **Does NOT** rename the worktree branch `feat/servicetitan-factory-demo-api-csharp`. That branch is in lost-substrate surface (B-0090 audit); the branch name is historical record of work-in-progress.
- **Does NOT** require AceHack-side changes. AceHack worktrees / branches are out of scope for this LFG-resident audit.

## Pickup

When picking this up:

1. Read `memory/feedback_servicetitan_naming_scope_of_org_access_external_ui_demo_aaron_2026_04_28.md` first for the rule.
2. Process per-row backlog files first, leaving BACKLOG.md regeneration for last.
3. PATH-RENAME for `docs/plans/servicetitan-crm-ui-scope.md` requires both `git mv` AND body rewrite + xref updates.
4. FACTORY-DISCIPLINE.md needs careful line-by-line — preserve structural disclosure (funding chain) while removing brand-bleed (demo / sample naming).
5. Re-run the audit command after each batch of changes to track progress.
6. Final state: zero matches in live-repo scope.
