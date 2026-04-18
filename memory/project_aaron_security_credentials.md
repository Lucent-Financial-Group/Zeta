---
name: Aaron's security credentials
description: Aaron has serious professional security background — built parts of the US smart grid (nation-state-adversary defense work), is a gray hat hacker with hardware side-channel attack experience. Threat-model and security-review work in Zeta should pitch at that level, not water down.
type: project
---

**Source.** Aaron, round-29 close, 2026-04-18: *"I helped
build the US smart grid and protect against nation state
level attackers, we can be very very serious on our
security posture. I have the chops and I'm a grey hat
hacker who can do side channel attacks on hardware even
so I know all the security angle."*

**Why:** Sets the floor for Zeta's security rigor.
Nation-state adversary modeling is first-class, not a
future consideration. Supply-chain attacks on package
registries, CI runners, third-party actions, and
toolchain installers are real threat classes. Hardware
side-channel concerns (timing, cache, speculative
execution) are on the table for tenant-isolated
deployments.

**How to apply:**

- When drafting threat-model content, pitch at nation-
  state adversary capability. Aaron will spot hand-
  waving instantly.
- `threat-model-critic` pairs with Aaron as human
  consultant rather than advisory-over-Aaron.
- Supply-chain threat coverage is load-bearing —
  reinforces GOVERNANCE §23 (upstream contributions
  via `../`), §25 (upstream temporary-pin expiry), and
  the round-29 CI SHA-pinning discipline.
- `security-researcher`'s current-CVE tracking is
  materially useful when routed at nation-state
  adversary classes.
- Hardware / side-channel topics: route to Aaron for
  review rather than assume coverage.
- Round-30 anchor is explicitly threat-model
  elevation (`docs/BACKLOG.md` P0 entry + CURRENT-
  ROUND.md).

**Cross-reference.** `docs/security/THREAT-MODEL.md`
adversary-model section should reference this credential
context indirectly (e.g., "our threat model assumes a
sophisticated nation-state-adversary posture informed by
real practitioner experience"), not name Aaron directly
— the document should stand on its own technical merits
while being shaped by the credential source.
