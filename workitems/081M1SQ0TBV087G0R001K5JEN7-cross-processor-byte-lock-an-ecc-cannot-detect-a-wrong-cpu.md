---
id: 081M1SQ0TBV087G0R001K5JEN7
type: task
state: backlog
priority: P2
slug: cross-processor-byte-lock-an-ecc-cannot-detect-a-wrong-cpu
title: "Cross-processor byte-lock: an ECC cannot detect a wrong CPU"
created: 2026-09-05T21:19:02.011Z
depends_on: []
composes_with: []
---

# Cross-processor byte-lock: an ECC cannot detect a wrong CPU

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1SQ0TBV087G0R001K5JEN7-*.md` glob. -->

## The gap

The byte-lock ran on ONE runner (`runs-on: ubuntu-24.04`, no matrix), so it proved nine
implementations agree with a committed trajectory and could say nothing about the MACHINE:

> **An error-correcting code cannot detect a wrong processor.** If the CPU miscomputes, it computes
> the CHECK wrong too — consistently, and in agreement with itself. The check and the thing checked
> share the fault.

Mercurial cores miscompute specific inputs while passing every self-test (Hochschild et al.,
*Cores That Don't Count*, HotOS 2021). Both ingredients for catching that already existed and were
never connected: `bytelock` had the implementations and one runner; `build-and-test` had five
machines and no cross-leg comparison (`upload-artifact` appeared **0 times** in `gate.yml`).

## What was done

Three-leg matrix (`ubuntu-24.04`, `ubuntu-24.04-arm`, `macos-26`), per-leg artifacts,
`fail-fast: false`, and a `cross-processor` job comparing every leg's per-(substrate, seed) verdict.
Source, input and expectation are held fixed, so the only free variable across legs is the machine.

## Measured

| run | result |
|---|---|
| 33991852357 | ubuntu 9, arm 9, macOS **8** (`Lua 5.4` absent) — **36 shared pairs, 0 disagreements** |
| 33992105626 | macOS **9** after installing `lua@5.4` specifically |
| 33992322561 | all three at 9, floors raised to 9/9/9, green |

Also surfaced: **`Go` executed on all three legs and was not in the required-substrate list**, whose
own note said to add it "in the same change that builds it" — the build landed, the list never
followed.

## Honest limit

A clean run does not prove the CPUs are sound; mercurial-core faults are input-specific and
intermittent, which is why they evade self-tests. What this establishes is that the instrument
exists and reports a COUNT of comparisons made, and that it REFUSES rather than passing when that
count would be zero. It also cannot catch a fault common to every leg — Knight & Leveson (1986).
