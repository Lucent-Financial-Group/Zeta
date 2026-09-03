---
id: 081M1K97HVN087G0R0013Q79MG
type: bug
state: backlog
priority: P2
slug: a-jvm-that-failed-to-start-was-reported-as-toolchain-drift
title: "A JVM that failed to start was reported as toolchain drift"
created: 2026-09-03T10:10:00.000Z
depends_on: []
composes_with: []
---

# A JVM that failed to start was reported as toolchain drift

## How it surfaced

A full `dotnet test Zeta.sln -c Release` came back **1 failed / 6187 passed**. The rerun was fully
green. A flake in a 6,196-test suite is easy to shrug at, so it was run three more times with TRX
logging to name it rather than dismiss it:

```
run1.trx: no failures
run2.trx: TlcRunnerTests.TLC checks the pinned model(id: "WagerSolvencyStaleAttestation")
run3.trx: no failures
```

## The defect

The failure message was:

> **TOOLCHAIN DRIFT** on WagerSolvencyStaleAttestation: the registry pins TLC2 Version
> 2026.05.18.174321 (rev: 8ba1027) and this jar reports something else. **A different TLC is a
> different experiment.**
>
> ```
> Error occurred during initialization of VM
> Could not reserve enough space for object heap
> ```

The jar was fine. **The JVM never started** — under the memory pressure of the whole F# suite it
could not reserve its heap, so TLC printed no banner. `judge` asked _"is the pinned banner present?"_
first, and a missing banner has two very different causes:

| cause                               | what it means     | what to do                             |
| ----------------------------------- | ----------------- | -------------------------------------- |
| the jar reports a different version | real drift        | **an operator must act**               |
| TLC never ran at all                | environment fault | **retry**; give the runner more memory |

One verdict covered both, and it named the wrong one. A reader would have gone hunting a version
mismatch that did not exist — while the actual message needed was _"this run says nothing about the
model."_

This is the same class as `forge-diagnosis`: **a failure whose KIND is misreported costs more than
the failure.**

## The fix

`jvmNeverStarted` is asked **before** the banner check, because a JVM that never started cannot print
a banner and its absence is therefore not evidence about the jar. It matches the JVM's own
pre-TLC markers — heap reservation failure, VM initialisation failure, inaccessible jarfile,
`OutOfMemoryError` — and fails with:

> **TLC DID NOT RUN** on … — the JVM failed to start, so this says **NOTHING** about the model or the
> jar's version. **NOT toolchain drift**: retry, and if it persists give the runner more memory or
> lower TLC's heap.

It still **fails**, deliberately. A check that did not run must not look like one that passed; only
the diagnosis changes.

## Falsifiers

Two tests, and the second matters as much as the first — a guard that called everything an
environment fault would silently accept an unpinned checker:

| test                                                                   | asserts                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `a JVM that never started is reported as such, not as toolchain drift` | says `TLC DID NOT RUN`, does **not** say `TOOLCHAIN DRIFT`, and states it says nothing about the model |
| `a jar reporting a different version IS toolchain drift`               | the real drift path still fires                                                                        |

Verified by removing the guard: the first test goes red, the second stays green.

```
dotnet test tests/Tests.FSharp --filter FullyQualifiedName~TlcRunnerTests   # 60 passed
```

## Worth noting about the flake itself

The underlying resource contention is real and not fixed here: TLC is a JVM process competing with a
6,000-test suite for memory. What changes is that the next occurrence **says what happened**. Naming
the failure honestly is the prerequisite for deciding whether to bound TLC's heap or serialise it
further — and it stops the next reader spending an hour on the jar.
