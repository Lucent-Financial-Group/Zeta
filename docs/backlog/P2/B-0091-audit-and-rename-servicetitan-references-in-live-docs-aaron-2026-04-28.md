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
   --glob '!**/docs/decision-proxy-evidence/**' \
   --glob '!**/references/upstreams/**'
```

12 files matched. Reclassification per the **context-sensitive** rule (rule memory was refined after initial draft):

- 2 KEEP-NAME (pitch context — ServiceTitan is correctly named there)
- 1 BODY-REWORD (reusable sample → generic naming)
- 3 PER-ROW inspection (depends on whether row is in pitch context)
- 1 MIXED (line-by-line)
- 1 AGGREGATE (regenerate after per-row)
- 4 HISTORICAL or generated-artifact (preserve verbatim)

## Scope

### KEEP-NAME (2 — pitch context; ServiceTitan correctly named)

1. **`docs/plans/servicetitan-crm-ui-scope.md`** — pitch-target scope doc. ServiceTitan IS the named adoption target. Action: inspect body for any unrelated brand-bleed; otherwise leave (path + content as-is).
2. **`docs/pitch/README.md`** — pitch doc. ServiceTitan is the named adoption target. Action: inspect for unrelated brand-bleed; otherwise leave.

### BODY-REWORD (1 — reusable surface)

3. **`samples/FactoryDemo.Db/README.md`** — generic-sample README. Reusable beyond pitch target. Action: rewrite to "external UI demo" / "external CRM API demo" so the sample reads as reusable.

### MIXED (1 — line-by-line inspection)

4. **`docs/FACTORY-DISCIPLINE.md`** — governance / contributor doc. Where it's naming the demo → generic. Where it's structural disclosure of funding chain / org-access scope → preserve precisely.

### PER-ROW inspection (3 — context depends on row)

5. **`docs/backlog/P2/B-0017-operational-resonance-dashboard-frontier-bulk-alignment-ui-with-continuous-ux-research-meta-recursive.md`** — UI dashboard row. Inspect: pitch context or generic?
6. **`docs/backlog/P2/B-0090-cadenced-lost-substrate-recovery-audit-aaron-2026-04-28.md`** — already partially-fixed in this session's commit (removed brand-bleed from "renamed from ServiceTitan"). Verify clean.
7. **`docs/backlog/P3/B-0008-investigate-ci-macos-slim-nightly-move-if-doubles-pr-wait-time.md`** — CI row. Inspect.

### AGGREGATE (1 — regenerate last)

8. **`docs/BACKLOG.md`** — references per-row files. Regenerate AFTER all per-row inspections + rewrites land. (Per source-set-regeneration-hazard rule.)

### Historical narrative (2 — preserve verbatim)

- `docs/ROUND-HISTORY.md` — round-by-round historical record per CLAUDE.md no-churn-history rule.
- `docs/force-multiplication-log.md` — historical narrative log.

### Generated artifacts (2 — accept as historical OR regenerate)

- `tools/alignment/out/round-39/citations.json` — alignment artifact from round 39. Either accept as historical record (most likely) or regenerate the round if the input substrate has changed.
- `tools/alignment/out/round-39/citations.dot` — same.

## Acceptance

- [ ] KEEP-NAME files (2) verified correctly named (pitch context); only unrelated brand-bleed (if any) cleaned.
- [ ] BODY-REWORD file (1) uses generic naming.
- [ ] PER-ROW files (3) inspected and reclassified to KEEP-NAME or BODY-REWORD per their actual context.
- [ ] MIXED file (FACTORY-DISCIPLINE) preserves funding-chain + org-access-scope disclosure precisely; demo-naming generic where used.
- [ ] BACKLOG.md regenerated AFTER all per-row updates land (source-set-regeneration-hazard rule).
- [ ] No new ServiceTitan references introduced in **non-pitch / non-disclosure** contexts (rule encoded in memory; future Otto applies).
- [ ] Final audit shows: matches in live-repo scope are LIMITED to legitimate pitch-target / disclosure / historical contexts. **The acceptance metric is "all remaining matches are correctly-named for context," not "zero matches."**

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
