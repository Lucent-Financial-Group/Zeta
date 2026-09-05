---
id: 081M0QRPN05087G0R00047WBC4
type: task
state: done
priority: P2
slug: arc-rung-f-calibration-falsifier-for-the-pre-commitment-disp
title: "ARC rung F - calibration falsifier for the pre-commitment display: does the action taken match the mass shown, at the rate it claims"
created: 2026-08-23T16:54:15.301Z
completed: 2026-09-04T20:11:00.000Z
depends_on: ["081M0QRPMZ5087G0R000D33Q8M"]
composes_with: []
---

# ARC rung F - calibration falsifier for the pre-commitment display: does the action taken match the mass shown, at the rate it claims

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0QRPN05087G0R00047WBC4-*.md` glob. -->

**Register: `toy` — and this rung is what would let it shed the register.** Design:
`docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` §8.

The claim under test: _a pre-commitment display — the full distribution rendered BEFORE the commit,
beside the commit, and beside the "refused to snap" outcome — is an alignment readout, because it
shows what the agent is about to do while it is still revisable, rather than explaining afterwards
what it did._

Post-hoc explanation is unfalsifiable at the moment it matters. A pre-commitment display is
checkable — so check it: record `(displayed distribution, chosen action)` pairs and test
**calibration**. Does the action taken match the mass displayed, at the rate the mass claims?

**A display not calibrated to the commit is decoration wearing an alignment badge.** Until this test
exists and can fail, the claim stays `toy`, and per the Lior handoff §B0 an uncalibrated display on
the most visible surface we have is the vacuity class in the worst possible place.

Note `SoftValue.snap : SnapPolicy -> SoftValue -> DynamicValue option` — `None` (refused to snap) is
a first-class outcome and must be in the calibration data, not filtered out of it.

## Resolution

The falsifier now records 20 real `ClickPolicy.decide` outcomes from the source-owned ACTION6
environment: 10 commits and 10 confidence-gated refusals. Refusals remain rows in the corpus and
count as observed zero for the selected-coordinate event.

Python and TypeScript independently compute a binary Brier score and ten-bin expected calibration
error from the same source-owned artifact. The browser refuses a declared report that does not
match its own recomputation and displays the measured verdict beside the replay. The verdict also
requires every confidence-gate cohort to clear tolerance, so opposite errors cannot cancel in the
aggregate.

The current deterministic object-centroid policy measures:

- selected mass: `0.333333333333`
- observed selected-coordinate commit rate: `0.5`
- Brier score: `0.277777777778`
- expected calibration error: `0.166666666667`
- maximum confidence-gate calibration error: `0.666666666667`
- verdict at tolerance `0.05`: `uncalibrated`

Therefore this work item is complete as a falsification instrument, but the alignment claim remains
in the `toy` register. The policy was not changed to make the meter pass.

## Verification

- ARC Python suite: 149 passed.
- Browser calibration and replay tests: 15 passed.
- Calibrated control passes; all-commit, lying-verdict, and tolerance-inflation mutants fail.
- Python-generated artifact is byte-identical to the checked-in corpus.
- TypeScript independently reproduces every declared metric and rejects a favorable lying verdict.
- Production Vite build passes.
- Playwright desktop and mobile checks: no page errors, external requests, or horizontal overflow.
