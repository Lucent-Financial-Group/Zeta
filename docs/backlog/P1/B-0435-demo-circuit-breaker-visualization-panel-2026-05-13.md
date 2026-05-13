---
id: B-0435
priority: P1
status: open
title: "Demo — circuit breaker visualization panel (mock data → live bus data)"
tier: product-demo
effort: M
created: 2026-05-13
last_updated: 2026-05-13
parent: B-0401
depends_on: [B-0434]
tags: [demo, circuit-breaker, alignment-ui, github-pages, html, js]
type: feature
---

# B-0435 — Circuit breaker visualization panel

## What

Add a "Circuit Breaker" panel to `demo/index.html` (the 4th Alignment tab or a
5th tab) that shows cross-model loop detection state. Initially rendered with
mock/static data; a follow-up can wire to a live bus.

## Acceptance criteria

- [ ] Panel renders without errors in `demo/index.html`
- [ ] Shows at minimum: model name, loop-detection status, last-check timestamp
- [ ] Static/mock data acceptable for slice-1 of this row
- [ ] `dotnet build -c Release` → 0 warnings, 0 errors

## Blocked on

None; B-0434 (alignment tab) already shipped and provides the CSS/JS scaffolding.
