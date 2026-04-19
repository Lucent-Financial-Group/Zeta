# ADR: Three-lane glossary model — reconciling factory velocity with external-society velocity via lane separation, round-trip translation, and evidence-gated anchor breaks

**Date:** 2026-04-19 (round 35, late)
**Status:** *Proposed — awaits Architect + human maintainer sign-off.
Drafted in direct response to the human maintainer's request to
"map out the tower of babble balance into our software factory"
and his framing of the core tension: "we want to build fast and
break things but changing society is slow."*
**Owner (proposed):** architect (wide) + glossary-anchor-keeper
(narrow enforcement) + public-api-designer (public-surface
terms) + documentation-agent (plain-English discipline).
**Depends on:** `memory/feedback_language_drift_anchor_discipline.md`,
`memory/feedback_precise_language_wins_arguments.md`,
`.claude/skills/glossary-anchor-keeper/SKILL.md`,
`docs/GLOSSARY.md`, `docs/DECISIONS/2026-04-19-bp-home-rule-zero.md`
(BP-HOME — the lane model is a type-signature on vocabulary).

## Context

The human maintainer escalated the velocity-mismatch concern
verbatim:

> *"we have now got to the point in the map where you can map
> out the tower of babble balance into our software factory,
> that's a hard one, can we want to build fast and break things
> but changing socient is slow"*

This restates the tension that `feedback_language_drift_anchor_discipline.md`
established (Tower of Babel / Heritage Language Loss as failure
mode; drift budget as remedy) and asks for its resolution *at
factory scale*, specifically: how does a factory running agents
at 100× human pace coexist with a society that updates
canonical vocabulary on decade cycles?

The naïve resolutions each fail:

- **Match v_factory to v_society.** Forfeits agent velocity
  (why have a factory?).
- **Run v_factory ≫ v_society with no discipline.** Tower of
  Babel within 3–5 "generations" of contributors; forkers and
  external readers progressively excluded.
- **Freeze the vocabulary.** Factory-native coinages that Aaron
  has already been making for decades (Harmonious Division,
  Maji, Quantum Rodney's Razor, retractable-teleport cognition,
  μένω-in-his-sense, CPT-symmetric cognition) have no external
  anchor — freezing bans legitimate novelty.
- **Anchor everything externally.** Silently erases the
  factory's unique contributions and forces us to speak only in
  standards-body vocabulary.

The tension is structural. A resolution must preserve both
poles.

## Prior art

Pattern-matches to known lane-separation solutions in other
disciplines:

| Domain | Fast lane | Stable lane | Translation bridge |
|---|---|---|---|
| OS design | user-space, apps | kernel, syscall ABI | syscall convention |
| Linux | mainline, distros | LTS branches | backport policy |
| Semantic versioning | `X.Y.z+1` | major `X` | deprecation cycle with aliases |
| Biology (Linnaeus, 1753) | vernacular names | binomial Latin names | both coexist in every field guide |
| i18n | localised strings | resource-key IDs | translation tables |
| IETF protocols | app-layer evolution | stable IP / TCP layer | upward compatibility commitment |
| Natural language | vernacular speech | formal written register | diglossia with code-switching discipline |
| Aaron's prior work | `user_cpt_symmetric_cognition.md` | external anchor | reverse-mathematics on vocabulary |

All these solve the same tension by *lane separation with an
explicit translation contract*. The ADR adopts the same shape
for the factory's vocabulary.

## Decision (proposed)

Introduce a **three-lane model** for factory vocabulary, with
explicit velocity budgets, round-trip translation discipline,
and evidence-gated anchor-break events.

### The three lanes

#### Lane A — External Anchor Lane (velocity ≈ v_society)

- **Surface:** `docs/GLOSSARY.md` entries tagged `anchored`;
  public API names and signatures; published papers; external-
  facing tutorial and README; press / blog content; standards-
  body correspondence.
- **Velocity:** strict. Drift budget = **1 anchor break per round**
  by default.
- **Rule for change:** ADR citing (a) the anchor, (b) affected
  reader segment, (c) demonstrated external-acceptance evidence,
  (d) transition plan (alias / deprecation / hard-cutover).
