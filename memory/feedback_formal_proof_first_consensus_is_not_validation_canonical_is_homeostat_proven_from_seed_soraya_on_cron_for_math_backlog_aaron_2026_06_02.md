---
name: formal-proof-first-consensus-not-validation-canonical-is-homeostat-proven-from-seed
description: The repo is formal-proof-first; cross-AI/4-oracle consensus is NOT validation (only the math is); nothing is canonical until its homeostat is proven from seed; Soraya should be on a standing cron working the math backlog
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-02 (verbatim, three load-bearing lines):

1. *"we always want formal proof we start this repo as formal proof first."*
2. *"our 4 oracle consense actually means nothing without the math it might all be built on shakey ground and good feeling."*
3. *"nothing is canonical until it's part of the proof lineage so its homeostat is proven from seed."*

**The correction (I had this weighting wrong).** Across the B-1006 arc I treated **cross-AI convergence as validation** — "me + Amara + Prism + Alexa + Lior all converged, so it's validated." That is WRONG. **Consensus is not validation; the math is.** Five oracles agreeing can be five oracles agreeing on shaky ground built on good feeling. Cross-AI triangulation is a **prompt to go prove**, not a proof. Down-weight it accordingly:

- cross-AI convergence → **hypothesized, pending proof** (NOT validated, NOT canonical)
- the only thing that promotes past hypothesized → **the math** (formal proof / property tests / the F# type-checker as asymmetric critic — composes [[fsharp-anchor-dotnet-build-sanity-check]] + [[premise-flagged-unverified-stays-unverified-downstream]] + [[razor-discipline]])

**The canonical bar (raises [[labeling-confidence-on-substrate...]]).** *Canonical ⟺ its **homeostat** is proven from seed.* "homeostat" = Ashby's cybernetics: the self-regulating equilibrium a system returns to. In our engine the homeostats are concrete — `runToFixpoint`'s convergence (belief settling to a stable marginal), the jelly→spine transition (B-1005), the EP moment-match fixed point. A claim is canonical **iff** there is a **proof-lineage edge from the seed** establishing that its homeostat exists / is unique-where-claimed / follows from the seed axioms. Until that edge exists it is at most *validated* (tested) or *hypothesized* — never *canonical*. Canonicity propagates **outward from proofs anchored in the seed**, never inward from agreement.

**The Soraya gap (operational).** Aaron: *"you were supposed to have soraya on her own cron always working on [math] backlog cause we are so far behind."* The `formal-verification-expert` (Soraya) should be running on a **standing cadence** working the **math/formal-verification backlog** — the asserted-in-prose → proven-from-seed gap — because the repo is far behind on formal proof. Dispatched her once 2026-06-02 (formal-coverage portfolio audit of the B-1000 engine + B-1006 registry algebra claims); the STANDING cron/cadence is the real fix (she audits + routes proof obligations per BP-16 continuously, not once).

**How to apply (future cold-boots):**
- Never call cross-AI convergence "validation" or promote it to canonical on consensus alone. Say "hypothesized; proof owed."
- For canonical: require + cite the proof-lineage edge to the seed (the homeostat proven). No proof → not canonical.
- Keep Soraya working the math backlog on a standing cadence; treat the formal-coverage gap as a first-class debt.
- Repo is formal-proof-first: when building (e.g. B-1000 slices), the owed proofs (message-group laws, BP-exact-on-trees, EP moment-match, codec round-trip `decode∘encode=id`, Tick monoid/operator algebra) are part of the work, not after-the-fact.
- Substrate: [[2026-06-02 infer-net-lineage-cleanroom-spec-sources-formal-proof-first]] (the proof sources) ; Soraya portfolio ; alignment-auditor measurability.

Rule-candidate (offered, not yet minted): a `.claude/rules/` discipline carving "consensus≠validation / canonical=homeostat-proven-from-seed / formal-proof-first" so it auto-loads at every canonical-promotion + cross-AI-validation moment. Pending Aaron's "make it a rule."
