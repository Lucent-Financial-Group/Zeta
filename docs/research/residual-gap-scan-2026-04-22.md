# Residual-gap scan — 2026-04-22 (round 44, first pass)

**Status:** first execution of the BACKLOG row
"Residual-gap scan across factory-state docs (round 44
crystallization-loop follow-up)" (commit 4af49cc / 4892dbc).
Produced by the cartographer loop after `docs/research/
crystallization-ledger.md` turns 1-4 converged on the
body-ahead-of-map pattern.

## Purpose

Validate (or falsify) the body-ahead-of-map residual-gap
pattern observed across crystallization turns 1-4. Measure
how much drift sits in the factory-state docs right now —
and establish the precision-calibration baseline for
re-runs on cadence (5-10 rounds).

## Scope

Five factory-state docs:

- `docs/VISION.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/WONT-DO.md`
- `docs/TECH-RADAR.md`

Cross-referenced against:

- `docs/DECISIONS/*.md` (the ADR tree — 9 ADRs as of
  2026-04-22).
- Design-doc tree (`docs/research/**`, `docs/security/**`,
  other resolved-decision artefacts referenced by the
  scanned docs).

## Method

Two grep passes over the five files:

### Pass 1 — primary pending-reference phrases

Pattern: `research[- ]pending | TBD | to be decided | TODO
| shape open | far-future | far future | pending research
| decision pending`

### Pass 2 — secondary indeterminacy phrases

Pattern: `to be determined | decision needed | undecided |
open question | to be resolved | not yet decided | being
researched | under consideration | needs decision | needs
research | awaiting decision | not decided | no decision |
decision deferred | unresolved | unknown | still debating`

Each hit was then cross-checked against the ADR tree and
design-doc references to classify as **stale** (decision
exists elsewhere but the map hasn't caught up =
body-ahead-of-map drift) or **genuine** (no resolving
decision exists; the indeterminacy is honest).

## Results

### Per-file tally

| File | Pass 1 hits | Pass 2 hits | Classified stale | Classified genuine |
|---|---|---|---|---|
| VISION.md | 4 | 2 | **0** (all swept in turn 4) | 6 |
| ROADMAP.md | 0 | 0 | 0 | 0 |
| ARCHITECTURE.md | 0 | 0 | 0 | 0 |
| WONT-DO.md | 0 | 0 | 0 | 0 |
| TECH-RADAR.md | 0 | 0 | 0 | 0 |

### VISION.md hits — all genuine (classified)

1. **Line 722** — "Factory UI (far future — agents + human
   today)" in §Post-v1 factory work.
   - **ADR cross-check:** no factory-UI ADR in
     `docs/DECISIONS/`.
   - **Classification:** genuine indeterminacy. Not stale.
2. **Lines 915 / 918 / 929** — "far-future" / "decision
   deferred to" phrasing in §First-pass confidence + gaps
   appendix, all part of the Turn 2 resolved-gap-log text
   describing *why* the admin-UI tech-pick was deferred.
   - **ADR cross-check:** no admin-UI tech-pick ADR.
   - **Classification:** genuine indeterminacy (reading
     the text). Not stale.
3. **Line 847** — "commercial is on the table but undecided"
   in §Direction decisions from round 33.
   - **ADR cross-check:** no commercial-model ADR.
   - **Classification:** genuine direction-level
     indeterminacy (Aaron's call to make, not an agent's).
     Not stale.
4. **Line 909** — "decision deferred to" in Turn 2's
   resolved-gap-log explanatory text.
   - **Classification:** not a pending-reference phrase
     per se — it's explanation text *about* a resolved
     deferral. False positive for the scan; genuine
     content for the doc.

Zero stale / body-ahead-of-map drift cases in the scanned
surface.

## Finding

**Factory-state doc hygiene is excellent at this moment.**
The only body-ahead-of-map drift case the crystallization
loop had to close (multi-node control plane TBD, lines
355-357 + 459-462 of VISION.md) was swept in turn 4
(commit 4af49cc). Remaining `far-future` / `undecided`
phrases are all either:

- **genuine direction-level indeterminacy** that Aaron
  (not an agent) needs to resolve (line 847 commercial
  posture; line 722 factory UI timing), or
- **resolved-gap-log explanation text** that correctly
  describes *why* a decision was deferred (lines
  915/918/929 from the Turn 2 admin-UI resolution).

Per the BACKLOG row's acceptance criterion (b) — *"at
least one new body-ahead-of-map drift case is found (if
zero found, the scan's precision calibration becomes the
finding — also valuable)"* — the zero finding is the
valuable finding.

## Interpretation

Two readings, both consistent:

1. **The crystallization loop is working as intended.**
   Turn 4 swept the only outstanding drift; the scan
   confirms no new drift has accreted. The loop is
   acting as a doc-hygiene servo: when new decisions land
   (ADRs, ROADMAP edits, ARCHITECTURE updates), the map
   (VISION) catches up within one-two rounds of
   crystallization work.

2. **The scan is not yet a high-signal early-warning
   tool.** With zero hits, it cannot yet distinguish
   between "no drift because the loop is working" and
   "no drift because decisions haven't been landing fast
   enough to generate drift." The latter is possible
   (round 44 has focused on factory hygiene + meta-
   patterns, not on new product decisions). Re-runs on
   cadence (5-10 rounds) will calibrate the signal as
   decisions accrete.

## Candidate scan-refinement ideas (not filed)

Noting for future consideration without filing (per the
two-turn-evidence rule):

- **Widen the scope** to include `docs/BACKLOG.md`
  (body-ahead-of-map can happen there too — a row with
  "scope TBD" after a resolving ADR is the same drift
  pattern).
- **Widen the phrase list** to catch hedged
  statements like "we may", "possibly", "likely",
  "probably" — but with much higher false-positive rate.
  Needs calibration first.
- **Distinguish pending-phrases from description-of-
  deferred phrases** — the Turn-2 resolved-gap-log text
  matched the grep but is NOT a drift candidate. Future
  scans should either exclude the resolved-gap-log
  section or teach the grep to skip explanation text.
- **Auto-cross-check against ADR headers** rather than
  manual — would make the scan fully automatable but
  requires richer ADR metadata (e.g., "this ADR resolves
  topic X").

None of these are filed to BACKLOG this round. If the
next scan (round ~49) finds the same zero / near-zero
hit rate, promote one or more refinements then.

## Cadence

Per the BACKLOG row's acceptance criterion (c), re-run
every 5-10 rounds as part of the hygiene-class cadence.
Next scheduled run: approximately round 49-54. File the
report at `docs/research/residual-gap-scan-<date>.md`
with the same shape; compare hit counts against this
baseline (round 44 = 0 stale / 6 genuine across the
five-file scope).

## Related

- `docs/BACKLOG.md` — the row this scan executes
  (residual-gap scan across factory-state docs).
- `docs/research/crystallization-ledger.md` — turns 1-4
  that established the body-ahead-of-map pattern.
- `docs/research/crystallization-loop.md` — the
  cartographer-loop design doc.
- `memory/feedback_crystallize_everything_lossless_compression_except_memory.md`
  — the crystallize-everything policy this scan serves.
- `memory/feedback_imperfect_enforcement_hygiene_as_tracked_class.md`
  — sibling meta-audit; the residual-gap scan is itself a
  non-exhaustive hygiene instrument (sample-based on
  cadence), and would appear in FACTORY-HYGIENE.md's
  non-exhaustive table if adopted as a standing rule.
