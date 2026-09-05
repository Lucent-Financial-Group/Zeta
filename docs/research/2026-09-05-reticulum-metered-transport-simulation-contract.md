# Reticulum Metered Transport: Simulation and Arrival-Recording Contract

> **Status:** Frozen scope for a source and test correction. This contract concerns finite in-process measurements and deterministic simulation only. It neither implements a DHT nor a Tor/onion service, opens a socket, discovers a peer, transfers public data, or makes a physical-network claim.

## Decision

The current module contains two different operations that must not share a claim boundary. `ReticulumMeteredPeer.recordFrameArrival` records timestamps supplied by its caller. `ReticulumMeshMeteredNetwork.broadcastFrame` produces synthetic timestamps from a local clock and random noise. The latter is a simulator, not a transport implementation or physical measurement.

| Surface | Contracted role | Evidence permitted | Excluded claim |
| --- | --- | --- | --- |
| `recordFrameArrival` | Stores caller-supplied send/receive timestamps and derives a non-negative elapsed value. | A receipt that these input fields were retained and subtracted. | That timestamps came from hardware, a network, synchronized clocks, or a particular physical link. |
| `computeEntropyMetrics` | Computes descriptive histogram statistics over retained finite samples. | The returned mathematical values for the declared history. | Thermodynamic entropy, information extraction, work, or a Maxwell-demon mechanism. |
| `ReticulumMeshMeteredNetwork.broadcastFrame` | Produces an in-memory latency **simulation**. | Deterministic replay of its declared seed, start time, interval, inputs, and runtime. | A real broadcast, mesh behavior, high-precision timing, or any external transport result. |

## Required Correction

The simulator must accept a declared seed, initial logical time, and logical inter-broadcast interval. Its default configuration must itself be deterministic. It must not use `Math.random()` or `performance.now()` on the simulation path. A bounded seeded pseudo-random sequence may feed the retained synthetic jitter model; it is an input generator, not a randomness, security, or network-quality claim.

The existing historical class name may remain as a compatibility alias, but all current comments and public metrics must use simulation or descriptive-statistics language. The metric currently named `maxwellDemonInformationGainBits` must be replaced by `interArrivalUniformityGapBits`, defined only as `log2(max(1, sample-count − 1)) − H(inter-arrival bins)`, clamped at zero. No alias carrying the unsupported physical claim is retained because no in-repository caller uses it.

## Finite Controls

The repair must add and pass all controls below.

1. **Replay control:** two simulators with equal declared configuration and calls return exactly equal normalized sample receipts, including timestamps and latency.
2. **Seed sensitivity:** a changed valid seed changes at least one synthetic-latency receipt on a fixed finite call sequence.
3. **Logical-time control:** first send time equals the declared start time; each subsequent simulation advances only by the declared interval, never the wall clock.
4. **Input-refusal control:** invalid seed or negative interval is rejected before a sample is produced.
5. **Metric rename control:** the returned descriptive metric has the contracted name and finite non-negative value; no `maxwellDemonInformationGainBits` property remains.
6. **Mutation control:** replacing the deterministic generator with a fixed value must make the seed-sensitivity control fail.

## Non-Claims

The correction does not establish DHT routing behavior, packet delivery, UDP/WebSocket behavior, privacy, anonymity, peer consent, a physical latency model, a security property, or a distributed-CRDT merge. It does not authorize a background service or public network. Any future DHT, wireless, WebSocket, UDP, or privacy-routing system requires separately frozen authority, threat-model, data-retention, and consent contracts.

## Checked Result

The in-process correction was implemented with a declared xorshift32 seed, a logical nanosecond clock, and no simulator-path calls to `Math.random()` or `performance.now()`. The seven focused controls passed with 23 assertions under the declared Bun runtime; strict TypeScript checking passed. Replacing the seeded Gaussian generator with a fixed zero value caused the seed-sensitivity control to fail (`MUTATION_EXIT=1`), then the production generator was restored and the complete focused suite passed again. This establishes only replayability of this finite simulator under its declared JavaScript runtime and inputs.
