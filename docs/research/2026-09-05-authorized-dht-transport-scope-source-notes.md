# Authorized DHT and Privacy-Routing Scope Notes

> **Status:** Research inventory only. This note does not authorize deployment, peer discovery, persistence, routing, publication, data transfer, or contact with any third party.

## Decision Summary

The pasted transport material combines real mechanisms with fictional narrative and unsupported operational conclusions. The technically usable core is narrow: a DHT can provide distributed peer or content-provider lookup, and an onion service can provide a privacy-preserving endpoint for authorized users. Neither mechanism establishes consent, legitimacy, durable retention, global availability, anonymity against every adversary, ownership of material, or authority to target a third party.

| Mechanism | Documented function | Does not establish | Zeta-safe research use |
| --- | --- | --- | --- |
| Kademlia DHT | Routes lookups through an XOR key-space and tolerates node failures through asynchronous querying.[1] | Trustworthy peers, durable content, data confidentiality, authorization, or a right to publish/replicate content. | A local, consented test overlay with deterministic routing receipts and failure injection. |
| libp2p Kad-DHT | Organizes routing-table buckets around a hash-distance scheme; supports peer and content-provider lookup plus periodic bootstrap.[2] | A substitute for a storage policy, access-control policy, or adversarial-security design. | A declared peer-discovery abstraction after identity, admission, and retention policies are frozen. |
| Tor onion service | Offers a Tor-network endpoint with end-to-end encrypted traffic and a generated `.onion` address; optionally supports client authorization.[3] | Invisibility, immunity from lawful process, safety from every adversary, consent from users, or authorization to evade a party’s controls. | An optional private endpoint for explicitly authorized participants only, after a separate threat model and operational review. |

## Boundary With the Pasted Narrative

Names from fiction, claims about hidden actors, narrative conflict, spiritual roles, or alleged third-party intent are not technical inputs. The attachment does not evidence that any company, person, or system is observing, opposing, or interacting with Zeta. It therefore cannot justify stealth, evasion, targeting, coercion, replication of copyrighted material, or access to a network or data without permission.

The only candidate governance idea is voluntary and reversible participation. A future system may let an authorized participant inspect a signed receipt, propose a correction, and withdraw or amend their own contribution under a declared retention policy. It must not infer consent from a content hash, a routing-table entry, a shared interest, or a narrative label.

## Required Contract Before Any Implementation

An implementation proposal must freeze all of the following before code changes:

1. **Authority and admission.** Which identities may join, publish, retrieve, revoke, or inspect a record; and how consent is evidenced.
2. **Data classes and retention.** Which content fingerprints, metadata, encrypted payloads, and deletion/tombstone records may exist; and what cannot be distributed.
3. **Threat model.** At minimum, honest participant, crash/restart, malicious peer, Sybil pressure, traffic observation, metadata disclosure, and unavailable-peer cases.
4. **Layer separation.** Content-addressed evidence union remains a CRDT state operation; DHT routing, private transport, and Bayesian queries are separate protocols with separate receipts.
5. **Test confinement.** Start with local/CI-controlled nodes, finite topology, explicit rate budgets, generated non-personal fixtures, and fault injection. No public mesh, onion service, live participant recruitment, or background daemon follows from this note.

## References

[1]: https://dl.acm.org/doi/10.5555/646334.687801 "Maymounkov and Mazières, Kademlia: A Peer-to-Peer Information System Based on the XOR Metric"
[2]: https://libp2p.io/docs/kademlia-dht/ "libp2p Kad-DHT documentation"
[3]: https://support.torproject.org/onionservices/ "Tor Project: Understanding and using onion services"
