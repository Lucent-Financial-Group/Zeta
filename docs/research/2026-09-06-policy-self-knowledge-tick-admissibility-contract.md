# Policy Self-Knowledge and Tick-Admissibility Contract

## Decision

> **Adopt a finite, receipt-first admission boundary.** A policy may state its own asymptotic time and space shape for a declared input measure. A scheduler then supplies a separately attributed, finite tick envelope. Neither declaration ranks policies, proves a real-world complexity theorem, measures competence, nor becomes a global fitness function.

This contract is a proposed implementation boundary for a single local scheduler or benchmark adapter. It does not define a society-wide constitution, establish an NCI floor, determine ethical preference, or infer consensus from a topology, vote count, or source name.

| Concern                   | Contract treatment                                                                                                                    | Explicit non-claim                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Self knowledge**        | A policy publishes a versioned, parseable Big-O declaration over named input measures.                                                | The declaration is not proof that the implementation has that complexity.        |
| **Time limit**            | A caller supplies a finite tick envelope with an owner and a rationale.                                                               | A tick count is not a universal compute budget, a score, or a policy preference. |
| **Space limit**           | The declaration reports asymptotic space separately; a concrete execution can report observed bytes only if an adapter measures them. | A byte forecast is not an asymptotic proof.                                      |
| **Additional constraint** | Each extra constraint carries one explicit basis: test-only, NCI-preservation witness, or recorded-consensus witness.                 | The receipt does not certify NCI preservation or consensus.                      |
| **Unknown**               | Missing, malformed, mismatched, or unsupported declarations refuse/defer.                                                             | Unknown is never silently converted into a low score or a denial of intent.      |

## Existing Seams and Their Limits

The implementation must adapt existing mechanisms rather than rewrite their vocabulary. `ComplexityRegistry` already has parseable time/space shapes, provenance, unsearchable refusal, and same-artifact alternatives; it is the natural syntax and registry-comparison port, not a runtime theorem prover.[1] `SoftScheduler` supplies an injected source plus a finite `budget` loop; this is the authoritative meaning of a tick envelope for the first slice.[2]

`Vision` already accepts declared future-branch costs, accounts in a tank, and retains deferred branches rather than erasing them. It may inform measured byte/tick reporting, but its byte accounting does not replace an asymptotic declaration.[3] `FerryThrottler` provides self-clocked batching and optional queue/byte backpressure; it is transport pressure, not a policy-value function.[4] `TickBoundaryProbe` can produce a one-way witness of undeclared influence under repeated pinned declared inputs; a non-detection result remains non-acquittal.[5]

The current TypeScript sensor-fusion module is explicitly marked unmetered with zero external importers, so it is excluded from the admission basis.[6] Likewise, `SocietyBootstrap` measures provenance-deduplicated Gaussian precision loss under member removal; it does not implement an NCI floor, consent protocol, or consensus engine.[7]

## Canonical Local Data Model

The first implementation must use the following finite shapes. Field values are ASCII/UTF-8 literals with length-prefixed, canonical serialization defined before receipts are admitted; no wall-clock timestamp, ambient processor count, mutable global, or random draw may enter the canonical form.

| Record                          | Required fields                                                                                           | Refusal condition                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PolicySelfReport/v1`           | `policyId`, `revision`, `operation`, `inputMeasureId`, `timeO`, `spaceO`, `declaredBy`, `declarationKind` | Empty identity; unsupported declaration kind; unparseable O-shape; missing input measure.          |
| `TickEnvelope/v1`               | `sourceId`, `maxTicks`, `chosenBy`, `rationale`, `envelopeKind`                                           | Non-finite or `< 1` tick count; empty owner/rationale; non-`bounded-duration` kind.                |
| `ConstraintBasis/v1`            | `kind`, `basisId`, `evidenceRef`, `scope`, `status`                                                       | Unknown kind; missing basis/evidence reference; a claimed basis with status other than `declared`. |
| `PolicyAdmissibilityReceipt/v1` | fingerprints of the three records, parsed O-shapes, decision, and refusal/defer code when applicable      | Any carrier fingerprint mismatch, ambiguous record order, or missing required result field.        |

`inputMeasureId` names the independent variable that a policy claims to scale with—such as `cells`, `observations`, `branches`, or `handlers`. It does not allow a policy to hide growth by renaming variables: the first slice accepts only an adapter-owned finite allowlist. A declaration remains **self-report** even if it agrees with a registry row. The receipt must preserve both facts separately:

| `declarationKind`        | Meaning                                                            | Admission effect                                                                                                           |
| ------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `self-reported`          | The policy owner supplied the statement.                           | Eligible only after syntax and input-measure checks.                                                                       |
| `registry-derived-match` | A registry row has the same parsed shape and provenance `Derived`. | Informative cross-check; not a proof.                                                                                      |
| `registry-proven-match`  | A registry row has the same parsed shape and provenance `Proven`.  | Informative cross-check; no automatic selection privilege.                                                                 |
| `unmatched`              | No matching registered operation is available.                     | Still admissible only if the local adapter explicitly permits self-report-only mode; otherwise `defer-unmatched-registry`. |

## Tick Envelope Rule

The scheduler owns duration. The policy owns only its declaration. The policy **must not receive** an arbitrary external byte, wall-clock, parameter-count, or reward cap as a hidden selection signal.

```text
admit(policy self-report, tick envelope, constraint basis):
  validate all raw canonical records and their fingerprints
  parse timeO and spaceO using the declared grammar
  require an allowlisted inputMeasureId
  require maxTicks >= 1 from the caller-owned TickEnvelope
  produce Admit, Defer, or Refuse with a named reason
  execute at most maxTicks scheduler boundaries when admitted
