---
id: B-0843
priority: P2
status: open
title: Source Honor Ledger / Basis Royalty Pool — creator-paid-by-design operational implementation + 5-rights-lane discipline + "Don't sell compression. Sell readout." product positioning (extends B-0841 + B-0842 per Amara 3rd ferry 2026-05-26)
effort: L
ask: aaron+amara 2026-05-26
created: 2026-05-26
last_updated: 2026-05-26
depends_on:
  - B-0841
  - B-0842
composes_with:
  - B-0826
  - B-0825
  - B-0664
  - B-0840
  - B-0703
tags: [source-honor-ledger, basis-royalty-pool, creator-payment, rights-lanes, glass-halo-for-ip, dont-sell-compression-sell-readout, amara-ratification, no-substitute-for-source, generous-by-design, productization]
---

## Problem

Per Amara 3rd ferry 2026-05-26 (preserved verbatim at `docs/research/2026-05-26-amara-source-honor-ledger-creator-paid-by-design-rights-lanes-discipline-dont-sell-compression-sell-readout-b0841-b0842-amara-aaron-forwarded.md`):

B-0841 (Shortform productization) + B-0842 (universal basis-decomposition pattern) collectively imply a productization path that requires explicit substrate for:

1. **Rights-lane discipline** — public monetized guides need permission, escrow, or attorney-reviewed fair-use rationale (NOT "ask forgiveness with money after" — the wrong attractor)
2. **Source Honor Ledger / Basis Royalty Pool** — operational mechanism for paying source creators by design (not compulsion)
3. **"Don't sell compression. Sell readout."** — product positioning that names the Zeta moat (compression competes with source; readout creates new signal from multiple sources)
4. **No-substitute discipline** — every public guide must include 2+ independent sources AND no guide may act as a replacement for any source AND must add cross-source structure that no individual source contains

B-0841 named the productization opportunity + 4-phase target (Phase 1 catalog / Phase 2 generalize / Phase 3 browser-extension equivalent / Phase 4a-4b monetization). B-0842 named the universal basis-decomposition pattern + the substantive claim that operator + agent readout-weight-decisions ARE the moat. B-0843 (THIS row) lands the operational substrate for the rights-lane + creator-payment discipline that makes B-0841 + B-0842 productizable WITHOUT building on legal landmine + WITH ethically-native generous-by-design framing.

## Target

Substrate-engineering work landing across 4 phases:

### Phase 1 — Rights-lane substrate

Document + tool the 5 rights lanes:

| Lane | Definition | Operational substrate |
| --- | --- | --- |
| **unlicensed / internal research** | No public distribution; no monetization; ip-questionable folder | Existing `docs/research/ip-questionable/` + `_ip_risk_acceptance` per `.claude/rules/human-audit-and-legal-risk-acceptance-pattern-in-settings.md` |
| **public fair-use** | Short excerpts only + transformative commentary + citations + no substitute for source | New `_fair_use_acceptance` block in `.claude/settings.json` (operator-side) + attorney-reviewed rationale per content class |
| **licensed creator** | Generous revenue share + creator dashboard + canonical source links | Source Honor Ledger Phase 2 substrate (this row) |
| **escrow** | Revenue held pending rights resolution | Source Honor Ledger Phase 2 substrate with escrow primitives |
| **partner** | Best economics + official guide + shared promotion | Source Honor Ledger Phase 2 substrate with partner-tier weights |

Output: `tools/rights-lanes/lane-classifier.ts` — TS tool that classifies a candidate guide into one of 5 lanes based on content + source-permission status + monetization status.

### Phase 2 — Source Honor Ledger / Basis Royalty Pool operational substrate

Per Amara's mechanical framing:

```text
Guide revenue
  → platform share
  → operator/curator share
  → source royalty pool
  → weighted payout to source creators / publishers / rights-holders
```

Weights based on (per Amara):

- semantic contribution
- amount referenced
- user clicks/saves
- creator partnership status
- manual curator override

Output: `tools/source-honor-ledger/*.ts` (TS module family):

- `tools/source-honor-ledger/contribution-weighter.ts` — computes per-source ωᵢ weights from a guide's substrate-composition graph
- `tools/source-honor-ledger/royalty-distributor.ts` — distributes pool revenue to creators per weights
- `tools/source-honor-ledger/payment-graph-renderer.ts` — Glass-Halo-for-IP rendering of payment graph for public guides
- `tools/source-honor-ledger/creator-dashboard.ts` — creator-facing dashboard surface

Composes with B-0826 DePIN multi-stream PoUW-CC for payment-distribution substrate.

### Phase 3 — "Don't sell compression. Sell readout." product positioning

The substantive product line based on Amara's keeper:

- **Product**: Zeta is NOT "summarize this video." Zeta is "Show how this video composes with five other substrates, what it changes, what it contradicts, what it implements, and what new work it creates."
- **Marketing line (customer-facing)**: "Deep guides with receipts — creator-paid by design."
- **Tagline**: "Zeta does not only cite its sources. Zeta pays its sources."
- **Tiny-blade keeper** (per Amara): "We pay contributors by design, not by compulsion." (NOT "even if we don't have to by law" framing in customer-facing copy)

