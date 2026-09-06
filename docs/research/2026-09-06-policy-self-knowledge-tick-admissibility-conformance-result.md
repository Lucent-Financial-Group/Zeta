# Policy self-knowledge and tick-admissibility v1 — conformance result

## Result class

This is a **finite structural-admission conformance result**. It does not rank
policies, prove a self-reported asymptotic bound, establish an NCI floor, create
consensus, or measure agent capability.

The evaluated fixture is `rng.splitmix64` / `mix` with a self-reported
`O(1)` time shape, `O(1)` space shape, input-measure identifier
`observations`, and a `17`-tick caller-owned envelope. Its report matches the
existing finite `ComplexityRegistry` row. The match is a consistency check
between declarations—not a runtime complexity proof.

| Property                      | Observed finite value                                              |
| ----------------------------- | ------------------------------------------------------------------ |
| Receipt version               | `PolicyAdmissibilityReceipt/v1`                                    |
| F# / Python receipt bytes     | identical                                                          |
| Receipt length                | 516 UTF-8 bytes                                                    |
| Receipt SHA-256               | `2c203d7a9da73d63978a54aa96cfe9a9d9007155c0eac05d2aa8b1539eae6b63` |
| Registry relation             | `registry-derived-match`                                           |
| Decision                      | `admit-for-ticks`                                                  |
| Authorized execution duration | 17 attributed ticks only                                           |

The identical receipts are committed as
`2026-09-06-policy-admissibility-v1-fsharp.json` and
`2026-09-06-policy-admissibility-v1-python.json`. Each includes raw-byte
SHA-256 identities of the self-report, tick envelope, and constraint-basis
carriers. Both implementations re-read those carriers at verification time.

## Fault results

| Fault                                               | Expected result      | Observed result                        |
| --------------------------------------------------- | -------------------- | -------------------------------------- |
| Unparseable self-reported asymptotic shape          | refusal              | `refuse-invalid-self-report`           |
| Zero-tick envelope                                  | refusal              | `refuse-invalid-envelope`              |
| Unknown constraint label (`global-score`)           | refusal              | `refuse-invalid-basis`                 |
| `nci-preservation` label                            | defer, not admission | `defer-basis-not-implemented`          |
| Changed carrier after receipt construction          | refusal              | `refuse-carrier-mismatch`              |
| Extra byte/reward cap at execution                  | refusal              | `refuse-undeclared-external-budget`    |
| Captured mutable limit across identical tick probes | detected crossing    | `TickBoundaryProbe.UndeclaredDetected` |

The final tick-boundary result is one-way evidence: detection convicts a
specific undeclared crossing. Non-detection would not prove the absence of all
undeclared channels.

## Boundaries retained

The tick envelope quantizes **duration** only. It is not a global compute
objective, reward, moral score, or substitute for the self-report. Time and
space declarations remain policy-owned, versioned claims that may be accepted,
deferred, or refused in a finite context.

`nci-preservation` and `recorded-consensus` are accepted labels solely so their
unimplemented status remains explicit. This result provides neither a defined
NCI floor nor a consensus protocol, vote, provenance threshold, or automated
social decision. `SocietyBootstrap` remains a separate Gaussian
precision-loss measurement, not a source of policy admission.

No conclusion follows about curiosity, MiniGrid or contextual-grid score,
transfer, non-Gaussian inference, language or visual grounding, consciousness,
parameter efficiency, energy efficiency, or general intelligence.
