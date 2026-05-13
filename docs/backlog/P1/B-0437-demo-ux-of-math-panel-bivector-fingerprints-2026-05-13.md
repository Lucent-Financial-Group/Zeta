---
id: B-0437
priority: P1
status: open
title: "Demo — UX-of-math panel (bivector fingerprints, partial-credit scoring)"
tier: product-demo
effort: L
created: 2026-05-13
last_updated: 2026-05-13
parent: B-0401
depends_on: [B-0434]
tags: [demo, ux-of-math, bivector, clifford, alignment-ui, github-pages, html, js]
type: feature
---

# B-0437 — UX-of-math panel

## What

A "UX of math" panel in `demo/index.html` that renders bivector fingerprints and
partial-credit scoring in a form non-mathematicians can engage with. Makes the
Clifford/HKT substrate legible as an alignment-signal surface.

## Acceptance criteria

- [ ] Panel renders without errors in `demo/index.html`
- [ ] Displays at least one worked example of a bivector fingerprint
- [ ] Partial-credit scoring concept is explained visually
- [ ] `dotnet build -c Release` → 0 warnings, 0 errors

## Blocked on

None; depends on B-0434 CSS/JS scaffolding (already shipped).