```

The result `tick-envelope-exhausted` means only that the caller-owned finite duration completed before the adapter reported completion. It says neither that a policy is bad nor that its asymptotic claim is false. In particular, no automatic rule may compare two policies by `maxTicks`, cumulative reward, parameter count, or tank balance.

## Constraint-Basis Rule

The contract permits only three explicit extra-basis labels. It intentionally does not include a default “optimization” or “global good” basis.

| Basis kind           | Required witness                                                                      | Admissible local use                                                          | Not established                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `test-only`          | A named test/control ID.                                                              | Fixture or mutation execution only.                                           | Deployment permission, safety, NCI, or consensus.                                                     |
| `nci-preservation`   | A specific invariant statement and a failing control reference in `evidenceRef`.      | A local adapter may refuse if the declared witness is absent or mismatched.   | That the invariant is NCI, universally complete, or socially accepted.                                |
| `recorded-consensus` | Immutable content reference, declared scope, and participant/attestation identifiers. | A local adapter may require the record to exist and match its expected scope. | That participants consented, that the record is a valid vote, or that consensus is legitimate/global. |

There is currently no NCI-floor implementation or consensus protocol in this contract. Consequently, a first implementation may parse and retain the two labels but must return `defer-basis-not-implemented` instead of permitting a claim based on either. `test-only` is the only executable extra-basis path in the first slice.

## Decision and Refusal Surface

| Decision                      | Meaning                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `admit-for-ticks`             | The self-report, caller-owned tick envelope, and supported basis are structurally valid. It permits only a bounded local execution. |
| `defer-unmatched-registry`    | The report is syntactically valid but has no permitted registry relationship.                                                       |
| `defer-basis-not-implemented` | NCI-preservation or recorded-consensus is declared but no independently frozen evaluator exists.                                    |
| `refuse-invalid-self-report`  | Identity, input measure, or O-shape is absent/invalid.                                                                              |
| `refuse-invalid-envelope`     | Tick envelope is not a valid attributed bounded-duration record.                                                                    |
| `refuse-invalid-basis`        | Constraint basis is missing, unknown, or malformed.                                                                                 |
| `refuse-carrier-mismatch`     | Raw record bytes do not match the fingerprints carried by the receipt.                                                              |

## Required Fault Controls

The first executable adapter must add independently checked faults that make each boundary capable of failure.

| Fault                                                                                  | Required observation                                                                                |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Replace declared `O(n)` with an unparseable string.                                    | `refuse-invalid-self-report`; no scheduler action occurs.                                           |
| Change `inputMeasureId` to an unsupported or missing measure.                          | `refuse-invalid-self-report`.                                                                       |
| Replace a valid tick envelope with a bare number, missing owner, or zero ticks.        | `refuse-invalid-envelope`.                                                                          |
| Substitute a hidden external byte/reward limit after receipt construction.             | Receipt remains unchanged and the adapter must reject the execution configuration as undeclared.    |
| Mislabel a basis as `nci-preservation` without a matching invariant/control reference. | `refuse-invalid-basis` or `defer-basis-not-implemented`; never `admit-for-ticks`.                   |
| Reorder canonical fields or use a policy/report fingerprint from another receipt.      | `refuse-carrier-mismatch`.                                                                          |
| Inject mutable closure state across otherwise identical scheduler runs.                | `TickBoundaryProbe` reports `UndeclaredDetected`; equal repeats are retained only as non-detection. |

## Scope and Next Gate

The initial structural-admission conformance result is recorded in
[`2026-09-06-policy-self-knowledge-tick-admissibility-conformance-result.md`](2026-09-06-policy-self-knowledge-tick-admissibility-conformance-result.md).
It admits one finite registry-matched fixture for its attributed tick envelope,
retains NCI and consensus as deferred labels, and adds neither a policy score
nor a consensus claim.

The narrow next code slice is an adapter-local F# receipt module plus an independently authored Python validator. It may consume a fixed `ComplexityRegistry` row and a `SoftScheduler` tick envelope. It must not alter MiniGrid policy scoring, contextual-grid results, transport prioritization, society admission, or any live heartbeat configuration.

Only after exact F#/Python receipt agreement and the faults above are observed may a later contract decide whether a benchmark policy can expose this receipt. That later work still needs a distinct observation interface, train/evaluation split, novelty statistic, and benchmark-specific comparison protocol.

## Non-Claims

This contract does not prove that a program knows its actual complexity, that a finite tick is a physical quantum, that any constraint preserves NCI, that consensus has occurred, that a scheduler predicts a future correctly, or that a small policy is generally intelligent. It records what was declared, which bounded envelope was supplied, and whether a finite local adapter could validate the stated structure.

## References

[1]: ../../src/Core/ComplexityRegistry.fs "Complexity registry: declared Big-O shapes, provenance, parsing, and refusal"
[2]: ../../src/Core/SoftScheduler.fs "Injected scheduler source and finite tick drive"
[3]: ../../src/Core/Vision.fs "Forecast branch accounting and deferred-work reports"
[4]: ../../src/Core/FerryThrottler.fs "Self-clocked ferry batching and bounded backpressure"
[5]: ../../src/Core/TickBoundaryProbe.fs "One-way undeclared-crossing detector"
[6]: ../../src/Core.TypeScript/bayesian/sensor-fusion-oracle.ts "Unmetered sensor-fusion triage"
[7]: ../../src/Bayesian/SocietyBootstrap.fs "Attested Gaussian society bootstrap boundary"
