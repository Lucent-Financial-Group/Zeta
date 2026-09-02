---
id: 081M1G5MFVP087G0R000JRBK4Z
type: bug
state: backlog
priority: P2
slug: build-and-test-windows-2025-fails-at-the-test-step-intermitt
title: "build-and-test (windows-2025) fails at the Test step intermittently on main — 3 of the last 8 commits, build always green"
created: 2026-09-02T04:22:02.358Z
depends_on: []
composes_with: []
---

# build-and-test (windows-2025) fails at the Test step intermittently on main — 3 of the last 8 commits, build always green

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1G5MFVP087G0R000JRBK4Z-*.md` glob. -->

## The measurement

`build-and-test (windows-2025)` over the last 8 commits on `main`, read from the
check-runs API (2026-09-02):

| commit | verdict | what the commit changed |
|---|---|---|
| `b25f39998` | **failure** | `archive(pr-reviews): PR #16292 on merge` — docs only |
| `220eb8693` | success | the redis/valkey migration (TS + JSON + YAML) |
| `0452bc2d6` | success | pr-review archive — docs only |
| `afa848c12` | success | memory doc — docs only |
| `d19e6d468` | success | pr-review archive — docs only |
| `0ab1adbb7` | **failure** | seaweedfs chart bump — YAML only |
| `857f91b3a` | success | rffh oracles (F# + TS) |
| `62fb27eb2` | **failure** | pr-review archive — docs only |

**3 of 8, and the step signature is identical every time:**
`install-windows=success roslyn-guard=success build=success test=failure`.

## Why this is a flake and not a regression

Two of the three failures are on commits that changed **only Markdown**, and the
one commit in the window that actually touched F# (`857f91b3a`) **passed**. A
.NET test that fails on a docs-only commit and passes on an F# commit is not
reading the diff. `build` is green in all three, so it is not a compile problem
either — the tests build and then something in the run fails.

## What I could NOT establish, stated so nobody reads more into this than it holds

**Which test fails is unknown.** The check-run annotations carry only the job's
step summary line, and `GET /actions/jobs/{id}/logs` returns **0 bytes** for all
three (expired or not permitted for this token). So this item records a
PATTERN, not a diagnosis, and it should not be closed by anyone who has not
named the failing test.

Whether it is one test or several is likewise unknown — the identical step
signature is consistent with one flaky test and equally consistent with several.

## Next step for whoever picks this up

The cheap first move is to make the failure *legible* rather than to guess at it:
have the Windows leg upload the `.trx`/test output as an artifact (or print the
failed-test names on failure), so the next occurrence names itself. Chasing a
Windows-only .NET flake from macOS without the test name is the expensive order
to do this in.

## Provenance

Noticed while confirming `main` health after #16292 merged. Not caused by it —
that PR's own merge commit (`220eb8693`) is the `success` row above.
