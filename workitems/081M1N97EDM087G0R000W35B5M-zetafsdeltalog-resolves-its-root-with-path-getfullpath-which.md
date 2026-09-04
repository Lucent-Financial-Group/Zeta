---
id: 081M1N97EDM087G0R000W35B5M
type: bug
state: backlog
priority: P3
slug: zetafsdeltalog-resolves-its-root-with-path-getfullpath-which
title: "ZetaFsDeltaLog resolves its root with Path.GetFullPath, which is ambient CWD"
created: 2026-09-04T04:01:01.364Z
depends_on: []
composes_with: []
---

# ZetaFsDeltaLog resolves its root with Path.GetFullPath, which is ambient CWD

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N97EDM087G0R000W35B5M-*.md` glob. -->

`src/Core/ZetaFsDeltaLog.fs:36`:

```fsharp
let root = Path.GetFullPath dir
```

## Why this is a defect and not the same one just fixed

The separator defect (081M1N854ED087G0R002JP5V5N) is now fixed: every ZetaFS module builds
paths with `ZetaFsPath`, which is host-independent. This is a **different** ambient-state
leak in the same file:

| | leaks | fixed by |
| --- | --- | --- |
| `Path.Combine` | the host **separator** | `ZetaFsPath.join` — done |
| `Path.GetFullPath` | the process **working directory** | not this, and not obviously anything |

`ZetaFsDeltaLog` routes all eight of its filesystem calls through `FileSystem.Current`, so
its `dir` may be a virtual ZetaFS root. `GetFullPath` on `/store` resolves against the
CWD and, on Windows, returns something like `C:\store` — a host-rooted path fabricated out
of where the process happened to be started. That is §13 noninterference: influence entering
through an undeclared channel.

## Why it was not auto-healed

Deliberate, and recorded as `zetafs-virtual-path/fullpath-tier2` by the detector, which
reports it as a **warning** rather than failing on it.

Removing the call **changes behaviour for existing real-path callers**: a relative `dir`
stops becoming absolute. Every current caller in the tree passes an absolute temp directory,
so the change is probably invisible — *probably* is a judgement, and the healer's whole claim
to being safe is that it makes none.

## The options, none of them free

1. **Drop it.** Correct for virtual roots; changes relative-path semantics for real ones.
2. **Resolve through the abstraction.** `IFileSystem` has no `GetFullPath`, so this means
   adding one — and then the in-memory double has to answer it, which means deciding what
   "absolute" means in a namespace with no CWD.
3. **Require an absolute `dir` and refuse a relative one.** Fails closed and makes the
   requirement explicit, at the cost of a breaking change for any caller passing a relative
   path.

Option 3 is the one that matches how this repository usually resolves an ambient input —
refuse it rather than resolve it — but it is a maintainer's call on a public constructor.

Parent: 081M1N854ED087G0R002JP5V5N.
