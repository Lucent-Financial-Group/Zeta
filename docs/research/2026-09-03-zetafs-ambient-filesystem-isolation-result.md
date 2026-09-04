# ZetaFs Ambient File-System Collection Isolation Result

> **Status:** **Test-isolation hypothesis implemented; root cause unproven.** The
> Journaled-freeze snapshot assertion failed on Windows 2025 and Windows 11 ARM,
> but it did not reproduce in local isolated execution. No production
> `ZetaFsFreeze`, snapshot, durability, or content-hash behavior was changed.

## Scope

The investigated property is narrow: `Journaled.freezeAsync` must derive its
`ContentId` from the mutbuf bytes present when the freeze transaction snapshots
them, rather than a later `pwrite`. The pre-existing assertion remains intact.

`FileSystem.Register` changes an `AsyncLocal<IFileSystem>` provider. Although
the provider is not a plain process-global field, execution contexts can flow
through asynchronous work. xUnit also schedules distinct test collections in
parallel by default.[1] The observed Windows-only failure therefore justified a
test-host isolation hypothesis before any production change.

## Change

The six F# test modules that register a provider are assigned to the
non-parallel `ZetaFsAmbientFileSystem` xUnit collection:

| Module | Purpose |
|---|---|
| `SimulatedFileSystem.Tests` | Runtime provider behavior |
| `DiskDeltaLog.Tests` | Storage log behavior |
| `ZetaFsFormat.Tests` | File-system format behavior |
| `ZetaFsFreeze.Tests` | Journaled snapshot/freeze behavior |
| `ZetaFsMutbuf.Tests` | Mutbuf behavior |
| `ZetaFsReclaim.Tests` | Reclamation behavior |

The collection definition is test-only. It documents the shared ambient
provider assumption and prevents these modules from overlapping each other;
it does not serialize unrelated tests or alter production storage code.

## Local Result

| Control | Result | Interpretation |
|---|---:|---|
| ZetaFs-family F# tests | 140 / 140 pass | Collection compiles and preserves local behavior |
| Repeated normal-scheduling runs | 12 / 12 pass | No local regression or reproduced failure |
| Production storage delta | 0 files | This is isolation, not a storage implementation claim |

## Remaining Falsifiers

The collection is a hypothesis control, not a causal proof. It is rejected if
the same Windows assertion persists with the collection, if collection
annotation changes discovered tests, or if a deliberate interleaved two-provider
test fails within one logical execution context. Any such result requires a
separate production-level snapshot or execution-context investigation.

## References

[1] [xUnit.net, “Running Tests in Parallel”](https://xunit.net/docs/running-tests-in-parallel)
