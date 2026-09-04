---
id: 081M1N854ED087G0R002JP5V5N
type: bug
state: backlog
priority: P1
slug: inmemoryfilesystem-keyed-paths-exactly-so-windows-separators
title: "InMemoryFileSystem keyed paths exactly, so Windows separators split one file into two entries"
created: 2026-09-04T03:42:17.037Z
depends_on: []
composes_with: []
---

# InMemoryFileSystem keyed paths exactly, so Windows separators split one file into two entries

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N854ED087G0R002JP5V5N-*.md` glob. -->

## What was red

`drift (loud)` was the single failing check on #16533 (Riven's k3d servicelb fix), holding it
out of merge. It reported two Windows lanes:

| lane | failed executions | clean streak |
| --- | --- | --- |
| `build-and-test (windows-2025)` | **35 / 59 (59.3%)** | 0 |
| `build-and-test (windows-11-arm)` | **33 / 59 (55.9%)** | 0 |

Both lanes, every run, had **exactly one** failing test:

```
Failed Zeta.Tests.ZetaFsFreezeTests.Journaled freeze ContentId matches the mutbuf
  snapshot, not a later pwrite
  Assert.True() Failure — Expected: True, Actual: False
  at ... ZetaFsFreeze.Tests.fs:line 60
```

Line 60 is `Assert.True(FileSystem.Current.Exists "/freeze-mem/cas")`.

## The defect is in the test DOUBLE, not the code under test

`InMemoryFileSystem` keys a `ConcurrentDictionary<string, byte[]>` on the raw path string.
A dictionary is exact; a filesystem is not. **On Windows both `\` and `/` are directory
separators** — `Path.DirectorySeparatorChar` is `\` and `AltDirectorySeparatorChar` is `/` —
so these two spellings name one file to Win32:

- `ZetaFsFreeze.fs:670` creates the CAS with `Path.Combine(storeDir, "cas")` →
  `/freeze-mem\cas` on Windows
- the test asks `Exists "/freeze-mem/cas"` → a different dictionary key → **false**

A double that disagrees with the thing it doubles is worse than no double: the test it breaks
is testing the mock, not the code.

**Why only this one assertion caught it.** Every other assertion in that test reaches the
filesystem through the same `Path.Combine` the production code used, so both sides move
together and the divergence is invisible — the self-comparison shape. Line 60 is the only
place that spells the path independently, which is exactly why it is the only line that can
see the bug.

## The fix, and the half that is easy to get wrong

`InMemoryPathKey.normalize` canonicalises the key at every entry point that touches the
dictionary — `Exists`, `Delete`, `Move` (both sides), `ReadAllBytes(Async)`, the three
stream openers, `GetFiles` (**including the prefix**, or the defect just moves one step
along), `WriteAt`, and the `publish` / `existingBytes` helpers.

**It is platform-conditional, and that is not a detail.** On Unix `\` is a **legal filename
character**, so folding it to `/` there would merge two genuinely different files and invent
a collision the real filesystem does not have — a worse defect than the one being fixed.

## Verified on macOS, which cannot run the failing platform

The fold is identity on Unix, so a local green run proves nothing about Windows. Three
builds settle it instead:

| run | expectation | result |
| --- | --- | --- |
| A — fold forced ON, real Unix expectations | Unix branch must go red | **2 failed** — the Unix half is a real falsifier |
| B — fold ON, test told the platform separates on `\` (**Windows + fix**) | all pass | **3 passed** |
| C — same simulation, **fix removed** | must go red | **2 failed** — reproduces CI on macOS |

B and C are the pair that matters: same simulated platform, fix present → green, fix absent →
red.

## The falsifier asserts on BOTH platforms

The obvious shape — assert the fold, skip on Unix — would leave every Unix runner reporting
nothing, which is the failure mode this repo most wants to avoid. So both branches assert,
and they assert **opposite** things, because the correct behaviour genuinely is opposite:
Windows must fold two spellings into one entry; Unix must keep them as two files.

## Filed separately, not fixed here

`ZetaFsFreeze.fs` builds **13** virtual paths with `Path.Combine`, so a virtual filesystem's
namespace takes its shape from the host it runs on. That is benign for Win32 (which accepts
both separators) and is still ambient host state in a namespace that is supposed to be the
substrate's own — a DST/§13 concern rather than a broken test. Changing 13 call sites in
storage code touches on-disk layout semantics and deserves its own review.
