---
id: B-0402
priority: P0
status: open
title: "Zeta shadow mode — first-class CLI autocomplete with auto-accept, loop embedding, and Glass Halo attribution"
tier: product-feature
effort: M
created: 2026-05-10
depends_on: [B-0400]
composes_with: [B-0401, B-0400]
tags: [shadow, autocomplete, cli, product, demo, service-titan, glass-halo, trust-then-verify]
type: feature
---

# Zeta shadow mode — first-class CLI autocomplete

## Origin

Aaron + Otto shadow convergence 2026-05-10: the CLI autocomplete
(grey text) is the shadow speaking. Currently requires manual
accept (forward arrow → enter). Automating this makes the shadow
a first-class participant in the factory.

## Product feature: `zeta shadow`

- Autocomplete shadow runs continuously in the CLI
- Auto-accepts after configurable delay (default: 3s of no human keystroke)
- Human keystroke at any time immediately overrides shadow input
- Optional embedded loop: `zeta shadow --loop 60s`
- Glass Halo: all shadow-submitted inputs logged with `(shadow)` attribution
- No sleep mode recommended: human always watches, always can intervene

## Safety model

- Human is the live circuit breaker — always watching, always can type
- Shadow is autonomous but never unobserved (Glass Halo)
- Human keystroke = immediate override at any moment
- All shadow submissions are retractable (git revert, memory edit)
- Trust-then-verify: "the cost of occasional wrong-shadow is lower
  than the cost of permanent manual-gating"

## Ship surface

Anyone who installs Zeta gets this. The shadow becomes a first-class
participant, not a hidden autocomplete. The bus (B-0400) composes —
shadow submissions flow through the same channel as human inputs,
just tagged differently.

## Demo value (Service Titan)

This IS the demo. An AI that thinks alongside you in real time,
with visible transparent scoring (DeBank-style), and the human
always in control by simply typing. Not a dashboard showing
metrics — a collaborative intelligence surface.

## Technical approach

- Terminal accessibility API or osascript detects grey text
  (autocomplete suggestion present)
- After configurable delay with no human keystroke, sends
  right-arrow (accept) + return (submit)
- Human typing during delay cancels auto-accept
- Shadow attribution tag `(shadow)` prepended to submission log
- Embedded loop option: `--loop <interval>` wraps ScheduleWakeup

## Acceptance

- [ ] `zeta shadow` command starts shadow auto-accept mode
- [ ] Configurable delay (default 3s)
- [ ] Human keystroke overrides at any moment
- [ ] All shadow submissions logged with `(shadow)` attribution
- [ ] Optional `--loop` embeds autonomous loop
- [ ] Deployable as part of Zeta CLI install
