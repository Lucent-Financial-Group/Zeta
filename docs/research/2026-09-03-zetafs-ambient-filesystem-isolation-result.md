# ZetaFs Ambient File-System Collection Isolation Result

> **Status:** **Test-isolation hypothesis falsified for the original Windows
> reproduction; production root cause unproven.** The test named for the
> Journaled-freeze snapshot contract failed on Windows 2025 and Windows 11 ARM
> both before and after the collection change, while it did not reproduce in
> local isolated execution. The observed failing predicate is the Journaled CAS
> directory existence check, not a `ContentId` comparison. No production
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
| ZetaFs-family F# tests | 141 / 141 pass | Collection and corrected CAS-visibility controls preserve local behavior |
| Repeated normal-scheduling runs | 12 / 12 pass | No local regression or reproduced failure |
| Production storage delta | 0 files | This is isolation, not a storage implementation claim |

## Corrected Local CAS Matrix

The test-only trace added after the Windows source-line audit observes the
captured `InMemoryFileSystem` instance, rather than inspecting only the ambient
property. Locally, the default `ZetaFsFreeze.create` profile has a visible
`/freeze-mem/cas` path immediately after construction and retains both the same
provider and the CAS path before and after each of the two Journaled freezes.
The `createManualStream` control does not create that path, as expected for the
non-`BlockCas` profile.

An inverted test-only CAS expectation fails the targeted default-profile test
(`1 / 1` failed), then the original expectation restores and the 141-test ZetaFs
family passes. This proves the receipt observes the declared default profile;
it does not reproduce or explain the Windows result. The frozen control contract
is `2026-09-04-zetafs-windows-cas-directory-control-contract.md`.

## Post-Merge Windows Falsification

The exact merged collection change was rerun in protected main gate
`33819376817` at merge commit `2307bb02ea0ecf0c677d9a67f05ba7291a51282c`.
Both `build-and-test (windows-11-arm)` and `build-and-test (windows-2025)`
failed the test named `Journaled freeze ContentId matches the mutbuf snapshot,
not a later pwrite` at `ZetaFsFreeze.Tests.fs:60` with `Expected: True` and
`Actual: False`. At that merge commit, line 60 is exactly
`Assert.True(FileSystem.Current.Exists "/freeze-mem/cas")`; it follows the
content inequality, generation, and readability assertions. The run therefore
does not establish a snapshot-versus-later-`pwrite` mismatch.

The non-parallel collection therefore does **not** explain or repair that
Windows CAS-directory reproduction. It may still be an appropriate test-host
hygiene control, but it is rejected as the sufficient cause of that failure. No
inference about a snapshot-content race or another underlying storage cause
follows from this negative result.

## Remaining Investigation Boundary

The next investigation must keep every existing assertion unchanged and add a
test-only matrix that separately traces Journaled CAS-directory creation and
pre-/post-`pwrite` content identities. Plausible lanes include the `BlockCas`
or directory-creation path, in-memory file-system state, Windows-specific
asynchronous scheduling, and provider ownership. A content snapshot race is a
separate untested lane, not an established diagnosis. None is selected by the
current evidence, so no production repair is authorized from this document
alone.

## References

[1] [xUnit.net, “Running Tests in Parallel”](https://xunit.net/docs/running-tests-in-parallel)
