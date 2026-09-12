---
id: 081M2B4E5B6087G0R002DHDFCH
type: bug
state: backlog
priority: P1
slug: nu1004-core-csharp-tests-lock-still-records-10-0-11-after-cp
title: "NU1004: Core.CSharp.Tests lock still records 10.0.11 after CPM 10.0.12"
created: 2026-09-12T15:40:36.070Z
depends_on: []
composes_with: []
---

# NU1004: Core.CSharp.Tests lock still records 10.0.11 after CPM 10.0.12

`#17358` moved `System.IO.Hashing` and `System.Numerics.Tensors` (and
`Microsoft.Extensions.DependencyInjection.Abstractions`) to `10.0.12` in
`Directory.Packages.props` and did not regenerate `packages.lock.json`.

`low-memory` restores `tests/Core.CSharp.Tests` with `--locked-mode` and
fails NU1004: lock requested `[10.0.11, )`, CPM says `[10.0.12, )`.
`gate (required)` stays green because `dotnet build` does an implicit
unlocked restore (`docs/NUGET-LOCK-FILES.md`).

Remedy is the documented one: `dotnet restore Zeta.sln` (plus the
out-of-solution lock-bearing projects) and commit the rewritten locks.
Do not hand-edit the JSON. Do not raise the unbounded-growth ceiling on
this class — regenerating locks is the registered cost of pinning
bytes.
