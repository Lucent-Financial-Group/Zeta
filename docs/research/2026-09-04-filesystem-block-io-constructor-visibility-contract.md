# FileSystemBlockIo Constructor Visibility Contract

> **Decision:** Repair only the declared constructor invariant: after a
> successful `FileSystemBlockIo(fs, path, blockSize)` construction, the injected
> provider reports `fs.Exists path`. The repair is not a freeze-order, snapshot,
> CAS-format, durability, or Windows-generalization change.

## 1. Reproduced Boundary

The post-merge gate for `9cfa93dd2e59e09f7ed710d1a284555bdf6b9e74` executed
the PR #16555 captured-provider trace. Both Windows 2025 and Windows 11 ARM
failed at `missing-at-after-create on the captured provider`, before either
Journaled freeze. This rejects ambient-provider replacement and snapshot timing
as explanations for that reproduction. The source-owned constructor currently
opens an empty write stream and relies on scope disposal to make the path
visible.

## 2. Declared Invariant

| Input | Required result | Explicit non-claim |
|---|---|---|
| Existing `path` | Construction preserves the existing file and reports it visible. | No payload validation or repair. |
| Missing `path` | Construction creates a visible zero-length backing file through the injected `IFileSystem`. | No commit durability beyond the provider contract. |
| Invalid non-power-of-two block size | Construction refuses before any file observation or write. | No partial backing file. |

The only new behavioral promise is visible backing-file creation after a
successful constructor call.

## 3. Candidate Repair

When the path is absent, retain the current injected `OpenWrite(path, false)`
creation route and explicitly call `Flush()` on the empty stream before scope
disposal:

```fsharp
use stream = fs.OpenWrite(path, false)
stream.Flush()
```

For `InMemoryFileSystem`, `Flush()` publishes the current buffer without
triggering its crash/corrupt/reorder dispose arms. For the physical provider,
`OpenWrite` is already `FileMode.Create`; the explicit flush makes visibility a
constructor postcondition instead of an implicit disposal side effect.

## 4. Required Controls

| Control | Expected result | Failure sensitivity |
|---|---|---|
| Direct missing-path constructor | The provider reports the path visible immediately after construction. | Detects a missing initialization write/publish. |
| Reorder-arm constructor control | An `InMemoryFileSystem` reorder arm cannot hide the empty backing file after construction. | Fails on the prior dispose-only implementation; passes only with explicit pre-dispose publication. |
| Existing-path control | Constructor retains existing bytes. | Detects accidental truncation. |
| Invalid block-size control | Constructor throws and does not create the path. | Detects validation reordered after file creation. |

The reorder control is the non-vacuous mutation target: removing the new
`Flush()` must make it fail. The standard direct constructor control alone is
not sufficient because ordinary disposal can make it pass locally.

## 5. Local Control Result

The four direct constructor controls and the ZetaFs freeze family pass locally
(`62 / 62`). Removing the explicit empty-stream `Flush()` makes the reorder-arm
control fail (`Expected: True`, `Actual: False`); restoring it returns the
controls to green. The complete F# suite then passes (`6,283` passed, `6`
skipped, `0` failed). These are local implementation controls only; the two
affected Windows runners remain the required platform verification.

## 6. Excluded Scope and Stop Rule

Do not change `ZetaFsFreeze`, `ZetaFsMutbuf.snapshot`, `BlockCas` layout,
Journaled ordering, Durable behavior, or platform workflows in this increment.
After the controls pass locally, the repair must run on both affected Windows
runners. If either reports a different trace stage or another test fails, record
that result and stop; do not add retries, timing delays, or broad provider
changes without a new contract.
