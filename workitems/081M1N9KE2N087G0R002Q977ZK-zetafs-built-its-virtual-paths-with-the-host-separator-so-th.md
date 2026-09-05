---
id: 081M1N9KE2N087G0R002Q977ZK
type: bug
state: backlog
priority: P1
slug: zetafs-built-its-virtual-paths-with-the-host-separator-so-th
title: "ZetaFS built its virtual paths with the host separator, so the namespace changed shape per machine"
created: 2026-09-04T04:07:34.229Z
depends_on: []
composes_with: []
---

# ZetaFS built its virtual paths with the host separator, so the namespace changed shape per machine

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N9KE2N087G0R002Q977ZK-*.md` glob. -->

## The defect

A ZetaFS module hands every path it builds to `FileSystem.Current`, which is an
**abstraction** — it may be the host filesystem, it may be `InMemoryFileSystem`, and the
module cannot tell. All five were building those paths with `System.IO.Path.Combine`, a
function of the **host**: `\` on Windows, `/` everywhere else.

So the namespace of a filesystem meant to be the substrate's own took its shape from
whichever machine ran the code — ambient state in a namespace (§13 noninterference), and a
break of the DST property that identical inputs give identical outputs regardless of host.
A key written on Windows and one written on Linux were literally different strings for the
same file.

**Measured 2026-09-04:** 27 `Path.Combine` and 4 `Path.GetDirectoryName` across
`ZetaFsFreeze`, `ZetaFsMutbuf`, `ZetaFsCli`, `ZetaFsFormat`, `ZetaFsDeltaLog`.

## The fix

`ZetaFsPath` — POSIX-shaped, host-independent, pure. All 31 call sites moved.

**A `/`-join is also correct for real host paths**, which makes this a strict improvement
rather than a trade: Win32 accepts both separators (`Path.AltDirectorySeparatorChar` is `/`
on Windows precisely because the API treats it as one), so `C:\store/objects` opens the
same file as `C:\store\objects`. There is no case where `Path.Combine` is right and this
is wrong.

`directoryName` is here rather than `Path.GetDirectoryName` not because that function is
known to be wrong, but because its behaviour on a `/`-shaped path under Windows is
something this codebase would have to **assume**. A pure substring split needs no
assumption and is testable identically on every platform.

## Relationship to 081M1N854ED087G0R002JP5V5N

Complementary, and either alone turns the failing Windows test green:

| | fixes | protects |
| --- | --- | --- |
| 081M1N854ED087G0R002JP5V5N | the test **double** — on Windows `/a/b` and `/a\b` are one file and the double said two | every future caller of `InMemoryFileSystem` |
| this | the **source** — the namespace no longer takes its shape from the host | the §13 leak itself |

## Falsifiers

`tests/Tests.FSharp/ZetaFsPath.Tests.fs` — 8 tests, every assertion holding identically on
every platform, which is the property. Includes **associativity of `join`** (a caller may
build a path in pieces without the result depending on where it split) and a **round-trip**
between `join` and `directoryName` (a pair that disagreed would put a file in one place and
create its parent in another).

Guarded by `src/Core.TypeScript/hygiene/healers/zetafs-virtual-path.ts`, whose detector runs
in CI and whose live-tree test asserts the tree starts **green**.

Children: 081M1N97ECS087G0R003GCPEDZ (register the healer in tier-0),
081M1N97EDM087G0R000W35B5M (`Path.GetFullPath` is a separate ambient-CWD defect).
