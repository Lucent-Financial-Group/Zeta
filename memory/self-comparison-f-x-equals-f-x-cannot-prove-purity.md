---
name: self-comparison-f-x-equals-f-x-cannot-prove-purity
description: A determinism test written as f(x) = f(x) passes for impure code, because two calls in one process capture the SAME ambient state
metadata:
  type: feedback
---

**The anti-pattern:** asserting `f(x) = f(x)` to claim purity, determinism, or "no hidden
clock."

**Why it cannot work.** Two calls in the same process, moments apart, capture the **same**
ambient value — the same clock tick, the same env var, the same cached read. The equality
holds **because of** the impurity, not despite it. The test passes precisely when it should
fail.

**Demonstrated, not argued** (2026-08-25). `FTA-5` in `FreeTimeAllocation.Tests.fs`
asserted `classify x = classify x` to claim no hidden clock. The source was mutated to
capture one:

```fsharp
Phase_ = phase   →   Phase_ = DateTime.UtcNow.Ticks
```

**All 31 tests passed, `FTA-5` included.** The agent had a defensible case for raising the
census allowance instead — the audit tool *invites* it (*"if it is correct, raise the count
… in the SAME commit"*) — and **tested the tempting case rather than arguing it.** That is
the move worth copying.

**The repair.** Assert each output field **against the argument it came from**, plus a
control that a *different* input changes the value. Then the clock-capturing mutant dies
deterministically.

**How to apply.**

1. `f(x) = f(x)` is only ever a **reflexivity** check. It proves the function returns
   something comparable. It proves nothing about purity, determinism, or ambient input.
2. To catch ambient capture the two observations must be **separated by the thing you
   suspect varies** — a different phase, a different seed, a different process, an injected
   source. Same-process back-to-back calls separate nothing.
3. A lint that flags self-comparison is right to; the fix is to **lower the claim**, never
   to raise the allowance. Raising it licenses the vacuity permanently.

**Open, and not mine to fix:** `DSL-37` in #15426 (merged) is the same shape. Its
*"M4 proves DSL-37 discriminates"* may hold for that specific mutation while still missing
a symmetric one. Worth re-checking on main.

Related: [[a-test-can-pass-because-an-EARLIER-guard-fired-only-mutation-finds-it]] · [[toy-is-free-metered-must-be-earned]] · [[zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero]]
