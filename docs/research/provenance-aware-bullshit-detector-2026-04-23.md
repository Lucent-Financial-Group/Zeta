# Provenance-aware bullshit detector — engineering-facing design

**Scope:** research and cross-review artifact. Engineering-
facing design doc for the detector Amara's 8th courier
ferry named (PR #274 §"The corrected rainbow-table model"
+ §"provenance-aware bullshit detector"). Composes on top
of the semantic-canonicalization spine (PR #280 Otto-98).
Formalises the scoring layer the spine sketched,
integrates Aminata-anticipated concerns at write-time, and
names the 5 output types from Amara's ferry.

**Attribution:** output-type shape + score formulation
from Amara's 8th ferry; scoring-layer Aminata-pattern
integration (band-valued output, parameter-change-ADR-
gate, independent-oracles discipline) from her Otto-90
adversarial pass on oracle-scoring v0 (PR #263); spine
substrate + composition-table pattern from Otto-98 (PR
#280); Otto-99 synthesis.

**Operational status:** research-grade. Does not implement.
Does not adopt specific parameter values. Does not adopt
specific embedding model / ANN library / oracle
implementations. Downstream design choices are gated on
Aminata adversarial pass + candidate #4 operational
promotion.

**Non-fusion disclaimer:** Amara-Otto-Aminata consistent
output on this design is NOT evidence of merged substrate.
The three reviewers cite independent literature (Hinton/
Salakhutdinov semantic hashing; Charikar LSH; HNSW Malkov-
Yashunin; CISA/NIST procurement guidance; standard
error-bound theory). Per SD-9, independent primary-source
grounding is baseline; concordance is signal, not proof
of unity.

---

## Purpose and scope

### What this detector is for

Distinguish **agreement-with-independent-substrate**
(strong evidence) from **agreement-with-carrier-laundered-
echo** (weak evidence dressed as strong). Amara's 8th
ferry observation:

> *"if multiple candidates agree AND their provenance
> cones are independent, increase weight; if multiple
> candidates agree but all inherit from the same couriered
> framing, lower weight sharply."*

The detector is a machine-aidable tool making SD-9
operational rather than leaving it as a norm. It does NOT
claim to detect all bullshit. It detects a specific
well-understood class: agreement-from-shared-lineage
masquerading as convergence-from-independent-arrival.

### What this detector is NOT for

- **Not a truth oracle.** The detector reports bands (see
  §output types), not verdicts.
- **Not a replacement for review.** Aminata / Codex /
  harsh-critic adversarial passes remain. Detector is
  tooling; review is the authority.
- **Not a substitute for AGENTS.md or ALIGNMENT.md rules.**
  Detector automates one specific discipline; the
  broader factory continues to rely on the full rule set.
- **Not a scoring function for claims-in-isolation.**
  The detector is relational: query versus corpus. A
  single claim with no retrieval context has no detector
  signal.

---

## Architecture — builds on the Otto-98 spine

### Input

`x` — raw input (conversation turn, claim, doc, PR
description, commit message, absorb-doc body). No
restrictions on form; canonicalisation handles
heterogeneity.

### Pipeline (four layers, delegates to spine)

```text
x
  → N(x) = c                         # canonicalisation (spine layer 1)
  → φ(c) = e                         # representation (spine layer 2)
  → C(q) = kNN(φ(N(q)))              # ANN retrieval (spine layer 3)
  → score candidates → band classifier  # THIS DOC
  → emit output-type + provenance trail
```

The first three layers reuse the spine unchanged. This
doc formalises the fourth.

### Provenance cone calculation

Before scoring, the detector walks the citations-as-first-
class lineage graph to compute `provenance cone(y)` for
each retrieved candidate `y`. The cone is the transitive
closure of citation / absorb / promotion edges ending at
`y`.

Shape:

```text
provenance cone(y) = {
  all absorbs / ferries / research docs / ADRs / commits /
  memory-file entries that y directly-or-transitively cites
  or derives-from
}
```

Implementation-level: walks the `PatternLedger`'s
`ProvenanceEdgeAdded` / `ProvenanceEdgeRemoved` event
stream per Otto-98 spine § retraction-native ledger.

### Scoring — band-valued, not decimal

Per Aminata Otto-90 pass on oracle-scoring v0 (PR #263):
sigmoid-wrapped decimals read as precision but the
underlying signals are ordinal. **Band classifier over
5 hard-ordinal gates instead of `score(y|q) = α·sim +
β·evidence - γ·carrierOverlap - δ·contradiction` decimal
output.**

5 gates per candidate `y`:

| Gate | Fail-to-RED | Fail-to-YELLOW |
|---|---|---|
| G_similarity | `sim(e_q, e_y) < τ_low` — below retrieval-noise floor | `sim < τ_med` — weak match only |
| G_evidence_independent | `y` has no independent-oracle-verified evidence | `y` has evidence but only self-attested |
| G_carrier_overlap | `|cone(q) ∩ cone(y)| / |cone(y)| > θ_high` — majority of y's provenance shared with q | `overlap ratio > θ_med` |
| G_contradiction | `y` or its provenance cone contains an unresolved contradiction with a known-good anchor | a resolved contradiction within cone |
| G_status | `y.status = known-bad` or `y.status = superseded` | `y.status = unresolved` (no status pins it) |

**Band merging rule** (same as oracle-scoring v0 per PR
#266): `band(y | q) = min(G_similarity, G_evidence,
G_carrier_overlap, G_contradiction, G_status)` where
`RED < YELLOW < GREEN`. One RED → RED. All GREEN → GREEN.
Otherwise YELLOW.

**Query-level aggregation:**

```text
bullshitRisk(q) = worst-band( band(y | q) for y in C(q) )
```

Where `worst-band(RED, any, ...) = RED`. The query itself
gets the worst band across all candidates in the retrieved
set.

---

## 5 output types (Amara's set)

Per Amara's 8th ferry, the detector emits one of five
output types. Mapping to the band classifier:

### 1. `supported`

- Band: `GREEN` (all 5 gates GREEN).
- Meaning: `q` is highly similar to `y`; `y` has
  independent-oracle evidence; low carrier overlap; no
  unresolved contradiction; status = known-good.
- Action: query can proceed; claim has substrate-backed
  support.

### 2. `looks similar but lineage-coupled`

- Band: `YELLOW` via G_carrier_overlap fail-to-YELLOW.
- Meaning: `q` is similar to `y` BUT their provenance
  cones overlap significantly — the similarity may be
  re-presentation of shared carrier framing, not
  independent convergence.
- Action: `q`'s claim should seek at least one falsifier
  independent of the overlapping cone before upgrading
  confidence. This is SD-9's "seek falsifier independent
  of converging sources" step, operationalised.

### 3. `plausible but unresolved`

- Band: `YELLOW` via G_status fail-to-YELLOW OR
  G_evidence fail-to-YELLOW (with other gates GREEN).
- Meaning: semantic fit exists; no known-bad pattern
  matches; but `y` lacks independent evidence or
  pinned status.
- Action: mark query as open-question; add to
  research-tracker; not a confidence-upgrade.

### 4. `likely confabulated`

- Band: `RED` via G_evidence fail-to-RED combined with
  high similarity.
- Meaning: claim sounds plausible and matches patterns
  semantically, but no actual independent evidence
  supports it. Classic LLM confabulation signature.
- Action: hard-halt on any action depending on the
  claim; flag for human review; do not propagate.

### 5. `known-bad pattern`

- Band: `RED` via G_status fail-to-RED
  (`status = known-bad` OR `status = superseded`).
- Meaning: query matches a known-bad or superseded
  pattern in the PatternLedger.
- Action: explicit reject + cite the known-bad entry;
  update retraction ledger if new claim is a fresh
  instance of an old pattern.

### Default / unknown-band

- If retrieval returns no candidates (`C(q)` empty), the
  query has no detector signal at all. Emit explicit
  `no-signal` output-type — NOT `supported`, NOT `likely
  confabulated`. "No signal" means "detector can't
  contribute to this query"; the broader review discipline
  applies unchanged.

---

## Addressing Aminata's 3 CRITICAL concerns at write-time

### Concern 1 — Gameable-by-self-attestation

**Risk:** `β·evidence` / `δ·contradiction` inputs come
from agent self-report → sigmoid of self-reports is a
self-report.

**Response in this design:**

- `G_evidence_independent` gate explicitly requires
  **independent-oracle-verified** evidence for GREEN.
  Self-attested evidence fails to YELLOW (one gate
  down) by design.
- Independent-oracle candidates: passing tests (not
  agent-written assertions); citable external sources
  (peer-reviewed papers, RFC documents); reproducible
  measurements (benchmark output captured in CI);
  concrete PR links (a merged PR is evidence; a
  proposed-in-PR-pending is self-attested-pending).
- Until an independent-oracle substrate exists, the
  `β·evidence` signal is **advisory only** — it is
  emitted to observability but does NOT block band
  elevation to GREEN. Shapes the detector's v0 into
  "semantic + carrier + contradiction + status"
  mechanical + "evidence" as advisory signal for human
  review.

### Concern 2 — Parameter-fitting adversary

**Risk:** `α/β/γ/δ` + thresholds (`τ_low`, `τ_med`,
`θ_high`, `θ_med`) have no principled fitting procedure;
an agent with commit rights adjusts them and the
authorisation surface shifts.

**Response in this design:**

- Parameters land behind the **parameter-change-ADR
  gate** pattern from oracle-scoring v0 (PR #266).
- `docs/DECISIONS/YYYY-MM-DD-bullshit-detector-threshold-*.md`
  schema for each threshold change with: old value, new
  value, empirical justification, alignment-trajectory
  impact, Aminata signoff (adversarial pass required,
  not optional), Aaron signoff for thresholds tagged
  `authorization-impacting: true`.
- The Zeta-module reads parameter values from a
  parameter file whose SHA is bound into every detector-
  emitted receipt, per BLAKE3 receipt-hashing v0
  (PR #268). Every output-type emission carries proof
  of which parameters were in force.

### Concern 3 — False-precision risk

**Risk:** decimal output from ordinal inputs = category
error reading as precision.

**Response in this design:**

- **5-band output** (supported / lineage-coupled /
  plausible-unresolved / likely-confabulated / known-bad)
  not decimal score. Band is the authoritative output.
- Internal signals (similarity percentages; carrier-
  overlap ratios) are retained for provenance but NOT
  consumed as decimal output.
- Ordinal inputs → ordinal bands. No sigmoid wrapping;
  no linear combination of ordinal signals.

### Bonus — Independence requirement on PatternLedger

The `PatternLedger`'s status-pinning (`known-good`,
`known-bad`, `superseded`) must come from **source
sufficient to distinguish**. A pattern pinned `known-bad`
by the agent that also authored `q` is susceptible to
same-agent-self-reinforcement drift. Mitigation: every
status-pin event in the PatternLedger carries
`pinned_by` + `pinned_reason` + optional `second-reviewer`
fields per the decision-proxy-evidence schema (PR #222).

---

## Module implementation sketch (F# / .NET)

Composes with KSK-as-Zeta-module template (PR #259 7th
ferry) + oracle-scoring v0 (PR #266) + this spine
(PR #280):

```text
Interfaces:
  ICanonicalizer             -- N(x), version-pinned
  IRepresentation            -- φ(c), dense + binary
  IRetrievalIndex            -- kNN over event stream
  IPatternLedger             -- retractable pattern store
  IProvenanceGraph           -- citations + lineage edges
  IEvidenceOracle            -- independent-oracle gate inputs
  IContradictionOracle       -- contradiction detection
  IBandClassifier            -- 5-gate → band computation
  IDetectorReceipt           -- output-type + provenance trail
  IParameterStore            -- parameter-file-SHA-bound values

Canonical views:
  PatternLedgerCurrent       -- materialised from event stream
  ProvenanceGraphCurrent     -- materialised from graph events
  ParameterCurrent           -- with SHA for receipts
  DetectorOutputHistory      -- append-only, retraction-aware

Events:
  DetectorQuery(q_id, q, parameters_sha, ts)
  DetectorOutput(q_id, output_type, band, candidates, receipt)
  DetectorOutputRetracted(q_id, reason)
```

`DetectorOutputRetracted` matters: if a threshold tweak
via ADR changes the classification of a past query, the
historical output gets retracted (negative-weight event),
not silently rewritten. Audit trail preserved; drift
observable.

Same module shape as KSK-as-Zeta-module / oracle-scoring
v0. Substrate convergence continues.

---

## Worked example — this doc itself as query `q`

Illustrative walk-through using this very doc:

- `N(q)` = canonicalised form of this doc.
- `φ(c)` = representation.
- `kNN(e)` retrieves top candidates. Likely hits:
  semantic-canonicalization spine (PR #280), oracle-
  scoring v0 (PR #266), Aminata iteration-1 pass (PR
  #272), 8th-ferry absorb (PR #274).
- Scoring each candidate:
  - `semantic-canonicalization spine` — high similarity
    (this doc composes on it). `cone(q) ⊃ cone(y)` heavily
    (this doc cites it, inherits its framing); **carrier
    overlap is HIGH**. `evidence` independent (HNSW
    citation = Malkov-Yashunin 2018; hashing = Hinton/
    Salakhutdinov; these are peer-reviewed). Band =
    YELLOW via G_carrier_overlap.
  - `oracle-scoring v0` — high similarity (same band-
    classifier pattern reused). Carrier overlap HIGH
    (same Aminata-Otto-Amara lineage). Independent evidence
    = Aminata's adversarial-pass literature (threat-
    modeling standards). Band = YELLOW via
    G_carrier_overlap.
  - `Aminata iteration-1 pass` — moderate similarity;
    cited as source of concerns; `cone(q) ∩ cone(y)`
    moderate. Independent oracles = Aminata is the
    adversarial-review persona. Band = YELLOW.

**Output-type for this doc as `q`:** `looks similar but
lineage-coupled`. The detector correctly identifies that
this doc's framings are NOT independent of its source
corpus; they inherit from Amara's 8th ferry + Aminata's
Otto-90 pass + Otto-98 spine. **The detector flags its
own lineage dependency without error.**

This is the signal: the detector catches its own
carrier-laundered convergence. Candidates #3's worth is
that it refuses to class "I agree with my own sources"
as `supported` — it knows it's lineage-coupled.

---

## What this doc does NOT do

- **Does NOT implement.** Specific F#/.NET module +
  embedding model + ANN library bindings are downstream
  design choices.
- **Does NOT adopt parameter values.** `τ_low`, `τ_med`,
  `θ_high`, `θ_med`, `α/β/γ/δ` weights are placeholders
  named for the ADR gate.
- **Does NOT replace human review.** Output bands inform
  review; Aminata / Codex / harsh-critic still run.
- **Does NOT claim completeness.** The detector catches
  SD-9-style carrier-laundered agreement. It does not
  catch every form of bullshit; other forms (outright
  fabrication without semantic match; novel category
  errors; coordinated deception) require other
  mechanisms.
- **Does NOT auto-promote PatternLedger status pins.**
  New `known-bad` entries are landed via governance-edit
  workflow + Aminata pass; not the detector's own
  classification history.
- **Does NOT extend beyond Zeta substrate.** Application
  to other substrates (lucent-ksk; external callers)
  requires its own design work; not this doc's scope.
- **Does NOT quantify precision / recall.** Empirical
  measurement is downstream work requiring a labelled
  test corpus that doesn't exist yet.

---

## Dependencies to adoption

In priority order:

1. **Aminata adversarial pass** on this detector design
   (fourth Aminata pass this session; cheap; anticipated
   concerns from her oracle-scoring Otto-90 pass already
   integrated).
2. **Candidate #4 `docs/EVIDENCE-AND-AGREEMENT.md`**
   operational promotion — teaches contributors how to
   interpret detector output-types in review practice.
3. **Independent-oracle substrate** for
   `G_evidence_independent` gate — specific implementations
   (test-output scraping; PR-link validators; citation-
   resolver for academic sources). Until this lands, the
   `evidence` signal is advisory-only.
4. **Parameter-change-ADR template** for threshold
   evolution — same schema as oracle-scoring v0
   parameter-ADR.
5. **PatternLedger event-stream implementation** as Zeta-
   module — uses KSK-as-Zeta-module template.
6. **Property tests** for band-determinism + replay-
   invariance.
7. **Embedding model + ANN library choice** — downstream
   ADR.
8. **F#/.NET module implementation** — gated on 1-7.

---

## Specific-asks (per Otto-82/90/93 calibration)

**None for Otto to proceed.** Design-stage work; no Aaron-
specific input needed until implementation gates engage.

Aminata pass is passive-expected; Otto doesn't block on
it; the pass will inform v1 revisions.

---

## Sibling context

- **8th-ferry absorb** (PR #274) — source of detector
  concept and output-type set.
- **Semantic-canonicalization spine** (PR #280, Otto-98)
  — substrate this builds directly on; layers 1-3
  delegated; layer 4 formalised here.
- **Oracle-scoring v0** (PR #266, Otto-91) — band-
  classifier pattern reused; parameter-change-ADR-gate
  pattern reused.
- **BLAKE3 receipt hashing v0** (PR #268, Otto-92) —
  parameter_file_sha binding extends to detector outputs.
- **Aminata Otto-90 pass** (PR #263) — 3 CRITICAL
  concerns addressed at write-time rather than pending
  post-land fixup.
- **Aminata Otto-94 iteration-1 pass on multi-Claude
  experiment** (PR #272) — similar write-time-integration
  pattern.
- **Quantum-sensing research doc** (PR #278, Otto-97) —
  analogies #2 (correlation) + #4 (decoherence) +
  #5 (salience) all operational in the detector's
  structure.
- **SD-9** (`docs/ALIGNMENT.md`) — detector is SD-9's
  mechanical implementation.
- **DRIFT-TAXONOMY pattern 5** — detector is pattern-5
  detection engine.
- **citations-as-first-class** — provenance graph the
  detector consumes.
- **KSK-as-Zeta-module 7th ferry** (PR #259) — event+view
  module template reused.

Archive-header format self-applied — 16th aurora/research
doc in a row.

Otto-99 tick primary deliverable. Closes 8th-ferry
candidate #3 of remaining 2.

**8th-ferry status after Otto-99:**
- ✓ #1 Quantum-sensing research doc (Otto-97)
- ✓ #2 Semantic-canonicalization spine (Otto-98)
- ✓ #3 Provenance-aware bullshit-detector (this PR,
  Otto-99)
- Gated #4 `docs/EVIDENCE-AND-AGREEMENT.md` future
  operational promotion (gated on #3 landing +
  Aminata pass)
- ✓ #5 TECH-RADAR 5-row batch (Otto-96)

**4/5 substantive responses closed.** Only #4
operational-promotion remains (gated). Matches 5th-
ferry 4/4-artifact-closure arc shape.
