# ZetaFs Journaled CAS-Directory Control Contract

> **Decision:** Diagnose the observed Windows failure as a **CAS-directory
> visibility** failure first. Do not describe it as a snapshot-content race.

## 1. Observed Predicate

The protected main run for merge commit
`2307bb02ea0ecf0c677d9a67f05ba7291a51282c` reported `Expected: True` and
`Actual: False` at `ZetaFsFreeze.Tests.fs:60` on both Windows runners. At that
commit, the exact line is:

```fsharp
Assert.True(FileSystem.Current.Exists "/freeze-mem/cas")
```

The assertion is inside a test whose name mentions a mutbuf snapshot, but it is
not itself a `ContentId` comparison. All preceding assertions in that test must
have completed for execution to reach line 60. The immediate claim is therefore
limited to the visible failure: the active `IFileSystem` did not report the
expected Journaled `FileSystemBlockIo` CAS path at that point.

## 2. Declared Question

For the declared in-memory `ZetaFsFreeze.create` profile, which of these finite
states holds at the existing failure point?

| State | Meaning | Result classification |
|---|---|---|
| `created` | The captured provider contains `/freeze-mem/cas` immediately after volume construction. | Constructor path visible. |
| `missing-at-create` | The captured provider lacks the path immediately after construction. | Constructor/path creation failure. |
| `provider-changed` | `FileSystem.Current` is no longer the provider registered by the test. | Ambient-provider observation failure. |
| `lost-after-create` | The path exists after construction but not after a Journaled freeze under the same provider. | File visibility/lifecycle failure. |
| `unresolved` | The trace cannot establish one state without an exception or an unavailable observation. | Refuse a diagnosis. |

The matrix does not claim which state will occur on Windows. It only gives the
failure a discriminating, reproducible vocabulary.

## 3. Test-Only Instrumentation

The existing test retains every current assertion and adds only local receipts:

1. Retain the `InMemoryFileSystem` instance before `FileSystem.Register`.
2. Inspect `fs.Files.ContainsKey "/freeze-mem/cas"` immediately after
   `ZetaFsFreeze.create`.
3. Compare the object identity of `FileSystem.Current` with that captured
   instance immediately after creation, before each freeze, and at the existing
   line-60 check.
4. Record the CAS-path presence at the same points.
5. Fail with a specific teaching error that names the first observed
   classification; never silently select an interpretation.

No production tracing hook, timing delay, retry, test serialization change, or
storage behavior change is authorized by this contract.

## 4. Separate Content Timing Boundary

The existing test continues to check that first and second Journaled results
have different `ContentId` values after a later `pwrite`. `ZetaFsMutbuf.snapshot`
is deliberately **not** a passive observer: it copies live bytes and increments
the mutbuf generation. A test that calls it before `freezeAsync` changes the
generation that the freeze should report and is therefore invalid as an
independent timing control.

This CAS-directory investigation retains the existing non-invasive content
inequality only. Any future pre-/post-write content trace needs a separately
frozen, non-mutating observation interface or an isolated test seam; if it
reuses `ZetaFsJumprope.buildV1`, it remains a snapshot-timing control rather
than an independent hash-algorithm oracle. It must not convert a passing content
inequality into proof of arbitrary snapshot correctness.

## 5. Positive and Fault Controls

| Control | Expected result | Why it can fail |
|---|---|---|
| Default `ZetaFsFreeze.create` | `created`, same provider, and path remains visible through the current assertion. | Detects the Windows symptom directly. |
| `createManualStream` | No `BlockCas` file is expected; a CAS-path expectation must refuse rather than misclassify it. | Proves the check is specific to the declared profile. |
| Deliberate test-only expectation mutation | The stable default-profile receipt must fail if it expects a missing CAS path. | Proves the receipt is not a self-confirming log. |

## 6. Non-Claims and Stop Rule

This is not a production repair, a durability proof, a snapshot-race proof, or
a statement about Windows file systems generally. If the matrix confirms
`created` and same-provider visibility locally while Windows still fails, stop
at `unresolved` and collect a platform trace rather than widening production
scope. A production change requires a separately frozen contract, a reproduced
mechanism, and a control that the proposed repair can fail.
