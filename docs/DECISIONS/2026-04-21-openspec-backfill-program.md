# ADR 2026-04-21: OpenSpec backfill program

**Status:** Adopted
**Decision date:** 2026-04-21
**Deciders:** Architect (Kenji) with human maintainer sign-off.
**Triggered by:** Aaron 2026-04-20 — *"opensepcs, if I deleted
all the code right now how easy to recreate based on the
openspecs"*.

## Context

`openspec/README.md` declares a disaster-recovery contract:
*"if code was hard-deleted from the repository and from git
history... a contributor should be able to rebuild the current
behaviour from these specs alone, at the same quality bar."*

The Round 41 opener inventory at
`docs/research/openspec-coverage-audit-2026-04-21.md`
measured actual coverage:

- **4 capabilities / 783 lines of spec.md** (durability-modes,
  operator-algebra, repo-automation, retraction-safe-recursion)
- versus **66 top-level F# modules / 10,839 lines** under
  `src/Core/`
- Coverage: **~6% by capability count, ~7% by line ratio.**

The contract is currently not satisfied. Band 1 (ZSet, Circuit,
NestedCircuit, Spine family) is completely uncovered;
`BloomFilter.fs` was flipped to Adopt on TECH-RADAR in
Round 40 without a matching spec contract, which is a
backwards-compatibility hazard for external consumers.

## Decision

Adopt a **one-capability-per-round baseline** backfill cadence
with the following rules.

### Cadence rules

1. **One capability per round baseline.** Every round that is
   not paper-grade ships at least one OpenSpec capability —
   either a *new* capability (Band 2 / Band 3) or an
   *extension pass* on an existing capability (Band 1
   modules added to `operator-algebra`, etc.).
2. **Two capabilities allowed on small rounds.** Where two
   capabilities together fit inside a round's normal capacity
   (short modules, co-dependent families), bundle them.
3. **Paper-grade rounds earn half-credit.** A round spent on a
   Lean Mathlib landing, a TLA+ spec, or the Stainback
   conjecture proof may ship zero OpenSpec capabilities and
   still close. No more than **one paper-grade round per
   three rounds** to prevent cadence stall.
4. **Band 1 takes priority.** Until all 8 Band 1 modules are
   spec-covered, every new-capability round must draw from
   Band 1 unless the `Adopt` tech-radar check below forces a
   cross-band pull.
5. **Adopt-row priority escalation.** Any module on TECH-RADAR
   at **Adopt** status without a spec capability is an implicit
   backwards-compatibility hazard. Round 44's priority slot is
   reserved for `BloomFilter.fs` for this reason.

### Per-capability success signal

After each capability lands, Viktor (spec-zealot) runs an
adversarial audit: *"if `src/Core/<module>.fs` were deleted
today, could I rebuild this module from this spec alone, at the
factory's quality bar?"*

- **Yes** → capability ships; round counts as full credit for
  cadence purposes.
- **No** → capability re-opens; round counts as **half-credit**
  until the audit passes. The capability is not considered
  shipped for disaster-recovery coverage metrics.

### Round-close ledger

`docs/ROUND-HISTORY.md` round entries gain a new required line:

```text
OpenSpec cadence: <+N capabilities> | total <M> / backfill
remaining: <L Band 1 + K Band 2 + J Band 3>
```

When `L = 0`, Band 1 is complete and the cadence escalation
(Band 2 → Band 3) begins.

### Named exceptions

- `AssemblyInfo.fs` — build metadata, deliberately uncovered.
- `repo-automation` — intentionally covers no `src/Core/`
  module; it specifies the repo's meta-behaviour. This is not a
  gap.
- Band 3 MEDIUM modules that naturally collapse into fewer
  larger capabilities get merged at the round-opener stage
  when their round arrives — the 45-module Band 3 list is a
  banding, not a prescribed capability-count target.

## Consequences

**Positive.**

- Disaster-recovery contract moves from aspiration (6% today)
  to mechanical monotone-increasing coverage (one capability
  per round).
- The first six rounds' sequence is pre-declared (see
  `docs/research/openspec-coverage-audit-2026-04-21.md`
  Part D), removing per-round prioritisation overhead.
- Viktor's adversarial audit becomes the gate on shipping,
  which matches the role's stated charter
  (`docs/CONFLICT-RESOLUTION.md`).
- TECH-RADAR Adopt rows gain a mechanical coupling to spec
  coverage, preventing shipped-without-contract regressions.

**Negative.**

- Every non-paper round now carries a spec-write tax of
  ~200 lines of spec.md (scaling from the existing 783/4 =
  196 lines-per-capability average).
- Band 3 MEDIUM's 45-module list is not a natural
  capability count; a merging pass will be needed around
  Round 47, adding a re-planning round.
- The `BloomFilter.fs` Adopt-row priority escalation pushes
  Round 44's slot off the Band 1 sequence, delaying Band 1
  completion to Round 45 instead of Round 43.

**Neutral / to revisit.**

- The *one capability per round baseline* is a starting
  hypothesis, not a measured rate. First 6 rounds may reveal
  it is too ambitious or too slow. Revisit at Round 47
  retrospective.

## Alternatives considered

### Alternative A — big-bang backfill round

Spend a single multi-week round writing all 20 Band 1 +
Band 2 capabilities at once.

*Rejected.* This violates the factory's ontology-landing
cadence principle (`.claude/skills/paced-ontology-landing/`)
and over-commits the reviewer bandwidth (Viktor plus
public-API-designer Ilyana plus threat-model-critic Aminata
cannot review 20 capabilities in one round at any reasonable
quality bar).

### Alternative B — spec-per-module instead of spec-per-capability

Treat each `src/Core/*.fs` module as its own capability.

*Rejected.* Co-dependent modules (the Spine family, the CRDT
pair, the SIMD pair) need joint specs to express
cross-module invariants. Per-module specs would triple the
total line count with no semantic gain.

### Alternative C — no cadence declaration, let rounds pull organically

Leave backfill as best-effort; rely on per-round prioritisation.

*Rejected.* The last 40 rounds are evidence that organic
prioritisation drifts away from spec backfill (coverage
declined in relative terms as `src/Core/` grew without matching
spec expansion). A declared cadence is the retraction mechanism
against that drift.

## Related

- `openspec/README.md` — disaster-recovery contract.
- `docs/research/openspec-coverage-audit-2026-04-21.md` — the
  inventory this ADR is acting on.
- `docs/BACKLOG.md` §P0 — "OpenSpec coverage backfill" entry.
  Closes with this ADR.
- `docs/ROUND-HISTORY.md` — round-close ledger format gains
  the OpenSpec cadence line.
