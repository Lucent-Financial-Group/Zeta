---
name: a-test-can-pass-because-an-EARLIER-guard-fired-only-mutation-finds-it
description: Twice in two days, the falsifier for a guard passed because a DIFFERENT guard short-circuited first — the test never reached the code it existed to test
metadata:
  type: feedback
---

**The class:** a test's *setup* accidentally satisfies an earlier guard's precondition, so
execution short-circuits before reaching the behaviour under test. The test **passes**, it
**looks correct**, and it **constrains nothing**.

Two independent instances on 2026-08-25, both caught by mutation and neither by review:

- **PR #15426** — mutant `M9` (stance penalty) survived `DSL-24`, the test whose entire
  purpose was the *"eager is not a discount"* falsifier. Its corroborations came from **one
  source**, so `RequiresIndependentConfirmation` was already `true` for both parties and the
  penalty was masked. A different test killed M9 **by accident**.
- **The free-time ledger** — mutant `M9` survived `FTA-25`, again the test built to be that
  guard's falsifier. `FTA-25` used **three** records; with three, *both halves of the
  history are too short to form an adjacent pair*, so a **secondary** guard (`pairsW = 0`)
  returned `InsufficientHistory` **regardless of whether the history floor existed**. Fixed
  by using **five** records — the smallest count below the floor where both halves *do*
  form pairs.

**Why only mutation finds it.** Review sees a well-named test with a sensible assertion,
passing. Coverage sees the line executed — by the *other* guard's path. Only breaking the
code the test claims to protect reveals that the test does not notice. This is
[[toy-is-free-metered-must-be-earned]]'s point applied to a *test*: a falsifier that cannot
fail is not a falsifier, and it takes an experiment to tell which one you have.

**How to apply.**

1. **Every guard's falsifier needs a mutant.** Not a nice-to-have — the two instances above
   were both the single most important test in their module and both were vacuous.
2. **When a mutant survives, suspect the TEST before the code.** In both cases the
   implementation was right and the test could not see it.
3. **Design the fixture at the boundary that isolates ONE guard.** The `FTA-25` fix is the
   template: pick the smallest input where *every other* precondition is satisfied so the
   guard under test is the only thing that can refuse. Ask, of every fixture: *which guard
   actually fires here?*
4. **A mutation run reporting `0/N killed` is more likely a broken harness than a
   catastrophe.** The same agent hit two of those — a broken output parser, then `mise` not
   active in the launch directory (`rc=155`). Verify the baseline is green **from the same
   directory** before believing a zero.

Related: [[zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero]] · [[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] · [[verify-the-tree-not-just-the-command]]
