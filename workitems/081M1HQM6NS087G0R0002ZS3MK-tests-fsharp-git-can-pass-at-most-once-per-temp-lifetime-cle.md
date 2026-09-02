---
id: 081M1HQM6NS087G0R0002ZS3MK
type: bug
state: backlog
priority: P2
slug: tests-fsharp-git-can-pass-at-most-once-per-temp-lifetime-cle
title: "Tests.FSharp.Git can pass at most once per temp lifetime: cleanup cannot delete a git repo on Windows and swallows saying so"
created: 2026-09-02T18:55:41.753Z
depends_on: []
composes_with: []
---

# Tests.FSharp.Git can pass at most once per temp lifetime: cleanup cannot delete a git repo on Windows and swallows saying so

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HQM6NS087G0R0002ZS3MK-*.md` glob. -->

## The defect

Every fixture in `tests/Tests.FSharp.Git/` does the same two things:

```fsharp
if Directory.Exists dir then Directory.Delete(dir, true)   // setup   — UNGUARDED
finally try Directory.Delete(dir, true) with _ -> ()       // teardown — SWALLOWED
```

`Directory.Delete(recursive = true)` **cannot remove a git repository on Windows**. Git writes
loose objects under `objects/xx/…` read-only (mode 444), and the Win32 delete refuses a read-only
file with `UnauthorizedAccessException`. So the teardown throws on every single run — and its
`with _ -> ()` swallows the one report that would have said so.

The directory names are a per-process counter (`saga-0001`, `ddl-0002`, …), not unique, so the
directory that survives is **exactly the path the next run picks**. That run reaches the setup
delete, which is *not* guarded, and dies before the test body starts — attributing a
stale-temp-directory problem to whatever test happened to run first.

The two halves compound: the swallowed teardown creates the condition, and the unguarded setup
converts it into a failure one run later, in a different test, with an error message that names
neither.

## Measured (Windows 11, .NET 10.0.400, 2026-09-02)

| run | result | directories left in `%TEMP%/zeta-git-test` |
|---|---|---|
| from a clean temp tree | 35 / 38 | 20 |
| next run | 15 / 38 | 20 |
| every run after | stays there | 20 |

The suite passes **at most once per temp-directory lifetime**. That first-run pass is what makes it
look healthy on a fresh machine and in CI, which starts clean every time.

Linux is unaffected, and that is not luck: POSIX `unlink` needs write permission on the
**directory**, not on the file, so read-only loose objects delete without complaint. The platform
difference is in the delete semantics, not in git.

## Fix

`tests/Tests.FSharp.Git/TempRepo.fs` — `deleteRepoDir` clears the `ReadOnly` attribute across the
tree and then deletes, with a bounded retry for the unrelated Windows case where an indexer or
scanner holds a transient handle. The final attempt is deliberately allowed to throw, so a genuine
failure is reported rather than swallowed a second time. All 17 call sites across 9 fixture files
now use it, in both the setup and teardown positions.

**Clearing the attribute is the fix; catching the error harder would have preserved the leak.**

After: **38 / 38 on three consecutive runs, 0 directories left behind after each.**
