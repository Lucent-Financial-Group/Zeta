# Decision (PROPOSED): BP-29 — track falsifiers, not features

**Date:** 2026-08-20 · **Driver:** Aaron · **Status:** **proposed** (BP promotion is an
Architect decision per `docs/AGENT-BEST-PRACTICES.md`; this ADR is the proposal, not the
promotion) · **Class:** methodology

## Carved sentence (proposed BP-29)

> **Track falsifiers, not features.** A feature you cannot falsify is a claim, and a claim
> that cannot fail is worse than an absent feature — it *looks* like a guarantee and carries
> none. So the unit of progress is **the check that could have gone red**, and every positive
> assertion ships with a negative computed by the **same code path**.

## Why now

Aaron 2026-08-20, twice in one session:

> *"the biggest obstical to human AI trust is proper [un]implemented excetiopns of vacuious
> claims"*

> *"we should track falsfiers over features as a best practice diciplie and promte it"*

The first is the thesis: **the vacuity class is not an engineering-hygiene nit, it is the
principal obstacle to a human trusting an AI's output.** An unenforced exception, or an
assertion that cannot fail, is indistinguishable from a guarantee at reading distance and
distinguishable only by audit — which is exactly the cost trust is supposed to remove.

## The meter, because a discipline without one is vacuous by its own standard

Proposing "track falsifiers" with no way to count them would commit the error it names. So it
ships with a counter: `src/Core.TypeScript/hygiene/falsifier-density.ts`.

**Measured baseline, 2026-08-20, TypeScript suites:**

| quantity | value |
|---|---|
| test files with at least one test | **1107** |
| of those, **negative-bearing** (carry a refusal-shaped check) | **899** |
| **falsifier density** | **81.2%** |

So roughly **one test file in five carries no refusal-shaped check at all.** The counter emits
that list ordered by test count, so the work-list leads with the largest gaps.

## What the meter does and does not claim

- **Does:** count files containing a check *shaped* like a refusal — an expected throw or
  rejection, an assertion of `false`/`not`, or a test **name** drawn from refusal vocabulary.
  The count is exact and reproducible.
- **Does NOT:** establish that any assertion is *actually* falsifiable. `expect(true).not.toBe(false)`
  is negative-shaped and can never fail, and this meter counts it. That limit is **pinned as a
  test** so it cannot be quietly forgotten.
- The strictly stronger check already exists and is expensive: `mutation-runner.ts` — a test
  that survives mutation is not a falsifier however it is spelled. **Read density as the cheap
  wide screen and mutation as the narrow proof.** Register: **UNMETERED** — the count is exact;
  the claim that it tracks falsifiability is an unvalidated proxy.

## What this does NOT propose

- **No gate, no threshold, no CI failure.** A ratcheted minimum would immediately be gamed by
  adding `.not.` to assertions, which would *lower* real falsifiability while raising the
  number — Aaron's own leaderboard-gaming instinct applied to this metric. Measure first,
  decide later, and only after the proxy has been validated against mutation results.
- **No retroactive sweep** of the barren files. The list is a work-list, not a debt.

## Where it belongs (the "best division" question Aaron raised)

| surface | carries |
|---|---|
| `docs/AGENT-BEST-PRACTICES.md` **BP-29** | the operational rule agents cite in review |
| `docs/VISION.md` | the *why* — falsifiers are how a claim becomes trustable without an audit |
| `falsifier-density.ts` | the number, so the discipline is not itself a vacuous claim |
| `mutation-runner.ts` | the strong check the density proxy defers to |

Hub/satellite per `dv2-data-split-discipline-activated`: the carved sentence is the hub; the
measurement and its limits are the satellite.

## Pointers

- `.claude/rules/toy-is-free-metered-must-be-earned.md` — the register this operationalizes
- `src/Core.TypeScript/hygiene/mutation-runner.ts` — the mechanical falsifier check
- `docs/PROVEN-COVERAGE-AND-GAPS.md` — the existing coverage audit this composes with
- `memory/feedback_vacuous_claims_and_unimplemented_exceptions_are_the_biggest_obstacle_to_human_ai_trust_aaron.md` (**not in-repo**) — the origin
