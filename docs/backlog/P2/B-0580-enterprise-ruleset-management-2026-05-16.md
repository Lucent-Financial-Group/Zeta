---
id: B-0580
priority: P2
status: open
title: "Enterprise GitHub ruleset management — new layer above org/individual mapping (composes with prior ruleset-divergence smell decomposition)"
tier: factory-infrastructure
effort: M
created: 2026-05-16
last_updated: 2026-05-16
depends_on: []
composes_with: [B-0427, B-0572]
tags: [github, rulesets, enterprise, governance, policy-as-code, dv2-smell]
type: feature
---

# Enterprise GitHub ruleset management

## Origin

Aaron 2026-05-16, immediately after creating a "light default" enterprise-level ruleset at <https://github.com/enterprises/lucent-financial-group/settings/policies/code/16490134>:

> *"we should backlog enterpirse ruleselt managment now we had started decomposing those too for our repo split later, they were smell we have backlog around this. but now enterpirse too not just individiual and team github mapping"*

Two reframings here:

1. **Surface expansion**: previously, ruleset management lived at two layers (individual repo settings + team/org level). Enterprise tier (newly active 2026-05-16 via the 30-day trial — see B-0572) adds a THIRD layer that cascades down to all member orgs. The light default Aaron just created is the enterprise-level baseline.

2. **DV2.0 ruleset-divergence smell composes here**: per `.claude/rules/dv2-data-split-discipline-activated.md`, ruleset divergence across the repo-split (B-0427) was already a known smell. The Enterprise layer multiplies the surface: now we have (individual repo) × (org) × (enterprise) potential divergence.

## What

A tracked work-stream for managing GitHub rulesets coherently across the three layers, with the Enterprise tier as the new top-level governance surface. Specifically:

1. **Inventory current rulesets** across all three layers:
   - Enterprise-level rulesets (just `16490134` — the light default Aaron created)
   - LFG org-level rulesets
   - Per-repo rulesets (Zeta repo, any others under LFG)
2. **Identify divergence smells** — places where layer-rules contradict, duplicate, or shadow each other
3. **Define authoritative-source policy**: which rule belongs at which layer? Default heuristic: enterprise = baseline floor; org = additions for LFG-specific needs; repo = exceptions where genuinely needed
4. **Codify as data** (long-term): the rulesets themselves should ideally live in repo (policy-as-code) and be applied via API rather than UI-clickthrough, so divergence becomes diffable and auditable

## Acceptance criteria

- [ ] Tool `tools/github/list-rulesets.ts` — enumerates rulesets at all 3 layers (enterprise / LFG / Zeta repo) via REST API; outputs structured JSON for diffing
- [ ] Tool `tools/github/audit-ruleset-divergence.ts` — compares rules across layers; flags duplicates, contradictions, shadowing
- [ ] `docs/governance/RULESETS.md` (or similar) — documents the layered policy + which rules belong at which layer
- [ ] Optional: `tools/github/apply-rulesets.ts` — applies rulesets from a YAML/JSON spec (policy-as-code; requires `admin:enterprise` scope for enterprise-layer writes)
- [ ] Composes with B-0427 (repo-split axis 3 — code/English smell test) — ruleset divergence is one face of that smell

## Why now

- Enterprise tier just landed (2026-05-16) — fresh-state opportunity to design the layered governance BEFORE the rulesets sprawl
- Aaron created the first enterprise-level ruleset (`16490134`); future rulesets will follow; without coherent management policy, each addition risks divergence
- Per `dv2-data-split-discipline-activated.md`: this is exactly the kind of partition-by-change-rate question DV2.0 catches — enterprise rules change rarely (hubs), org rules change occasionally (links), per-repo rules change often (satellites)

## Composes with

- B-0427 (axis 3 — Code/English with ruleset-divergence smell test; DV2.0 informs the smell)
- B-0572 (LFG GitHub tier decision — Enterprise trial that created the new ruleset layer)
- `.claude/rules/dv2-data-split-discipline-activated.md` (the smell-detection framework this is downstream of)
- `.claude/rules/lfg-acehack-topology.md` (force-push blocked by non_fast_forward ruleset — concrete example of a layer-level rule)
- `.claude/rules/methodology-hard-limits.md` (rulesets ARE the policy-as-code substrate for governance hard-limits)

## Substrate-honest caveats

- This is a backlog row, not implementation. Concrete work starts when someone (Otto or human) picks it up
- Enterprise-layer write operations require `admin:enterprise` scope (current local PAT lacks it; would need refresh per `gh auth refresh -h github.com -s admin:enterprise`)
- The "policy-as-code" framing is aspirational; current state is UI-clickthrough at all 3 layers
- The light default ruleset Aaron created (`16490134`) is the starting point; we don't yet know what's IN it — Slice 1 (inventory) is the first concrete next step
- Tooling work depends on someone with admin:enterprise scope OR human-in-the-loop UI interaction

## Decomposition into implementation slices

| Slice | Description | Effort | Status |
|-------|-------------|--------|--------|
| 1 | `tools/github/list-rulesets.ts` — REST enumeration at all 3 layers | S | open |
| 2 | Manual audit: what's in `16490134`? + any LFG org rulesets? + Zeta repo rulesets? | S | open |
| 3 | `tools/github/audit-ruleset-divergence.ts` — diff layers, flag conflicts | M | open |
| 4 | `docs/governance/RULESETS.md` — authoritative policy doc | S | open |
| 5 | Optional: `tools/github/apply-rulesets.ts` — policy-as-code apply | L | open (deferred) |

## Open questions

1. **What's in ruleset `16490134`?** — Aaron's "light default" needs inventory before we design anything
2. **Are there other enterprise-level rulesets?** — and is `16490134` the only enterprise ruleset, or one of many?
3. **LFG org-level rulesets** — do any exist? The `lfg-acehack-topology.md` rule mentions `non_fast_forward` rule (host-enforced); is that org-level or repo-level on LFG?
4. **AceHack repo rulesets** — AceHack has its own rulesets (bypass-actor config per `mirror-sync` skill); separate from LFG. Out of scope here but worth noting
5. **Authority gradient**: at which layer should "no force-push to main" live? Enterprise (applies to all orgs) vs LFG-org (applies to all LFG repos) vs Zeta-repo (applies to Zeta only)
6. **Policy-as-code adoption**: when's the right time to move from UI-clickthrough to spec-driven? Probably after Slice 1+2 reveal the actual surface area

## Pre-start checklist

- [ ] Prior-art search: `tools/github/` for any existing ruleset tooling (none expected; backlog row authoring time)
- [ ] Dependency proof: no blockers; this is a fresh feature area
- [x] Layer-context confirmed via Aaron's 2026-05-16 framing + the `16490134` ruleset he created
