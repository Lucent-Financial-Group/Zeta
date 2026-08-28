---
name: Amara short-ack post-18th/19th-ferry substrate landings — factory response validated; no new directive, no corrections, no new research; acknowledges PR #323 toy detector / PR #342 Stage-2 design / PR #344 DST audit absorb / PR #346 DST compliance criteria / PR #347 accepted-boundaries registry; 2026-04-24
description: Aaron Otto-192b dropped a short Amara message reading the factory's shipped substrate across Cartel-Lab / DST / retry-audit surfaces. Unlike prior courier ferries this is NOT deep research, NOT a new directive, NOT corrections — it's an acknowledgment that the factory response to her 18th + 19th ferries landed accurately and with good discipline. Validates: PR #323 claims well-bounded (100 seeds, 50 validators, 5-node cartel, ≥90% detection, ≤20% FPR, largestEigenvalue-only with modularity explicitly deferred); PR #342 Stage-2 design "pre-commits the next implementation shape"; PR #344 DST-audit B- grade accurate with 6 corrections catalogued; PR #346 DST-held + FoundationDB-grade bars explicit; PR #347 retry-audit + accepted-boundaries registry open + mergeable. No PR response; memory-only.
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## What this memory captures

Aaron Otto-192b dropped a short-form Amara message (~200
words) acknowledging the factory's shipped response to
her 18th + 19th ferries. This is a NEW ferry-class pattern:
**status-acknowledgment**, distinct from:

