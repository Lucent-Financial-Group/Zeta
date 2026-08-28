# CLEAN-SIDE HANDOFF — Albahari SpeculativeUpdate

**For:** whichever agent Aaron routes this to (a **fresh** named
implementer). One agent is enough; n-version is optional.
**From:** Ani (Grok Build) — **contaminated side, barred from
implementing this.**
**Date:** 2026-08-28
**Workitem pointer:** `workitems/081M125DNKK087G0R00292E3ET` (CAS
paragraph) · ROADMAP P1 hardware-CAS line ·
`docs/PRIMITIVE-REGISTRY.md` concurrency/lock-free row (read the
*functional* requirements; ignore any former-employer method names
as implementation hints)

---

## READ THIS FIRST — you are the CLEAN SIDE of a clean-room wall

This is a **compliance boundary**, not a style preference.

A Grok session in this lineage absorbed a paste of a former
employer's helper, offered as illustration, and was told it is
**not** that employer's IP. Paste is still *expression*. That
session (Riven absorb, then Ani) **must not implement**. You have
not seen that material, and **you must not go looking for it**:

- **Do NOT** search, open, or read former-employer trees, Downloads
  drops, or files named `ExtensibilityExtensions`,
  `AsyncCollection`, or `TrySpeculativeUpdate` **in someone else's
  tree**.
- **Do NOT** ask Ani, Riven, or Otto "how did the original do it."
- **Do NOT** treat "make it N% different" as a plan. Design from
  the requirements.
- **If you believe you have already seen** that implementation,
  **STOP and say so.** That is a valid outcome — it means Aaron
  routes to a different implementer.

Governing rule: `.claude/rules/cleanroom-two-team-separation.md`.

Independent derivation is the entire protection.

## Your only functional input

**[`docs/specs/albahari-speculative-update-cleanroom-spec.md`](../specs/albahari-speculative-update-cleanroom-spec.md)**

R1–R10. Implement from those plus Albahari's **published**
threading text. The spec was written to carry requirements, never
expression.

## Zeta context you SHOULD read (our own work)

| File | Why |
|---|---|
| `src/Core/Transaction.fs` `updateCas` | Cousin: same CE shape, **1024 cap then invalidOp**. Do not copy the cap. Do not migrate it in the first PR unless the tests already pin the cap. |
| `src/Core/DeterministicSyncContext.fs` | Comment currently names a former-employer method. R9: retarget to Albahari/Toub when the helper lands. |
| `.claude/rules/async-all-the-way-truthful-signatures.md` | No `Task.Run`; this helper is synchronous. |
| `.claude/rules/dv2-data-split-discipline-activated.md` #2 lock/wait-free, #6 idempotency | `update` purity is idempotency at CAS-retry scope. |
| `memory/feedback_threading_human_lineage_albahari_toub_fowler_no_gut_instinct_aaron_2026_04_28.md` | Standing threading lineage. Cross-check Albahari against current MS Learn where they diverge. |

## Environment

- Work in **your own clone**, not the shared checkout
  (`GOVERNANCE.md` §35).
- Branch from `origin/main`.
- F#: `dotnet build -c Release` → 0 warnings / 0 errors.
- AgencySignature as yourself. `Co-Authored-By` for your harness.
- Do not force-push.

## Smallest slice

1. `SpeculativeUpdate` + uncontended test + purity-visible-on-retry
   test (R1, R2, R6, R10.1–2).
2. `TrySpeculativeUpdate` abort (R5, R10.3–4).
3. R9 comment retarget on `DeterministicSyncContext.fs`.
4. Leave `Transaction.updateCas` cap for a follow-up.

## What this is not

Not Jumprope. Not a ferry change. Not Itron IP — **and also not
Itron source**. Aaron 2026-08-27: canonical hardware CAS is
Albahari's, attributed to him and his books.
