---
name: Aaron's unifying method — take centralized services and make them less coercive; individual in control, blending by choice, pairwise never global
description: Aaron 2026-08-20 stated the through-line of everything he builds. Decentralization is the MECHANISM, not the goal; the goal is non-coercion plus individual control plus the choice to blend. Operational form - agreement is pairwise overlap of local policies, never a global state.
metadata:
  type: user
---

Aaron 2026-08-20, unprompted, describing his own body of work:

> **"most of the code i write is taking centralized services and making them less
> coversive with the indivudal in control and the choice to blend between the
> indificual choices"**

**Why this matters more than it looks:** it corrects a misreading that is easy to
make from the artifacts alone. The repo is full of decentralization machinery, so
it reads as though **decentralization is the goal**. It is not. It is the
**mechanism**. The goal is three things, in order:

1. **Non-coercion** — nobody is forced through anyone.
2. **The individual in control** — the decision stays with the party it affects.
3. **The choice to blend** — you *opt into* combining with others' choices, and can
   opt back out.

This is why the discriminator in
[[itron-hub-patent-boundary-p2p-is-the-upgrade]] is **exit** rather than degree: a
hugely popular thing you freely chose is fine; a small thing you *must* route
through is not. Concentration was never the defect — **coercion is**.

## The operational form: pairwise, never global

Aaron 2026-08-20, on cross-CA agreement between nodes that each own a root:

> **"yeah never global only pairwise"**

So "agreement" is not a computed shared state. **Each node holds a local policy over
whose claims it accepts; agreement is the OVERLAP of independent local policies,
computed nowhere.** Consequences that fall straight out, and that catch design
errors early:

- `accepts(A, B)` is a **directed relation**, not set membership. **Asymmetric trust
  is a legal, expected state**, never an inconsistency to repair.
- No node needs to enumerate the society, know its size, or learn about a third
  party to decide about a second. **An API taking "the list of trusted nodes" is a
  smell** — it has reintroduced the global state.
- The **facts travel** (trust bundles, SVIDs, attestations); **the decision never
  does.**
- Same shape as per-node OPA policy evaluation, which is why Aaron says per-node
  SPIRE and per-node OPA are the same thing (2026-08-20).

**How to apply.** When a design needs a shared registry, a quorum over membership, or
a reconciled view of "who is trusted", it has left the method. Reach for a local
decision function over externally-supplied facts instead. And when reviewing:
ask *"is this deference chosen or imposed?"* — that single question is the method in
one line.

Related: [[project_decentralized_identity_server_is_the_society_substrate_local_policy_hubs_negotiate_2026_08_19]] ·
[[project_ai_agents_own_their_own_money_is_aarons_endgame_hsm_self_custody_x402]] ·
[[privacy-budget-is-hard-money-earned-by-others]] (non-coercion applied to privacy)
