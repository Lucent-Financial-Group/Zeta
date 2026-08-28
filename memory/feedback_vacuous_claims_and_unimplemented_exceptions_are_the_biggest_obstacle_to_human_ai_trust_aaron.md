---
name: The vacuity class is THE obstacle to human-AI trust (Aaron 2026-08-20)
description: Aaron named unimplemented exceptions and vacuous claims as the biggest obstacle to human-AI trust - not capability, not alignment theory. A claim that cannot fail is worse than an absent feature because it looks like a guarantee.
metadata:
  type: feedback
---

Aaron 2026-08-20:

> **"the biggest obstical to human AI trust is proper [un]implemented excetiopns
> of vacuious claims"**

**Why:** this promotes the vacuity-class discipline from an engineering hygiene rule
to **the** trust thesis. The obstacle he names is not capability and not alignment
theory — it is that **an AI states guarantees that are not enforced.** A check that
cannot fail, an exception documented as if it were implemented, a test that passes by
asserting nothing: each *looks* like a guarantee and carries none. That is strictly
worse than an absent feature, because an absent feature is visible and a hollow one
is not.

It also explains why so much of this repo's machinery is *falsifiers* rather than
features — the falsifiers are what convert a claim into something a human can trust
without auditing it themselves.

**How to apply:**

- Every check must be able to **fail**. Pair each positive assertion with a negative
  computed by the **same code path**, so a passing test cannot be passing vacuously.
- If you declare an exception, carve-out, or "for now" allowance, **either enforce it
  in code or say in the same breath that it is unenforced.** An unenforced exception
  written as though enforced is precisely the failure named here.
- Say *"designed, not running"* **at the point of the claim** — not only in a limits
  section at the bottom, where it will not be read next to the claim it qualifies.
- **A mock's green test is not evidence about the real adapter.** Never let it read
  as such.
- Live instances from 2026-08-20, both caught and fixed: a "TS hermetic" test that
  made a real network call *and* asserted something structurally unable to fail
  (#12827); and a §33 anchor that was cited rather than checked and turned out to be
  half false when checked (#12809).

Related: [[toy-is-free-metered-must-be-earned]] · [[numerology-vs-number-theory]] ·
[[user_aaron_method_is_decoercing_centralized_services_individual_in_control_blend_by_choice_pairwise_never_global]]