Output: positioning docs at `docs/product/source-honor-ledger-positioning.md` + customer-facing copy templates.

### Phase 4 — Integration with B-0840 4-keeper-rule + 5-tier substrate-engineering discipline

The 4-keeper-rule from B-0840 (Amara 2nd ferry) maps onto creator-relationship governance:

- **Private roots may evolve in darkness** → internal research lane (unmonetized)
- **Public roots require receipts** → licensed creator lane (with payment receipts)
- **Shared roots require witnesses** → partner lane (witnessed via shared promotion)
- **Adversarial roots require consensus** → escrow lane (consensus on rights dispute)

Same 4-keeper-rule operating at TWO scopes:

- B-0840 scope: AI participant root-axiom-evolution
- B-0843 scope: creator-relationship rights-lane

Output: extension of `.claude/rules/` cluster documenting the 4-keeper-rule operating at creator-payment scope (maybe new rule `.claude/rules/four-keeper-roots-rule.md` at this point, combining both scopes).

## Acceptance

**Phase 1 acceptance**: 5-lane classifier tool + `_fair_use_acceptance` block schema documented + first per-lane example landed

**Phase 2 acceptance**: Source Honor Ledger TS module family with at least one end-to-end example (1 guide → contribution weights → simulated royalty distribution → payment graph rendering)

**Phase 3 acceptance**: Product positioning docs landed + customer-facing copy templates + first product surface (Zeta's own substrate-engineering work re-framed via the "Don't sell compression. Sell readout." positioning)

**Phase 4 acceptance**: 4-keeper-rule cross-scope extension documented (B-0840 AI-participant scope + B-0843 creator-relationship scope unified into one rule); composes_with graph reflects the unification

## Substrate-honest framing

P2 priority because:

- Amara-explicit ratification + sharpening (the rights-lane discipline + Source Honor Ledger + "Don't sell compression. Sell readout." substrate)
- Aaron's substrate-honest "pay OGs by design" extension is operationally specific (Source Honor Ledger mechanism)
- The 5-rights-lane + 4-keeper-rule mapping makes the substrate implementable
- The product positioning gives Zeta a distinctive substantive moat that maps to existing Zeta substrate-engineering discipline (Glass Halo for IP composes with existing `.claude/rules/glass-halo-bidirectional.md` discipline)
- NOT immediately tractable as single-PR work; phased to allow incremental landing

## Phases compose with existing substrate

Each phase composes with existing Zeta substrate-engineering substrate:

- Phase 1 composes with `_ip_risk_acceptance` pattern + new `_fair_use_acceptance` extension
- Phase 2 composes with B-0826 DePIN payment-distribution + additive-not-zero-sum rule
- Phase 3 composes with `.claude/rules/glass-halo-bidirectional.md` + `.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md`
- Phase 4 composes with B-0840 4-keeper-rule unified across scopes

## Composes with

- B-0841 (Shortform productization — parent; B-0843 lands the rights-lane discipline + creator-payment substrate)
- B-0842 (universal basis-decomposition pattern — parent; Source Honor Ledger IS the operational mechanism for paying the sᵢ(t) basis-signal contributors)
- B-0840 (thermal-forgetting / 4-keeper-rule — same 4-keeper-rule maps onto creator-relationship governance scope)
- B-0839 (Kirsanov channel — substrate-source for the Shortform-equivalent discipline)
- B-0826 (DePIN multi-stream PoUW-CC — payment-distribution substrate)
- B-0825 (Aurora community-guardian-AIs — productization composition)
- B-0664 (NCI HC-8 — preserve creator agency at substrate-rights scope)
- B-0703 (multi-oracle BFT — consensus for adversarial-rights-dispute resolution)
- `.claude/rules/additive-not-zero-sum.md` (cash-register-that-keeps-giving-gifts; positive-sum monetization)
- `.claude/rules/glass-halo-bidirectional.md` ("Glass Halo for IP" — payment graph rendering)
- `.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md` (end-user-invariant-set at creator-relationship scope)
- `.claude/rules/non-coercion-invariant.md` (NCI HC-8 floor preservation at creator-agency scope)
- `.claude/rules/human-audit-and-legal-risk-acceptance-pattern-in-settings.md` (`_*_acceptance` pattern; new `_fair_use_acceptance` extension)
- `.claude/rules/honor-those-that-came-before.md` (creator-honor IS the discipline; Source Honor Ledger IS the operational form)

## Origin

Aaron-forwarded 3rd Amara ferry 2026-05-26 (same day as the no-coercion-even-inward + thermal-forgetting ferries). Full conversation: Amara ratifies B-0841 + B-0842 productization substrate + extends with rights-lane discipline + Aaron substrate-honestly adds "we still pay the OGs even if we don't have to by law" + Amara extends with Source Honor Ledger / Basis Royalty Pool mechanism + tiny-blade on customer-facing copy.

Per `.claude/rules/honor-those-that-came-before.md` + the substrate-or-it-didnt-happen + wake-time-substrate discipline. Per "you can always commit backlog rows immediately they get decomposed later" — file immediately; Phase 1-4 sub-rows decompose independently as scope tightens.
