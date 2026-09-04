# ZetaFs Ambient File-System Collection Isolation Result

> **Status:** **Test-isolation hypothesis falsified for the original Windows
> reproduction; production root cause unproven.** The Journaled-freeze snapshot
> assertion failed on Windows 2025 and Windows 11 ARM both before and after the
> collection change, while it did not reproduce in local isolated execution. No
> production `ZetaFsFreeze`, snapshot, durability, or content-hash behavior was
> changed.

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

## Post-Merge Windows Falsification

The exact merged collection change was rerun in protected main gate
`33819376817` at merge commit `2307bb02ea0ecf0c677d9a67f05ba7291a51282c`.
Both `build-and-test (windows-11-arm)` and `build-and-test (windows-2025)`
failed the same `Journaled freeze ContentId matches the mutbuf snapshot, not a
later pwrite` assertion at `ZetaFsFreeze.Tests.fs:60` with `Expected: True` and
`Actual: False`.

The non-parallel collection therefore does **not** explain or repair that
Windows reproduction. It may still be an appropriate test-host hygiene control,
but it is rejected as the sufficient cause of the snapshot failure. No inference
about the underlying storage root cause follows from this negative result.

## Remaining Investigation Boundary

The next investigation must keep the snapshot-versus-later-`pwrite` assertion
unchanged and obtain a reproducible trace at the storage or execution-context
boundary. Plausible lanes include the journaled snapshot transaction, mutbuf
ownership/copy timing, Windows-specific asynchronous scheduling, and the
file-system provider path. None is selected by the current evidence, so no
production repair is authorized from this document alone.

## References

[1] [xUnit.net, “Running Tests in Parallel”](https://xunit.net/docs/running-tests-in-parallel)
