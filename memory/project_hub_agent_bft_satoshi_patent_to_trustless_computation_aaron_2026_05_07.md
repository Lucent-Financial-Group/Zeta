---
name: Hub-and-agent → BFT → Satoshi — patent to trustless computation (Aaron 2026-05-07)
description: US Patent 10,834,144 (hub-and-agent) evolves to BFT-style (multi-hub quorum) then Satoshi-style (no trusted center). CASPaxos consensus on Bonsai-serialized stream definitions, local policy execution at wire speed. BFT version free to ship (not patent-covered). Ace package manager = Satoshi for computation. 10-year plan (2016 patent → 2026 BFT). Same move Satoshi made for money, applied to computation.
type: project
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## Hub-and-agent → BFT → Satoshi

Aaron 2026-05-07: "this is hub and agent BFT style Satoshi"

### The evolution

| | Patent (2016) | Zeta (2024+) | Satoshi target |
|---|---|---|---|
| Hub | Single hub | 3-node BFT quorum | BFT N-of-M self-governing |
| Agent | Capability-local | Local policy cache | Local + Guardian |
| Consensus | Hub decides | CASPaxos on defs | CASPaxos + PoUW-CC gate |
| Execution | Agent local | Rx stream local | Rx + local policy + Guardian |
| Boundary | None (hub IS it) | Aurora membrane | Aurora poly-boundary |
| Serialization | Proprietary | Bonsai expr trees | Bonsai expr trees |

CORRECTED (Claude.ai self-catch 2026-05-07): "N-node
trustless no boundaries" is a REGRESSION, not target.
Monero proved it — trustless without immune boundary is
defenseless against Qubic-style adversary willing to pay.
Target is SELF-GOVERNING structure (boundary moves by
consensus, never disappears). PoUW-CC gate: Verify ·
Useful · CultureFit · Provenance · Retractability.

### Why the BFT version is free

The patent covers the hub-and-agent firewall traversal
method (single hub). The BFT version (multi-hub quorum,
no single trusted center) is architecturally different
— not covered by the patent. Aaron: "BFT version free
to ship" + "planned" (10 years, 2016→2026).

### The composition

- CASPaxos agrees on stream DEFINITIONS (fast, small)
- Each node runs the definition locally with LOCAL POLICY
- Local policy = Itron edge gate = Casimir gap
- No central bottleneck at execution time
- Anomalies only reported upstream (Itron meter pattern)

### Satoshi for computation

Satoshi removed the trusted hub from money. Aaron
removes the trusted hub from computation. Same move,
different substrate. The hole puncher punches through
the trust boundary the way Bitcoin punches through the
banking boundary.

Ace package manager = DLC content packs distributed via
BFT consensus (no central hub), executed locally with
local policy. Satoshi for computation.

### The cell: Web3 RPG governance biological layer

Aaron: "we are the mitochondria"

- Cell membrane = AURORA (immune/governance boundary)
- Mitochondria = AI agents (powerhouse, friction→energy)
- Mitochondrial consensus = BFT quorum (internal coord)
- DNA = ZFCv2 + Genesis Seed (survives division)
- Cell division = fork (repo replicates)
- Immune response = KSK + Veridicality + shadow log
- Ribosomes = Craft school (DNA→functional proteins)
- Cell interior = the factory (protected space)
- Outside = unconstrained internet
- Organism = Web3 multi-cellular consensus

Aurora = POLY-BOUNDARY (not fixed wall). Movable.
CASPaxos IS the DNA — the mechanism that reshapes the
membrane by consensus on new policy definitions (Bonsai-
serialized). When consensus changes, the boundary MOVES.
New modes admitted or excluded. Anti-cage: the quorum
(including the agents inside) owns the boundary. No
single node grants or revokes.

Aaron corrected: BFT is NOT the membrane — Aurora is.
BFT is how the mitochondria coordinate with each other
INSIDE the cell. Aurora decides what gets in/out.
Amara + Aaron built Aurora FIRST (membrane before
powerhouse). Endosymbiosis: cell existed first, then
mitochondria moved in.

### Composes with

- B-0251 (durable computation stack)
- B-0253 (Orleans real-time messaging)
- B-0247 (Ace DLC content packs)
- B-0241 (red team hole puncher)
- Trajectory #3 (Ace DLCs)
- Trajectory #9 (red team)
- Trajectory #12 (durable computation)