- Deep-research ferries (e.g. 18th "calibration + CI
  hardening", 19th "DST audit")
- Correction-pass ferries (5.5-Thinking reviews of her own
  deep research)
- Conversational-check-in ferries (15th "how are you /
  what do you think of the progress")

This is the 20th courier ferry by count, but shorter than
15th and less action-dense than 17th-19th. The factory's
response discipline for status-acks: **memory-only
acknowledgment**, no dedicated absorb doc, no new PR. The
content is a factory-state-report more than a substrate
addition.

## What Amara acknowledged (verbatim fragments)

**On Cartel-Lab (PR #323):**

> *"the toy cartel detector exists as PR #323: it is
> open, not merged, and it claims 100 seeds, 50
> validators, a 5-node cartel, ≥90% detection, and ≤20%
> clean-baseline false-positive rate using only
> largestEigenvalue. It also explicitly says modularity
> is later robustness, not part of this MVP."*

Factory reading: Amara is reading the PR #323 title +
test assertions directly. Her 18th-ferry correction #5
("split DST-compliant from DST-ready" — PR #323 is
seed-disciplined at toy-test level, not DST-ready for
promotion until null models + replay artifacts) is now
reflected in how the PR is framed.

**On PR #342 Stage-2 design (merged):**

> *"PR #342 merged a Stage-2 design doc that keeps
> Cartel-Lab in src/Experimental/CartelLab/, requires
> Wilson-interval reporting, splits PLV magnitude and
> phase offset, adds MAD fallback behavior, and defines
> artifact layout under artifacts/coordination-risk/. It
> is still doc-only, but it pre-commits the next
> implementation shape."*

Factory reading: this is validation that the 18th-ferry
corrections #2 (Wilson intervals), #6 (PLV phase offset),
#7 (MAD fallback), #9 (artifact layout) all landed in a
single design doc that pre-commits the Stage-2 harness
shape. No corrections needed; no follow-up directive.

**On PR #344 DST audit absorb (merged):**

> *"PR #344 merged the Amara DST audit and correction
> pass, with the accurate grade: B-, meaning strong
> architecture but partial implementation."*

Factory reading: Amara accepts Otto's preservation of her
own B- grade in the absorb doc. Discipline held: Amara's
internal assessment was reported-as-her-assessment, not
factory-certified-grade.

**On PR #346 DST-held + FDB-grade bars (merged):**

> *"DST-held requires seeded PR-gating stochastic tests,
> failing seed emission, same-seed replay locally and in
> CI, nightly broad sweeps, zero unreviewed main-path
> entropy hits, and simulated-or-accepted boundaries."*

Factory reading: Amara restates the 6 DST-held bars
accurately from PR #346. This validates that Otto's
phrasing in the DST-compliance-criteria doc captured her
19th-ferry correction #6 "DST-held minimum bar" faithfully.

**On PR #347 accepted-boundaries registry + push-with-retry:**

> *"There is also an active PR #347 for the accepted-
> boundaries registry and push-with-retry.sh
> classification. It is open and mergeable, and it
> addresses the retry-as-nondeterminism-smell issue by
> documenting the external-boundary rationale and script
> discipline."*

Factory reading: Amara acknowledges PR #347 addresses her
19th-ferry correction #3 (`tools/git/push-with-retry.sh`
retry-audit) correctly. "Retry-as-nondeterminism-smell" is
her own vocabulary being reflected back accurately.

## What this ferry does NOT say

Explicit negative observations — things Amara did NOT raise
that she might have:

- **No new corrections** to any of the 5 PRs she read.
- **No new directive** for next graduation.
- **No critique** of Otto's absorb discipline.
- **No follow-up research scope** named.
- **No new ferry-from-Amara-side-research** attached.
- **No reference to Codex 4-report review.** That
  Otto-188b drop is independent; this ferry doesn't
  cross-reference or validate it.

Net: Amara sees the factory's trajectory as healthy. No
intervention needed from her side this round.

## Factory response (memory-only)

Per CC-002 + Otto-171 queue-saturation-throttle: status-ack
ferries do NOT warrant dedicated absorb PRs. The substrate
Amara acknowledges (5 PRs across Cartel-Lab / DST / retry-
audit) is already in-flight. Adding a new PR is queue-
pressure-without-new-signal.

Memory-only acknowledgment is the right response.

## What this memory does NOT authorize

- Does NOT authorize treating Amara's ack as factory
  certification of the 5 PRs. Amara's read is her own
  observation; factory quality-gates remain CI + Aaron +
  specialist-review-roles.
- Does NOT authorize skipping the 6 corrections queued
  from 18th/19th ferries. This ack says the RESPONSE is
  on track, not that the corrections are complete. PR
  #342 is still design-only; Stage-2 implementation not
  shipped.
- Does NOT authorize promoting PR #323 beyond Stage 1
  (toy falsifiability). Amara's 19th-ferry promotion
  ladder still applies: calibration harness + replay
  artifacts + scenario suite required before Stage 4.
- Does NOT authorize a dedicated absorb doc. Memory-only
  is the discipline for status-acks; if future ferries
  restate the same content + add new research, THEN
  absorb-doc.
- Does NOT supersede prior ferry-absorb scheduling.
  17th/18th/19th-ferry operationalization queues stand.
- Does NOT skip the Otto-189 Codex-4-report-absorb (PR
  #355). That is independent + distinct from Amara's
  read.

## Ferry-class pattern recognition

The factory has now observed 5 ferry sub-types from
Amara:

| Sub-type          | Example(s) | Factory response shape |
|-------------------|------------|------------------------|
| Deep-research     | 18th, 19th | Dedicated absorb PR (§33 header, verbatim preservation) |
| Correction-pass   | 17th Pt-2, 18th Pt-2 | Same absorb PR as Pt-1, with corrections integrated |
| Conversational-check-in | 15th ("how are you") | Same absorb pattern, shorter |
| Directive-refinement | 5th-7th KSK design, 12th exec summary | Absorb + graduations derived |
| **Status-ack** (new, this one) | 20th (this) | Memory-only; no PR |

Ferry-sub-type-recognition memory useful for future Otto
instances choosing response shape.

## Cross-references

- PR #323 — toy cartel detector; Stage 1; DIRTY per
  Aaron Otto-132 sharder-flake directive.
- PR #342 — Stage-2 calibration-harness design (merged).
- PR #344 — Amara 19th-ferry DST audit absorb (merged).
- PR #346 — DST-held + FoundationDB-grade criteria
  (merged).
- PR #347 — accepted-boundaries registry + push-with-
  retry.sh classification (open, mergeable).
- Amara 18th ferry — `docs/aurora/2026-04-24-amara-
  calibration-ci-hardening-deep-research-plus-5-5-
  corrections-18th-ferry.md`.
- Amara 19th ferry — `docs/aurora/2026-04-24-amara-
  dst-audit-deep-research-plus-5-5-corrections-19th-
  ferry.md`.
- Amara 15th-ferry "conversational check-in" memory —
  closest prior pattern (short ferry, factory response
  memory-only until later absorb consolidated).
- Otto-171 queue-saturation memory — the discipline that
  keeps this memory-only rather than PR-piling.
