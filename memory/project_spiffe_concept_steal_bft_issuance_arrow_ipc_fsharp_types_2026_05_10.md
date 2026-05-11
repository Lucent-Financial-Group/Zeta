---
name: SPIFFE/SPIRE concept steal — BFT issuance + Arrow IPC + F# types = zero trust without ops nightmare
description: Take SPIFFE's cryptographic workload identity (SVIDs = time-boxed hats), SPIRE's attestation (prove through evidence). Refuse the operational complexity. Replace SPIRE server with BFT consensus, mTLS with Arrow Tier 0, config YAML with F# types.
type: project
---

2026-05-10: Aaron identified SPIFFE/SPIRE + Cisco + Istio as the core of modern zero trust — great concepts, painful implementation. Zeta steals the concepts, refuses the implementation.

**The three layers of modern zero trust:**

| Layer | Concept (steal) | Implementation (refuse) |
|-------|----------------|----------------------|
| Cisco | Network-level zero trust | Proprietary hardware/software lock-in |
| Istio | Service mesh policy enforcement | 47 YAML files, sidecar proxies, control plane SPOF |
| SPIFFE/SPIRE | Cryptographic workload identity + attestation | SPIRE server complexity, centralized trust root |

**SPIFFE/SPIRE = the real core:**

- SPIFFE — every workload gets cryptographic identity (SVID), not IP-based
- SPIRE — runtime issues/rotates SVIDs via attestation (prove through evidence)
- SVIDs ARE time-boxed authority credentials
- Attestation IS consistency checking

**The hat mechanism IS SPIFFE at the governance layer:**

| SPIFFE concept | Zeta equivalent |
|---------------|----------------|
| SVID (workload identity) | Hat credential |
| Attestation | Consistency-against-declared-invariants |
| SVID rotation | Hat switching / timeboxed expiry |
| SPIRE server (trust root) | BFT consensus (no single trust root) |
| mTLS between services | Arrow Tier 0 for same-trust, mTLS for cross-trust |
| Policy config (YAML) | F# type system (compiler verifies) |

**Zeta's zero trust formula:**

SPIFFE concept + BFT issuance + Arrow IPC + F# types = zero trust without ops nightmare

- BFT consensus replaces centralized SPIRE server
- Arrow Tier 0 replaces mTLS overhead for same-trust
- F# types replace YAML config (types ARE config, compiler enforces)
- Hat mechanism replaces Istio RBAC policies

**Config-free zero trust:**

The types encode the trust policy. The compiler enforces it. The kernel routes on trust tier. No config files because the config IS the code. `erasableSyntaxOnly` at TS layer ensures same property.

**Connects to:**
- project_trust_migration_path_aaron_to_zero_trust (the migration phases)
- project_microkernel_trust_tier_router (kernel routes on trust level)
- feedback_arrow_tier_0 (Arrow replaces mTLS at Tier 0)
- B-0403 weight-free (hat mechanism = SPIFFE SVIDs)
- Itron patent US 10,834,144 (hub-agent = SPIRE server, decentralized)
