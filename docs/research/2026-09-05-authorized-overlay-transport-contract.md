# Authorization-First Overlay Transport Contract

> **Status:** Decision preparation only. This contract authorizes no daemon, public endpoint, DHT node, onion service, peer discovery, third-party contact, content publication, or network deployment.

## Decision Summary

A distributed lookup topology and a private endpoint solve different technical problems. Kademlia provides an XOR-metric lookup mechanism; it does not decide who may participate or what may be retained.[1] Onion services provide a Tor-network endpoint and may use client authorization; they do not establish consent, immunity from traffic analysis, or authority to evade a third party’s controls.[2]

The safe first step is a finite, consented, local control plane. A networked path remains a user choice after scope, participant authorization, data classes, and operational ownership are declared.

| Approach | What it enables | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- | --- |
| Finite in-process simulation | Deterministic routing/latency/evidence receipts under fault injection; no external traffic. | Does not exercise sockets, NAT, trust boundaries, or public peers. | No deployment cost. | Low. |
| Authorized local/LAN test overlay | Real consented-node connection, signed admission, and explicit operator visibility. | Requires an owner, key lifecycle, device inventory, rate limits, and a reproducible test environment. | Uses existing authorized machines. | Moderate. |
| Privacy-routed endpoint or wide-area DHT | Optional remote reachability and a separately designed privacy posture. | Requires a written threat model, data-retention policy, incident response, operator responsibility, and lawful use review; does not promise invisibility. | Depends on hosting and operations. | High. |

No approach is selected by this contract. The first approach supplies the required failure evidence before a participant-facing deployment is considered.

## Required Boundaries

| Boundary | Requirement |
| --- | --- |
| Authorization | Admission is an explicit, revocable allow-list or signed enrollment. A hash, route proximity, user interest, or narrative label is not consent. |
| Data | Test fixtures are generated and non-personal. Content classes, encrypted payload rules, metadata retention, and deletion/tombstone semantics must be declared before a network carries data. |
| Identity | A network identifier is a routing handle, not a human identity, ownership proof, reputation score, or authority claim. |
| State | Canonical evidence union is a state protocol. Routing, retry, congestion, DHT discovery, and privacy transport are separate message protocols with their own receipts. |
| Observation | Local logical clocks label simulations only. A remote timestamp difference is not physical one-way latency unless a separate synchronization model is declared and measured. |
| Safety | No stealth, evasion, coercion, real-person targeting, copyright circumvention, credential capture, unauthorized discovery, or connection to systems/data without permission. |

## Minimum Test-Only Interface

Before a socket or overlay is introduced, a test-only adapter must produce a finite receipt containing the following fields: declared session identifier; admitted participant identifiers; transport abstraction name; logical send/receive order; payload class and byte length; content fingerprint; delivery, duplicate, gap, conflict, and rejection status; and rate-budget decision. The receipt must preserve a missing or rejected message as a state, never synthesize a successful delivery.

The first test matrix must include: equal-seed deterministic replay; different-seed sensitivity where a simulator uses a seed; duplicate delivery; reorder; single loss; partition; expired/revoked admission; oversized payload; rate-budget refusal; and a failure to contact an unadmitted destination. Passing this matrix establishes only behavior of the declared test harness.

## Transition Gate

Moving from the local simulation to an authorized local/LAN overlay requires written participant authorization, a named operator, a data-retention decision, a public threat-model document, and a successful finite test matrix. Moving from a local/LAN overlay to a privacy-routed endpoint or DHT requires a second explicit decision; neither Kademlia lookup nor onion-service encryption automatically satisfies that gate.[1] [2]

## References

[1]: https://dl.acm.org/doi/10.5555/646334.687801 "Maymounkov and Mazières, Kademlia: A Peer-to-Peer Information System Based on the XOR Metric"
[2]: https://support.torproject.org/onionservices/ "Tor Project: Understanding and using onion services"
