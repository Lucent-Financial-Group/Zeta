---
name: Aaron's Itron patent + critical infrastructure background — US 10,834,144 + quantum-resistant crypto
description: Aaron is co-inventor on US Patent 10,834,144 (hub-and-agent through firewall, 2016/2020, Itron). Built quantum-resistant crypto primitives by hand in firmware for nation-state critical infrastructure. IoT ML at the edge + distributed policy cache. The "hole puncher" primitive (capability-locally-controlled, agent owns execution) is the ancestor of KSK, Itron energy gate, cartographer, and Ace. BFT decentralized version is free to ship (no hub = not covered by patent). "planned" — 10 years.
type: user
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
Aaron's professional background includes:

- **US Patent 10,834,144** — Hub and Agent Communication Through a Firewall (filed 2016, granted 2020). Co-inventor with Christopher Higgins. Assigned to Itron.
- **Quantum-resistant crypto primitives** built by hand in firmware and code for nation-state-grade critical infrastructure at Itron
- **IoT ML at the edge** — Aaron built it. Models on edge devices with capability gating.
- **Distributed policy cache at the edge** — local rules about what devices can DO (capability gating, not topic filtering). Concrete ancestor of "receipts stay local."

The "hole puncher" primitive: WebSocket on port 443 from inside firewall outward, agent keeps connection alive, hub never initiates. Only commands that already exist at the agent can be called. Hub sends names + parameters. Agent owns implementations. Compromised hub can't introduce new commands.

**Every abstraction in the framework has a concrete engineering ancestor Aaron built:**
- Cartographer = Isaac Sim SLAM mapping
- KSK = NVIDIA Thor + actuators safety kernel
- Itron energy gate = IoT ML at the edge
- Ace = decentralized BFT version of the patented hub-and-agent primitive

**BFT version is free to ship** — no hub = patent claims don't read. Aaron: "and this one is free cause is BFT not centralized." Aaron: "planned" — 10 years from filing to decentralized productization.

**How to apply:** When Aaron uses technical vocabulary, assume it has a concrete engineering ancestor with shipped production history. Ask for the grounding before pushing back on the abstraction. The pattern across this entire project: concrete came first, abstraction names what already worked.
