---
id: 081M1HP9SNZ087G0R000RFHE13
type: bug
state: backlog
priority: P2
slug: windows-tests-pass-alone-and-fail-in-company-bun-5s-default
title: "Windows: tests pass alone and fail in company — bun 5s default, a POSIX path assertion, and git core.symlinks"
created: 2026-09-02T18:32:32.191Z
depends_on: []
composes_with: []
---

# Windows: tests pass alone and fail in company — bun 5s default, a POSIX path assertion, and git core.symlinks

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HP9SNZ087G0R000RFHE13-*.md` glob. -->

## Context

First full local gate run on Windows 11 (bun 1.4.0, .NET SDK 10.0.400, the pinned version). The
build is clean — `dotnet build Zeta.sln -c Release`: **0 Warning(s), 0 Error(s)** with
`TreatWarningsAsErrors` on. `dotnet test Zeta.sln -c Release`: **7,083 tests, 2 failed**. The bun
suite for `agent-heartbeats`: **19 failed** on the first run.

Every one of those failures is the environment, not a defect — and each was expensive to tell apart
from a real one, which is the actual cost being fixed here.

## 1. bun's 5000 ms default cap (17 of the 19)

`prepare-heartbeat-branch.test.ts` and `premerge-flush-ref.test.ts` build real git repositories and
drive them with real `git` subprocesses. Run alone they are green (39/39 and 9/9). Run in the same
`bun test` invocation as their siblings, git subprocess contention pushes several past 5000 ms and
they fail at ~5.0 s with an **empty stderr** — `git fetch origin failed:` with nothing after the
colon. A timeout wearing the costume of a git error.

Causal proof: the identical three files with `--timeout 60000` produced **zero** of those failures,
leaving only the deterministic ones in §2.

It is also load-dependent, which is why it reads as flaky: 19 failures with a `dotnet` build running
alongside, 24 on another loaded run, 4 on a quieter one, 0 on an idle machine. Linux CI is fast
enough that it never fires there, so the flake only ever appears on a contributor's machine — where
it reads as `main` being broken.

`bunfig.toml` already states the rule and the remedy: bun does not implement `[test] timeout`, a
whole-run `--timeout` is deliberately not set in the gate, and *"a test that is slow BY NATURE
carries its own explicit timeout"*. One test in `prepare-heartbeat-branch.test.ts` already carried a
hand-written `30_000` — the fix is that precedent applied to all 48 of its siblings, via one named
constant so there is a single value to change.

## 2. A POSIX path assertion (2 of the 19)

`heartbeatPath` returns a LOCAL FILESYSTEM path — it is handed to `mkdirSync`/`writeFileSync` — so
native separators are the correct output. Two tests asserted the literal
`"/repo/docs/agent-heartbeats/..."`, which asserts the host OS rather than the function; on Windows
it produced `"\repo\docs\..."`. Composing the expectation with `join` keeps the real assertion (the
`YYYY/MM/DD` segments, the zero-padding, the hex filename) and drops the accidental one.

The sibling function `heartbeatRepoRelPath` builds the repo-relative GIT path and must stay
forward-slashed on every OS — it already has a test asserting exactly that, which is why the two are
separate functions and why only one of them may use `join`.

## 3. git `core.symlinks=false` (1 of the 2 .NET failures)

`ProvisionalExperienceReplayMatchesGoldenVectors` hashes a fixture tree containing two git symlinks
(mode `120000`). Git materialises those as real symlinks only when `core.symlinks` is true — on
Windows that needs Developer Mode or an elevated clone, and git sets it `false` otherwise. With it
false they arrive as **ordinary files whose content is the target path** (`../file1.txt`, `..`), so
`HashDirectory` classifies them `file` instead of `symlink` and hashes a different tree. Measured:
expected `081478c5…`, got `ec742172…`.

The golden vector is not wrong and must not be touched — it is the four-oracle treaty. What is wrong
is presenting an unrepresentable input as a byte-lock failure. Detected and skipped with the reason
named, via the `Assert.Skip` idiom already used in `Infra/CwdChaos.Tests.fs`.

## Reported, not fixed

- **`ZSet.add allocates only the output array`** — fails only in the full-suite run (384 bytes vs
  `< 200`), and passes 49/49 in isolation on three consecutive runs. Same shape as §1: passes alone,
  fails in company. The measurement is contaminated by the surrounding suite, most likely tiered-JIT
  re-compilation during the measured call. Not patched: it is a hot-path allocation assertion and a
  speculative fix would be worse than an accurate report.
- **The .NET suite dirties the working tree** — the cross-verification tests write
  `tests/cross-verification/*/{cs,fsharp}-output.json` into the repo, with CRLF on Windows. Three
  differ only by line ending (`.gitattributes` normalises on commit); `experience/cs-output.json`
  takes real content from the §3 hash. Worth a look, out of scope here.