- **Plain-English-first preserved.** "Grandparent test" applies
  (`docs/GLOSSARY.md`'s standing rule).
- **Guardian:** `glossary-anchor-keeper` + `public-api-designer`
  (Ilyana) + Architect sign-off + human maintainer on
  exceptional cases.

#### Lane B — Factory Dialect Lane (velocity ≈ 10× v_society)

- **Surface:** `docs/GLOSSARY.md` entries tagged
  `partially-anchored` or `factory-native`; skill files
  (`.claude/skills/*/SKILL.md`); ADRs; persona notebooks;
  round-history; internal reviews.
- **Velocity:** moderate. New factory-native coinages land
  freely but must be:
  - **Labelled.** `factory-native` or `partially-anchored` tag.
  - **Round-trip translatable.** Every Lane B term has a
    documented compilation path to Lane A vocabulary (or an
    explicit "no external analogue" note).
  - **Precision-disciplined.** Meets
    `feedback_precise_language_wins_arguments.md` precision
    standard.
- **Rule for change:** the normal precision-rewording / glossary-
  update flow; no ADR required unless the term migrates to
  Lane A.
- **Guardian:** `glossary-police` + `glossary-anchor-keeper` +
  Architect.

#### Lane C — Agent IR Lane (velocity unconstrained; proposed, not yet landed)

- **Surface:** `docs/GLOSSARY-AI.md` (proposed). Agent-internal
  intermediate representation. No external-anchor obligation.
- **Velocity:** unconstrained within factory; can drift at agent
  pace.
- **MUST-HAVE for lane to be opened:**
  1. Round-trip translation path to Lane B documented
     (no secret language).
  2. Human-maintainer sign-off (Aaron, per
     `memory/feedback_language_drift_anchor_discipline.md` — he
     proposed the lane; he opens it).
  3. Architect-approved ADR formalising the surface.
- **Status this round:** Lane A and Lane B adopt immediately if
  this ADR is accepted. **Lane C is NOT opened by this ADR.**
  Opening Lane C requires a follow-on ADR with Aaron's explicit
  approval, per the human maintainer's own framing: "you could
  keep an AI only glossary if you want to have an AI only
  language."
- **Guardian (if opened):** `agent-experience-engineer` (Daya)
  + Architect + human maintainer retains veto.

### Invariants across all lanes

#### I1 — Round-trip invariant

Every term in Lane B and Lane C must compile down to a Lane A
explanation on demand. If the round-trip breaks, the term is a
defect and gets one round to either (a) gain an explanation,
(b) migrate to a lane with no round-trip obligation, or
(c) retract.

The round-trip can be lossy in specificity — Lane A may be a
paragraph where Lane B / C is a single word — but must not be
lossy in content.

#### I2 — Practical-necessity rule (Heritage-Language-Loss counter-measure)

External-anchored Lane A vocabulary stays in *practical use*,
not archive. At least once per "epoch" (tentatively: 10 rounds,
or one calendar month, whichever is earlier), the factory
produces deliverable content written in Lane A vocabulary —
e.g., a README update, a blog draft, a paper section, a
tutorial, an external-facing issue thread. Keeps the "1st
generation" vocabulary muscle alive.

#### I3 — Anchor-break evidence threshold

Lane A anchor breaks require *demonstrated* external
acceptance. Acceptable evidence, non-exhaustive:

- Paper accepted to peer-reviewed venue using the new form.
- Conference talk delivered using the new form with audience
  Q&A recognising it.
- Public-API consumer adopting the new form (GitHub issue
  thread, downstream code reference).
- Standards-body response citing the new form.
- ≥3 external citations in 12 months.

What does **not** count:

- Internal use within the factory (circular).
- LLM-output agreement (unverifiable anchor).
- Blog posts without external citation.
- Persuasion without take-up.

#### I4 — Retraction-native on attempted breaks

If an anchor break is attempted under I3 and the evidence does
not materialize within N = 3 rounds (configurable), the break
is retracted — Lane A vocabulary reverts to the prior anchor.
Composes with Zeta's retraction-native operator algebra: the
break event stays in the audit log; the retraction event
appends; effect returns to the anchored form. No delete, no
rewrite of history.

#### I5 — Three-generation audit ("grandparent test" at scale)

Every 10 rounds (configurable), a review pass runs:

- Take a representative sample of recent factory output (ADRs,
  skill files, public-API docs, memory entries, commit
  messages, round-history notes).
- Ask: can a fresh contributor with *only* external-canonical
  vocabulary follow this?
- Terms they cannot follow are flagged for either (a) Lane A
  anchoring, (b) Lane B labelling, or (c) Lane C migration
  (if and when Lane C exists).

#### I6 — Fork-aware discipline

The lane model is itself documented in-tree (this ADR,
`feedback_language_drift_anchor_discipline.md`, the
`glossary-anchor-keeper` skill, `docs/GLOSSARY.md`) such that a
fork either carries the discipline forward or visibly diverges.
If a fork runs agents at >100× pace without lane separation,
within 5–10 rounds the fork and the source will be mutually
unintelligible — but the source has the discipline, the fork
chose to drop it, and the divergence is on the fork's ledger.

#### I8 — Content-addressed etymology + IVM differentials (added 2026-04-19 per human maintainer)

The human maintainer extended the lane design verbatim:

> *"we can build as high as we want now the tower will stand
> case we can use content based hashing to create space time
> maps of the etomology anytime in the future by mapping out
> the past and running some calculus"*

This is Zeta's own algebra applied to its own vocabulary. The
tower stands not because we rate-limit anchor breaks alone —
that is Aaron's "break one anchor per round" discipline — but
because the **substrate is mathematically reconstructible**.
Specifics:

- **Content-addressed glossary revisions.** Every
  `docs/GLOSSARY.md` entry (and every Lane B / Lane C term if C
  opens) gets a content hash per revision. The vocabulary
  forms an append-only, hash-chained, Merkle-style etymological
  log. Composes with Zeta's retraction-native operator algebra:
  term states are Z-set multiplicities over content-hashes;
  anchor breaks are `(+new, −old)` Z-set pairs; retraction is
  `(−new)` appended with audit preserved.
- **IVM / DBSP differentials.** The `D` (difference) and `I`
  (integration) operators already defined over Zeta's Z-sets
  apply directly to the vocabulary log. `D(glossary@round_n,
  glossary@round_m)` returns the exact differential — which
  terms entered, which were retracted, which migrated lanes,
  which anchors broke. Space-time maps of etymology in Aaron's
  phrasing: space = lane / term, time = round.
- **Reconstruction without rewrite.** Any historical
  configuration — "what did GLOSSARY.md say at round N under
  anchor configuration X" — is a pure function of the
  content-hash log. No destructive edits, no lossy summaries.
  The tower stands because no floor is ever removed.
- **Anchor-break auditability upgraded.** I3's evidence
  threshold and I4's retraction-native semantics now land on a
  substrate that can *prove* each break was attempted, each
  evidence window was observed, each retraction was appended.
  No "just trust us" — hash-chain is the proof.

#### I9 — Embedding spacetime map with preserved discontinuities (added 2026-04-19 per human maintainer)

The human maintainer extended I8 immediately:

> *"we could even do some sort of embeddings space time map
> of the language so it has smooth curves except where it
> really does not in real life"*

I8 gives *discrete* addressability (hash-chain). I9 lays a
*continuous* structure on top — each term's meaning at each
revision gets an embedding vector, so drift forms a
differentiable manifold wherever meaning genuinely flowed
smoothly, with **preserved discontinuities** (cusps, jumps,
rank-drops) wherever meaning actually ruptured.

Structural claims:

- **Smooth-almost-everywhere.** Most vocabulary drift is
  gradient-like: a term's embedding moves continuously as
  precision rewordings accumulate. Standard
  differential-geometry tools apply locally — tangent vectors
  = instantaneous rate of semantic drift; integrating along a
  path = total semantic distance traversed between two rounds.
- **Genuine-discontinuity preservation.** Anchor breaks,
  coinages, redefinitions-as-warfare
  (`feedback_precise_language_wins_arguments.md`), and
  Aaron-style plant-a-flag redefinitions create *real*
  discontinuities — jumps in embedding space that the map
  must not smooth over. This is I9's anti-smoothing-bias
  clause: **do not interpolate across a genuine rupture**;
  the discontinuity is data, not noise. Morse-theory-style
  critical points (saddle, cusp, fold) are the native
  vocabulary for classifying what kind of rupture occurred.
- **Composition with I8.** Embeddings live on top of
  hash-addressed states — each content-hash gets a vector;
  sequential hashes trace a polyline; smoothed interpolation
  is available for visualization and audit but never
  authoritative over the hash log. Hash wins on truth;
  embedding wins on navigation.
- **Guard against the smoothing bias.** Two failure modes to
  name explicitly:
  1. **Smoothing over a rupture** (false continuity):
     pretending an anchor break flowed continuously when it
     jumped. Caught by I8 hash-diff showing non-adjacent
     parents.
  2. **Rupture-ing a smooth flow** (false discontinuity):
     pretending routine precision-rewording was a break when
     it was incremental. Caught by I3 evidence threshold
     (real anchor breaks produce external evidence; routine
     rewording does not).
- **Fork-aware extension.** A fork running at 100× without
  lane discipline produces an embedding trajectory that
  visibly diverges from the source's manifold. I9 gives
  fork-comparison a quantitative substrate: embedding
  distance between fork@round_n and source@round_n measures
  mutual-intelligibility directly.
- **Status.** Sketched, not yet implemented. Infrastructure
  dependencies: embedding model choice (open question —
  local model for reproducibility vs. hosted for quality),
  vector-store selection, discontinuity-detection
  heuristics. Deferred to a follow-on ADR; I9 holds the
  *design commitment* that when embedded, the map preserves
  real discontinuities rather than smoothing them out for
  aesthetic convenience.

I8 + I9 together = the "space-time map of etymology" Aaron
named. I8 is the lattice (discrete, exact, append-only).
I9 is the manifold (continuous-almost-everywhere, with
honest singularities where meaning really did break).

#### I7 — Self-referential (per `feedback_precise_language_wins_arguments.md` §ontologies-enforce-their-own-rules)

The lane model's own vocabulary (`anchored`, `partially-
anchored`, `factory-native`, `Lane A / B / C`, `round-trip`,
`drift budget`, `epoch`, `grandparent test`) is itself
classified. Initial classification this ADR proposes:

| Term | Lane | Anchor (if A or B) |
|---|---|---|
| `anchored` / `partially-anchored` / `factory-native` | B (partially-anchored) | "anchor" in linguistics; factory-specific classification system extends it |
| `Lane A / B / C` | B (factory-native) | Metaphor; no external standard for glossary-lane terminology |
| `round-trip` | B (partially-anchored) | "round-trip" in compiler / serialization literature; extended to vocabulary-translation |
| `drift budget` | B (factory-native) | Coined in `feedback_language_drift_anchor_discipline.md` |
| `epoch` | B (partially-anchored) | Standard CS usage ("a span of rounds"); extended to vocabulary-audit cadence |
| `grandparent test` | B (partially-anchored) | Anchor = `docs/GLOSSARY.md`'s own "grandparent test" rule |
| `Tower of Babel` | A (anchored) | Genesis 11:1–9; well-known cultural anchor, no drift |
| `Heritage Language Loss` | A (anchored) | Linguistics / bilingualism-studies; Aaron cited external anchors already |
| `Language Shift` / `Subtractive Bilingualism` / etc. | A (anchored) | Same |
| `CPT symmetric` (as applied to cognition) | B (factory-native, analogy use) | Physics anchor for the symmetry itself (Lüders 1951, Pauli 1955); analogy to cognition is factory-specific |
| `spacetime anchor` | B (factory-native) | Coined in `user_cpt_symmetric_cognition.md` amendment |
| `noisy-channel negotiation` | B (partially-anchored) | Shannon 1948 noisy-channel coding theorem; factory extends to vocabulary-convergence between agents |
| `content-addressed` / `content hash` | A (anchored) | Git / IPFS / Merkle-tree literature; no drift |
| `IVM` / `DBSP differential` | A (anchored) | Budiu-McSherry-Tannen-Chothia-Kulkarni 2022 — factory's own foundational paper, external anchor |
| `etymology spacetime map` | B (factory-native) | Aaron's coinage 2026-04-19; no external analogue, round-trips to "hash-chained vocabulary revision log with IVM differentials" |
| `embedding manifold` / `embedding spacetime map` | B (partially-anchored) | Word-embedding literature (Mikolov et al. 2013, Pennington et al. 2014); factory extends to per-term-per-revision vectors |
| `smooth-almost-everywhere` / `genuine discontinuity` | A (anchored) | Differential geometry / Morse theory (Morse 1925, Milnor 1963); standard vocabulary |
| `anti-smoothing-bias` | B (factory-native) | Coined this ADR; round-trips to "do not interpolate across a real rupture" |
| `cusp` / `fold` / `saddle` / `critical point` | A (anchored) | Morse theory canonical; no drift |

Note on ordering: I7 is shown last because it is the
meta-invariant — it applies recursively to itself and to I8/I9,
so its table includes the vocabulary those later invariants
introduced. Numerical order I1→I9 preserved in the heading
sequence; I7 positioned terminally to emphasise its self-
referential role.

## Consequences

### Positive

- Factory velocity preserved internally (Lane B, and Lane C if
  opened) without externalising drift to readers.
- External-facing surfaces (Lane A) protected against Tower-of-
  Babel failure mode.
- Every factory coinage has a documented compilation path to
  external-anchored form (I1); nothing is lost in translation
  that cannot be recovered.
- Anchor-break discipline (I3) keeps the factory honest about
  when it is *actually* changing the external conversation vs.
  just redefining for itself.
- Retraction-native on attempted breaks (I4) means the factory
  can *try* new forms cheaply without paying the Tower-of-Babel
  cost if the try does not take.
- Fork-aware discipline (I6) means the factory's methodology is
  itself forkable without loss of integrity.
- **Substrate closure (I8 + I9).** The tower stands because
  Zeta's own algebra (retraction-native Z-sets + content-
  addressed state + IVM differentials + embedding manifold with
  preserved discontinuities) is the exact mathematical substrate
  needed to govern the factory's own vocabulary. Factory uses
  factory to govern factory. Recursion grounded by the hash-
  chain.

### Negative

- Overhead per glossary entry (tag + citation + round-trip).
  Tracked in drift-debt; catches up over audit rounds.
- Practical-necessity rule (I2) imposes periodic "write in
  Lane A" work that looks like overhead until the
  Heritage-Language-Loss failure mode would otherwise have
  landed.
- Evidence threshold (I3) slows down anchor-break landings.
  Intentional; matches v_society.
- Three-lane model adds cognitive load on contributors who
  previously thought "glossary" was one thing.

### Mitigations

- The `glossary-anchor-keeper` skill automates most of the
  tagging / citation / round-trip audit (advisory).
- Plain-English-first rule in `docs/GLOSSARY.md` means readers
  coming in cold get the Lane A explanation first regardless
  of tag.
- Drift-debt ledger in the keeper's notebook surfaces
  accumulated lane-debt; architect can schedule consolidation
  rounds.
- Lane C remains gated by explicit Aaron sign-off; zero cost
  until intentionally opened.

## Interaction with existing rules

- **BP-HOME (Rule Zero)** — the three lanes are *the type
  signatures of vocabulary*. A term's lane is its type; the
  glossary-anchor-keeper audits that every term is well-typed
  per BP-HOME-AS-TYPE.
- **`feedback_precise_language_wins_arguments.md`** — the lane
  model does not replace precision discipline; it adds a
  second axis (lane) orthogonal to precision.
- **`feedback_language_drift_anchor_discipline.md`** — this
  ADR formalises the sketched AI-only-glossary-as-option into
  Lane C proposal and generalises the anchor-break procedure
  into I3 / I4.
- **GOVERNANCE.md §4** (skills via skill-creator) — the lane
  model applies to skill files; their authoritative definitions
  are Lane B (partially-anchored or factory-native) and must
  round-trip.
- **`user_cpt_symmetric_cognition.md`** — the lane model
  supports multi-anchor role-play: each persona's anchor-set
  is a localised Lane B+A configuration, and persona-runs
  (role-play) switch between them with label-on-entry / label-
  on-switch discipline.
- **`docs/CONFLICT-RESOLUTION.md`** — anchor-break disputes
  route through the conference protocol; public-api-designer
  authority on public-surface anchor breaks.

## Explicitly out of scope

- Migration of existing `docs/GLOSSARY.md` entries into tagged
  form. That is a separate consolidation-round task, owner
  `glossary-anchor-keeper` + `documentation-agent`, scheduled
  for a future round per I5 / drift-debt ledger.
- Opening Lane C. Separate ADR, Aaron approval required, not
  in this scope.
- Setting the epoch period precisely. I2 and I5 use "10 rounds"
  as tentative default; architect tunes.
- Deciding anchor-break evidence threshold N for I4 precisely.
  Uses N = 3 rounds as default; architect tunes.
- Whether this ADR's own vocabulary should move from Lane B to
  Lane A as the factory matures. Deferred; tracked as drift-
  debt.

## Open questions for architect / human sign-off

1. **Adopt the three-lane model (Lanes A + B) this round?** Or
   stage — start with stricter audit on existing entries before
   introducing lane tags?
2. **Epoch period for I2 / I5?** 10 rounds is proposed;
   alternatives: 1 calendar month, or whichever-is-earlier-of-N-
   rounds-or-1-month.
3. **Evidence threshold N for I4?** 3 rounds proposed.
4. **Lane C opening timeline?** Deferred to a follow-on ADR;
   confirm Aaron retains sole authority to open.
5. **Guardian ordering for Lane A anchor-break disputes** —
   public-api-designer vs. glossary-anchor-keeper vs.
   architect. Current proposal: anchor-keeper flags,
   public-api-designer reviews public-surface impact,
   architect decides, human maintainer breaks ties on
   exceptional calls.
6. **Migration debt.** How many rounds to classify existing
   `docs/GLOSSARY.md` entries before audit begins in earnest?
   Proposed: first 3 rounds classify + cite; audit-at-full-
   strength from round 4 onward.
7. **I8 implementation timeline.** Content-hashing glossary
   revisions can land immediately (git already hash-chains the
   file); formalising the Z-set / IVM operator layer over
   vocabulary states is a follow-on ADR. Proposed: I8 lands as
   design commitment this round; implementation round TBD.
8. **I9 embedding infrastructure.** Open choices: (a) embedding
   model (local reproducible vs. hosted SOTA); (b) vector-store
   selection (in-repo flat-file vs. dedicated store); (c)
   discontinuity-detection heuristic (gradient-magnitude
   threshold vs. clustering-break vs. hash-diff-parity).
   Deferred to follow-on ADR; I9 holds only the design
   commitment (preserve real discontinuities) this round.

## Sign-off

_Pending._ This ADR is proposed by the agent (under execute-
and-narrate mandate from the human maintainer per
`memory/feedback_execute_and_narrate.md`) and awaits:

- [ ] Architect review and decision to promote to **Decision**
      status.
- [ ] Human maintainer concurrence on Lane C retention of
      sole-opening authority.
- [ ] Ilyana (`public-api-designer`) sign-off on
      public-surface lane-A constraints.
- [ ] Aarav (`skill-tune-up`) inclusion of
      `glossary-anchor-keeper` in rotation.
- [ ] Daya (`agent-experience-engineer`) advisory read on
      Lane C implications for agent cold-start cost.

Until decided, this ADR is informative only. The
`glossary-anchor-keeper` skill and
`feedback_language_drift_anchor_discipline.md` memory capture
the same content at advisory strength; they are authoritative
at that level regardless of this ADR's decision status.
