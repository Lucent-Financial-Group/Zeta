---
name: windows-gate-flake-is-xunit-v3-stdout-interleaving
description: The ~7-8% build-and-test (windows-2025) failure is xUnit v3 assemblyInfo JSON parsing polluted by concurrent sibling test processes, not a test regression.
metadata:
  type: project
---

`build-and-test (windows-2025)` fails intermittently (measured 5/59 = 8.5% on
2026-08-28) with **no test regression**. The mechanism, from run 98774034246
on `1bc776c119`:

Four test projects launched concurrently — `Bayesian.Tests`, `Tests.CSharp`,
`Tests.FSharp`, `Core.CSharp.Tests` — each died with

```
Catastrophic failure: System.InvalidOperationException:
  Test process did not return valid JSON (non-object). Output:
  No test is available in ...\Core.CSharp.Tests.dll ...
  {"arch-os":"X64", ...}
  Waiting 10 seconds for foreground threads to exit...
    at Xunit.v3.TestProcessLauncherAdapter.GetAssemblyInfo(...)
```

xUnit v3 launches each assembly as a subprocess and parses **one** JSON object
off its stdout. Each failing assembly's captured output contains lines belonging
to its *siblings* (Bayesian's error quotes `Core.CSharp.Tests.dll`'s path), so
this is cross-process stdout interleaving between the parallel project runs.
`Waiting 10 seconds for foreground threads to exit...` is a second polluter.
The JSON is present and valid; it is just not alone.

Corroborating: `0 Warning(s) 0 Error(s)`, and the three assemblies that ran
*serially* afterward (12, 3, 38 tests) all passed. Timing-sensitive, which is
why it is Windows-only and intermittent.

**How to identify it in one step** on a red Windows leg:
`gh api --allow-escape-sequences repos/.../actions/jobs/<id>/logs | grep -a "Catastrophic failure"`.
A hit means this flake; no hit means look further.

**Why:** repeatedly re-diagnosed as "the Windows flake" with no mechanism, which
made every occurrence cost a fresh investigation.

**How to apply:** treat a `Catastrophic failure ... did not return valid JSON`
red as infrastructure, not a regression — do not bisect the product. The
candidate fixes (serialize the test projects, `-m:1` on the VSTest target) are
CI-shape changes and need Aaron's call; see
[[a-suppression-flag-you-never-verified-is-a-check-that-never-ran]] for why an
unattended CI edit here is expensive.
