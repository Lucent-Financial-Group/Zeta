---
name: zeta-is-proven-by-default-unproven-is-explicit-opt-out-ace-surface-is-zeta-ace-shields-zeta
description: End-goal polarity — Zeta is math-proven BY DEFAULT (unproven is the explicit opt-out, not the norm); Ace's surface IS Zeta; Ace + platform deps + other package-manager deps exist to SHIELD Zeta's proven core
metadata:
  node_type: memory
  type: project
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-02 (verbatim):

> *"so imagine aces surface is zeta and zeta is math proven unless explicitly
> stated otherwise that's the end gold not having proof is opt out but the
> default is it's expected. ace has that and platform deps and other
> packapanager deps and that's really all in support of zeta to shield it."*

**The polarity inversion (load-bearing).** This INVERTS the default I'd been
operating under. `labeling-confidence` + B-1007 treat *proven/canonical* as the
**top tier you climb TO** — proof is opt-IN; the absence of proof is a normal
intermediate state (observed/hypothesized/validated → canonical). The end-goal
flips it:

- **Zeta is math-proven BY DEFAULT.** Every item silently carries "proven"
  status unless explicitly flagged otherwise.
- **Unproven is the OPT-OUT** — the marked exception that must be *explicitly
  stated*. An unflagged item is *claiming* proof, not merely lacking it.
- "the default is it's expected" — proof is the assumed floor, not the summit.

Operationally this is much stronger: absence-of-a-badge becomes a CLAIM (proven),
so a wrong default is a lie, not a gap. The ship/registry gate at end-state =
"proof-lineage-edge present **OR** explicit `unproven`/`opt-out` flag present" —
silence ≠ permission; silence = proven-assertion.

**This is the END-GOAL, not current state.** B-1007 (landed 2026-06-02) names the
gap honestly: we're at proof-almost-*nowhere* (every B-1000 law example-tested
only; no FsCheck; no hex/4×4 lineage). The distance from here (≈zero canonical) to
there (proven-by-default) IS the formal-coverage debt. The inversion is the
direction of travel; B-1007 + Soraya's standing cadence is the engine.

**Ace's surface IS Zeta.** Ace (the package-manager-of-package-managers,
`docs/agendas/ace-package-manager/`) doesn't present *itself* as the product — it
presents **Zeta** as its face/surface. What a consumer sees through Ace is the
proven Zeta registry/BCL.

**Ace + platform deps + other pkg-mgr deps = the SHIELD around Zeta's proven
core.** "that's really all in support of zeta to shield it." The whole
dependency-management machinery exists to PROTECT the proven core from the
unproven outside world:

- Zeta core = the proven-by-default registry/BCL (the homeostats proven from seed).
- Ace + platform deps + other package-manager deps = the **membrane/adapter
  layer** that handles the unproven external ecosystem (other packages, other
  platforms, other pkg-mgrs) so Zeta's proven-by-default invariant holds INSIDE.
- This IS [[hexagonal-own-interfaces-is-the-io-monad-shape]] / bcl-interface-boundary
  at the WHOLE-SURFACE scope: Ace is the adapter/port boundary; 3rd-party deps
  adapt IN through it; the proven Zeta core never depends on unproven external
  interfaces directly. Ace = the shield that keeps the core's proof-default true.
- Composes [[automated-tests-are-the-shield-assert-dont-skip]] (the shield is
  real coverage, a hole reads as covered) at the dependency-boundary scope: a
  hole in Ace's shield = an unproven dep leaking into the proven core unbadged.

**Composes with substrate:**
- [[formal-proof-first-consensus-not-validation-canonical-is-homeostat-proven-from-seed]]
  — this is its END-GOAL POLARITY. Formal-proof-first says "the math is the only
  thing that promotes to canonical"; THIS says "at end-state, canonical/proven is
  the DEFAULT and unproven is the flagged exception." Same axiom, inverted default.
- `labeling-confidence-...` — the inversion of its default tier (proven-floor not
  proven-summit; unproven wears the badge).
- `algebra-first-admission-...` (registry/BCL = proven core) · B-1006 (registry) ·
  B-1000 (the engine) · B-0998/B-0999 (hex/4×4 lineage = the proof anchor) ·
  the Ace agenda (`docs/agendas/ace-package-manager/`) · B-1007 (the gap-naming row).
- god-tier register: "that's the end gold" is HIGH-SIGNAL + survives razor cleanly
  (proof-by-default is an operationally-checkable CI/ship-gate end-state; Ace-as-
  shield is operationally checkable — Zeta core depends only on the proven
  registry, Ace mediates all external deps). Don't-collapse: it's the end-goal
  *direction*, not a claim we're there.

**How to apply (future cold-boots):**
- End-state target: Zeta items are proven-by-default; build the ship gate so an
  unproven item must carry an EXPLICIT opt-out flag, and silence asserts proof.
- Until then (current state ≈ zero canonical per B-1007), be substrate-honest that
  we're FAR from the default — most items are unproven-and-unflagged, which under
  the end-goal would be *false assertions*. Closing that = Soraya's math backlog.
- Treat Ace as the shield/adapter membrane: external deps adapt IN; the proven
  core never depends on unproven external interfaces directly.
- Rule-candidate (offered, NOT minted): extend the formal-proof-first rule-candidate
  with the proof-by-default polarity + Ace-as-shield, so it auto-loads at every
  registry-admission + ship-gate + dependency-boundary moment. Pending Aaron's
  "make it a rule."
