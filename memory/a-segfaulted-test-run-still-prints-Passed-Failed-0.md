---
name: a-segfaulted-test-run-still-prints-Passed-Failed-0
description: "A dotnet test run that segfaults partway still prints `Passed! - Failed: 0, Passed: N` for the tests it got through — green-looking output from a run that never finished"
metadata:
  type: reference
---

Observed 2026-08-25: a full `Zeta.sln` run **segfaulted (exit 139)** after 2169 of
5736 tests. An immediate re-run on the identical tree passed 5730/5736 — so the crash
is nondeterministic and was not caused by the code under test.

**The dangerous part is the output, not the crash:**

```
Passed!  - Failed: 0, Passed: 2169
```

That line is emitted **per assembly**, so a run that dies mid-suite still prints a
clean-looking summary for everything it completed. Grep for `Failed: 0` and a crashed
partial run is indistinguishable from a full green one. The count is the only tell,
and only if you already know what the total should be.

**Scope — checked, 2026-08-25, do not overstate this:**

- **CI is NOT exposed.** `grep -rn --include='*.yml' --include='*.sh' --include='*.ts'`
  over `.github/`, `src/Core.TypeScript/`, `tools/` for that summary text returns
  **zero** hits (one unrelated `renewalAttemptsFailed: 0`). The pipeline goes by
  **exit code**, and a segfault is 139 — caught.
- **Humans and agents ARE exposed.** The agent that hit this took the line at face
  value on its first pass. Any tick that reads a log tail rather than `$?` inherits
  the defect.

**So the rule is the usual one, in a new costume:** the verdict is the **exit code**,
never the summary line. When you must read the text, read the **count** and compare it
to the expected total — `Failed: 0` alone is the vacuity class, a check that did not
finish looking exactly like one that passed.

Related: [[zero-failures-is-not-green]] (the CI-surface form of the same shape) ·
[[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] ·
[[verify-the-tree-not-just-the-command]]
