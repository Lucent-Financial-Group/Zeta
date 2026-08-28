# SpeculativeUpdate — CLEAN-ROOM SPECIFICATION

**Status:** specification only. **This document is the clean side of a
clean-room wall.** Read this, Albahari's published threading text, and
Zeta's own in-tree CAS cousin. Do not seek out, request, or read any
former-employer implementation of a similarly named helper. If you
believe you have already seen one, stop and say so rather than
proceeding.

**Provenance:** written by Ani (Grok Build, 2026-08-28). A prior
session in this lineage absorbed a paste offered as illustration and
is therefore **barred from implementing this**. Per
`.claude/rules/cleanroom-two-team-separation.md`, implementation must
be done by a **different named agent that has not seen that paste or
the original file**. Every requirement below is *what the system must
do*, derived from Zeta's own lock-free discipline and from **Joseph
Albahari's published** CAS-retry pattern — not from any other
system's structure.

**Beacon (allowed reading):**

- Joseph Albahari, *Threading in C#* —
  https://www.albahari.com/threading/ (PDF:
  https://www.albahari.info/threading/threading.pdf) — Interlocked /
  spin-wait / optimistic update
- Stephen Toub, .NET concurrency write-ups; David Fowler,
  `System.Threading.Channels`
- Standing rule: `memory/feedback_threading_human_lineage_albahari_toub_fowler_no_gut_instinct_aaron_2026_04_28.md`
- In-tree cousin (leave it; do not copy its retry cap):
  `src/Core/Transaction.fs` `updateCas` (1024 then `invalidOp`)

**Not Jumprope.** Jumprope "CAS" means **content-addressed storage**.
This spec is **hardware compare-and-swap**. Two operators, two names.
Do not fuse them.

---

## Names (Zeta's, not a transcription)

- `SpeculativeUpdate`
- `TrySpeculativeUpdate`

Own-your-interfaces: a small module/port. `Interlocked.CompareExchange`
and `SpinWait` are the impl, not a vendor type.

---

## Requirements

**R1. Pure update.** `update: 'T -> 'T` has no side effects. It **may
run more than once** (that is the whole point of "speculative"). A
test must fail if an impure update's extra run is invisible.

**R2. Snapshot → compute → CE.** Read the field. `next = update
snapshot`. `Interlocked.CompareExchange(&field, next, snapshot)`.
Success iff the CE result is the snapshot. Class types:
`obj.ReferenceEquals`. Primitive types: value equality of the CE
return.

**R3. Retry with `SpinWait`.** On failure, `SpinWait.SpinOnce` on an
**instance** (`let sw = SpinWait() in sw.SpinOnce()`), then retry.
Not a static call. Not `Thread.Sleep`. Not `Task.Delay`.

**R4. No arbitrary retry cap.** The environment decides. Do **not**
copy `Transaction.updateCas`'s `attempts > 1024` then `invalidOp`.
That cousin stays until someone migrates it in a separate, named
commit. This primitive spins until CE succeeds (or abort, R5).

**R5. Try-variant abort.** `TrySpeculativeUpdate` takes
`shouldAbort: 'T -> bool`. If `shouldAbort snapshot` is true, return
false and **do not write**. No `update` call required after abort
(calling it anyway must not be observable as a write).

**R6. Returns the landed value.** `SpeculativeUpdate` returns the
value that won the CE (the `next` that was stored), not the snapshot.

**R7. DST.** Uncontended path is replayable (one CE, no spin). A
contention test may be non-DST. Do not inject wall-clock into a
shared fold. `SpinWait` is local progress, not a shared-time filter.

**R8. No `Task.Run`.** This is a synchronous primitive. Async-over-sync
is a smell (`.claude/rules/async-all-the-way-truthful-signatures.md`).

**R9. Attribution.** Doc-comment and commit name Albahari (published)
and Toub/Fowler as the standing threading lineage. Do **not** attribute
the helper to a former employer. When this lands, retarget the
comment on `src/Core/DeterministicSyncContext.fs` that currently
names a former-employer method — same commit or an immediately
following one, not a later "someone should".

**R10. Tests that can fail.**

1. Uncontended: `update` runs once; field becomes `update(original)`.
2. `update` is invoked again on a forced CE miss (synthetic: two
   threads, or a test double); the extra invocation must be visible
   in a call count. Impure update is a test smell, not production
   API.
3. `TrySpeculativeUpdate` + `shouldAbort _ = true` leaves the field
   unchanged and returns false.
4. `shouldAbort _ = false` behaves as `SpeculativeUpdate`.
5. Integer field and reference field both work (CE equality differs).
6. `dotnet test` of the new tests, `-c Release`, 0 warnings.

---

## Out of scope

- Replacing `Transaction.updateCas` in the same PR (cousin; cap is a
  real behavioural difference — migrate with its own tests).
- Jumprope / content-addressed storage / ZetaId name→hash.
- Ferry `ProcessMany` / FourCorner (separate thread).
- Any former-employer file, gist, or paste.

## Acceptance

A reviewer who has never seen the original can check R1–R10 against
the diff and Albahari's public text only. If the diff is only
understandable by comparing it to a private file, the wall failed —
close the PR and re-branch with a different implementer.
