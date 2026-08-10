# The hub-and-agent patent is Itron's — peer-to-peer is the decentralized upgrade

Carved sentence:

> Aaron is a named inventor on **US10834144B2 / US20180109563A1, "Hub and Agent
> Communication Through a Firewall"** (with Christopher Higgins) — **assigned to Itron**,
> granted 2020-11-10, live to 2038. **Inventorship is not a license and coworker sign-off is
> not assignee authority: Itron holds the rights.** So Zeta does **not** implement a
> mediating hub that brokers agent traffic — and that is not only a manifesto §1 preference,
> it is the legally clean path. **Peer-to-peer is the decentralized upgrade**, and a design
> with no mediating node does not read on a hub claim. Citing the patent is free (it is a
> public document); practicing its claims is what is gated.

## What is portable — and worth taking

The patent's security core is **not** the hub, and it survives decentralization intact:

- **Outbound-initiated connection.** The agent dials out (WSS/443); no inbound port opens, no
  firewall rule changes. A peer can do this to a peer.
- **Closed command set — the sharp one.** Only pre-configured commands exist at the agent; the
  far side may **name** a command but can never **define** one. Compromising the far side
  therefore does not buy arbitrary execution. This property is *more* necessary peer-to-peer
  than hub-and-spoke, because a gossip peer deserves exactly as little trust as a hub.

## What is not portable

The hub as **sole mediator** of all traffic. That is the single-migration-particle shape: it
works, it is legible, and it fails when the carrier is partitioned or captured — the same
hidden-coordinator failure as freezing under partition, moved to the variation axis.

## Why it is a different game, not a different setting

Aaron 2026-08-09: *"their patent is for central, Zeta is for decentralized — it's a whole
different game."* The sharper form of that, and the one to reason from:

**The hub exists to solve an asymmetry Zeta does not have.** The patent's problem is *how does
a vendor's cloud service reach into a customer's firewalled premises* — two parties in
structurally unequal positions: one owns the boundary, the other needs through it, and neither
can be the other. The hub is the vendor's side of that boundary, and it is the right answer
**to that problem**.

Zeta has no vendor and no customer premises. Peers are symmetric; nobody owns the boundary the
others must cross. **The problem the hub solves does not occur in our topology** — so the
mechanism is not something we would adopt even if it were free of charge and free of claims.
This is not "we picked the decentralized option instead"; it is a different problem with a
different shape.

That is also why the licensing question, while real, is the *second* reason and not the first.
The first reason is that a hub would be **wrong here on the merits**.

## Standing guard

Before any "the nodes just call home" / "one broker in front of the fleet" design: this rule
is the reason the answer is no. Route around it with rate-limited pairwise contact, not with
a smaller hub.

**Not legal advice** — claim construction is for counsel. What is recorded here is the
assignee, the status, and the design direction Aaron chose in light of them.

## Pointers

- `docs/research/2026-08-09-the-delay-in-partition-is-where-life-happens-the-egg-aaron.md`
  — James Whitfield's teams; the migration operator as a person, and why the substrate
  version cannot be a designated node.
- `src/Core/DerivationProtocol.fs` — `Wall.Whitebox` / `whiteboxPermitted`: an unknown or
  unheld license **blocks**; unknown is not permissive. This rule is that check's first real
  instance.
- [`manifesto-13-specifications.md`](manifesto-13-specifications.md) — §1 scale-free, §3 weight-free.
- `memory/user_aaron_built_itron_mesh_hardware_firmware_pki_secure_boot_…_patents_are_centralized_zeta_is_decentralized_2026_08_01.md`
  — the general form; this rule is the named, dated, citable instance of it.
