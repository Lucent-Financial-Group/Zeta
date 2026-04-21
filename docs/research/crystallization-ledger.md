# Crystallization ledger

Append-only record of vision→research→crystallize→backlog
turns. Each turn is the cartographer's log entry: one row
in the territory surveyed, one edit to the map, and the
residue the turn leaves in backlog / factory.

Companion to
`docs/research/crystallization-loop.md` —
the loop-shape design doc that motivates this ledger.

## Why this ledger exists

Aaron 2026-04-22, on the reframe from pipeline to loop:

> *"its like a loop with resdiue each time lol or whatever,
> the backlog and factory uptates that comes out of this
> will also speed up the whole proces so the next vission
> crystalize process is even faster, you should notice
> this converging over time to a very clar and precice
> vision and roadmap"*

For the loop to be **observably convergent**, each turn's
residue must be traceable: what research went in, what
vision edit landed, what backlog grew, what factory
candidates surfaced. The ledger is that trace.

The **convergence metric** is measured from this ledger:
track the per-turn output size (vision edits + backlog
rows + factory candidates). If the curve trends down,
the loop is converging. Trends up or oscillates = escalate
(either early-expansion or diverging).

## Format

Each turn is one entry with six fields:

1. **Turn** — numeric, monotone.
2. **When** — absolute local date.
3. **Target region** — the VISION.md scope the turn addressed.
4. **Research input** — references to the research that seeded
   the turn (external links, prior art, internal memories,
   other artifacts).
5. **Crystallization outputs** — the residue of this turn:
   - Vision edits (paths + refinement / new-facet / direction-shift
     classification)
   - Backlog rows drafted (IDs or row titles)
   - Factory candidates proposed (skill-creator candidates,
     tooling gaps, doc-artifact gaps)
   - HUMAN-BACKLOG escalations (direction-shifts only)
6. **Output size** — a count for the convergence metric:
   `<vision-edits> + <backlog-rows> + <factory-candidates>
   + <escalations>`.

## Turns

---

### Turn 1 — 2026-04-22 — Wire-protocol naming gap (first manual pass)

**Target region:** `docs/VISION.md` §First-pass confidence +
gaps (post v2 edits), "Remaining gaps the product-visionary
walks on first audit (after round 33)", gap 3: *"Naming
within the wire-protocol layer — Zeta as 'a PostgreSQL' (we
emulate) vs 'behind Postgres-shaped endpoint' (we translate
on ingress/egress)?"*

**Research input:**

- Internal: `docs/VISION.md` §Product 1 — Zeta the database,
  "Pluggable wire-protocol layer" subsection (lines 408-439)
  already establishes three wire-protocol plugins (PostgreSQL
  / MySQL / Zeta-native), with Zeta's identity distinct from
  any single protocol.
- Internal: `memory/user_curiosity_and_honesty.md` — honesty
  discipline: do not mislead users about semantic
  compatibility.
- Internal: `memory/project_zeta_as_retractable_contract_ledger.md`
  — Zeta is retraction-native, not PostgreSQL-semantics.
- External (not queried this turn; light-touch first pass
  per practices-not-ceremony): no external research invoked;
  the gap resolves from internal consistency alone.

**Crystallization outputs:**

- **Vision edit (refinement):** `docs/VISION.md` gap 3 line
  rewritten to resolve the binary. The answer is neither
  "a PostgreSQL" nor "behind Postgres-shaped endpoint" —
  it is **"Zeta with a PostgreSQL wire-protocol plugin"**
  per the already-established plugin architecture. The
  plugin translates; Zeta's identity is not PostgreSQL.
  This is a refinement (not direction-shift): the answer
  is already implicit in the vision's main body; the gap
  was residual phrasing in the appendix.
- **Backlog rows drafted:** none this turn. The wire-
  protocol-plugin work is already captured at
  `docs/BACKLOG.md` "Pluggable wire-protocol layer"
  (v1-or-early-post-v1).
- **Factory candidates proposed:** none this turn.
- **HUMAN-BACKLOG escalations:** none. Gap resolves via
  internal consistency; no Aaron sign-off required.

**Output size:** **1** (1 vision edit + 0 backlog + 0
factory + 0 escalations).

**Convergence note:** baseline datum. One edit for a
narrow gap is the smallest meaningful output; future turns
on denser regions should produce larger outputs early and
(per Aaron's convergence claim) smaller outputs over time.
Track the curve.

**Process note — what this turn taught about the skills:**

- `research-vision` — was not needed for this gap; internal
  consistency sufficed. **Lesson:** not every turn requires
  external research; the skill should support "internal-
  consistency check only" as a lightweight mode.
- `crystallize-vision` — wrote the VISION.md edit directly
  (the reframed cartographer scope). Worked cleanly for a
  refinement; direction-shifts would surface as
  HUMAN-BACKLOG rows instead.
- `backlog-kanban-fill` — not invoked this turn; no new
  rows needed. **Lesson:** crystallize + backlog-fill are
  independent; not every crystallize triggers backlog work.
- **Cartographer observation:** Gap 3 was a map-accuracy
  issue, not a territory-expansion issue. The cartographer
  turn-type is different for map-cleanup vs map-expansion;
  both are valid but should be labeled in future ledger
  entries.

---

<!-- Append new turns below this line, newest-first order. -->

### Turn 4 — 2026-04-22 — Multi-node control-plane TBD (calibration-finding validation)

**Target region:** `docs/VISION.md` §What the DB eventually
covers (line 355-357) + §Post-v1 exploration (line 459-462).
Both bullets carried the same "control-plane shape
TBD/open" phrasing referencing NATS / gRPC / Arrow Flight /
bespoke as an undecided matrix.

Picked per Turn 3's calibration finding: the convergence
metric measures **residual-gap density**, not section-text
density. Turn 3 recommended targeting sections "known to
carry pending references" to validate. A grep of VISION.md
for `research-pending|TBD|to be decided|TODO` surfaced
exactly one pending-reference phrase (line 355 "shape
TBD"), with a parallel instance at line 459 ("control-plane
shape open"). This is the calibration test: a section
genuinely known to carry pending references.

**Research input:**

- Internal (primary): `docs/ROADMAP.md` P1 (line 73) —
  **Arrow Flight** as the multi-node wire protocol, already
  committed for the 2-week horizon.
- Internal: `docs/ROADMAP.md` P2 (line 87-88) — **Raft** as
  the first-consensus for the multi-node replicated log;
  **CAS-Paxos** with state-transition-function consensus
  as the research-grade alternative.
- Internal: `docs/ARCHITECTURE.md` §The shape the future
  takes (line 186-191) — explicit "Distribution via Arrow
  Flight" + "Consensus where durability requires it. Raft
  ... is P2. CAS-Paxos ... is the research-grade
  alternative." Fully resolved architectural stance.
- Internal: `docs/WONT-DO.md` line 332 — "Zeta is already
  committed to Arrow Flight (P1) for multi-node delta
  [exchange/transport]". Commitment language.
- External (not queried this turn; same lightweight mode
  as turns 1-3 — resolves via internal consistency).

**Crystallization outputs:**

- **Vision edit 1 (refinement):** Line 355-357 rewritten
  from "shape TBD — NATS vs gRPC vs Arrow Flight vs
  bespoke" to the resolved stance citing ROADMAP P1 (Arrow
  Flight wire) + P2 (Raft first, CAS-Paxos research
  variant) + ARCHITECTURE cross-reference + sharding
  mechanism (consistent hashing + power-of-two-choices).
  Preserves info-theoretic-sharder as a separate research
  track. Refinement, not direction-shift.
- **Vision edit 2 (refinement):** Line 459-462 rewritten
  to acknowledge wire + first-consensus are already chosen
  (cross-reference to the now-updated §What the DB
  eventually covers above) and narrow the Post-v1
  exploration scope to the **research-grade variants**
  (CAS-Paxos, consensus-family playground, info-theoretic
  sharder). Removes the duplicate "shape open" phrasing;
  keeps the "firmly IN scope" commitment.
- **Backlog rows drafted:** none this turn. Both the Arrow
  Flight P1 work and the Raft P2 work are already on
  ROADMAP; no new backlog items generated.
- **Factory candidates proposed:** none new this turn. The
  Turn-3 observation (body-ahead-of-map pattern; candidate
  residual-gap scan audit) is now **confirmed across four
  turns** — all four crystallizations were map-cleanup via
  internal consistency, zero external research invoked.
  **Promoting the Turn-3 candidate to a BACKLOG row
  (separate commit):** one-shot residual-gap scan across
  VISION.md (and subsequently `docs/ROADMAP.md`,
  `docs/ARCHITECTURE.md`, other factory-state docs) to
  baseline pending-reference phrases, cross-check against
  the ADR / design-doc tree, and surface body-ahead-of-map
  drift for crystallization. See separate follow-up.
- **HUMAN-BACKLOG escalations:** none. Both refinements
  align with landed ROADMAP + ARCHITECTURE + WONT-DO
  stances; no Aaron sign-off required.

**Output size:** **2** (2 vision edits + 0 backlog + 0
factory + 0 escalations). Note: the two edits are on the
*same semantic topic* (the multi-node control plane TBD),
just at two parallel file locations. Counting convention:
each site-edit is one unit, per the ledger's format.
Same-topic multi-site edits are a sub-pattern worth
tracking if it recurs.

**Convergence note — calibration finding validated:**
Turn 1 = 1 (sparse, no pending-refs). Turn 2 = 2 (sparse,
no pending-refs). Turn 3 = 2 (dense, 0 pending-refs in
§Factory north star). Turn 4 = 2 (targeted pending-ref;
1 phrase → 2 site edits). The calibration finding holds:
**pending-reference phrases are a reliable proxy for
residual-gap density**, and the output size scales with
the number of phrases, not the number of words in the
section. Turn 4's output of 2 came from 1 phrase
appearing at 2 sites; Turn 3's output of 2 came from 2
phrases (cross-platform runtime "research-pending" +
self-directed loop pre-cartographer vocabulary); Turn 2's
output of 2 came from 2 gap-lines; Turn 1's output of 1
came from 1 gap-line.

**Honest convergence reading after n=4:** the loop is
**not** yet demonstrating convergence in the
output-size-trends-down sense. It is demonstrating
**consistent residual-gap resolution** — each turn closes
exactly the pending references it targets. This is a
different (but valid) reading of "convergence" than the
initial Aaron framing: not "outputs shrink over time" but
"residual-gap count in the whole document shrinks over
time, and per-turn outputs track the pending-ref count of
the region targeted." Aaron's original claim
(`memory/feedback_kanban_factory_metaphor_blade_crystallize_materia_pipeline.md`)
needs this nuance. **Candidate ADR / memory refinement:**
log the two-reading distinction for the convergence-claim
vocabulary. Not filing this round — noting for a future
meta-pass.

**Process note — what this turn taught about the skills:**

- **Body-ahead-of-map confirmed as the dominant pattern**
  at n=4. All four turns resolved via internal consistency
  with zero external research. Strong signal for the
  `research-vision` skill rule: "FIRST pass is internal-
  consistency across body + ADRs + ROADMAP + ARCHITECTURE
  + WONT-DO + design docs; external research escalated
  only when **all** internal sources are silent."
- **Same-topic multi-site edits** is a new sub-pattern
  (turn 4 first instance). Ledger format counts each site
  as one unit, which is correct for "work done" but
  arguably over-counts for "gaps closed" (one gap, two
  sites). Future ledger entries should note this when it
  recurs.
- **The residual-gap scan factory-improvement is now
  promoted** from "logged, not filed" (turn 3) to
  "filing to BACKLOG" (turn 4). Rule: factory candidates
  get **two turns of evidence** before promotion. Turn 3
  observed; Turn 4 confirmed; now it's a durable signal.

---

### Turn 3 — 2026-04-22 — §Factory north star (denser-region map-cleanup, first convergence-test datum)

**Target region:** `docs/VISION.md` §Factory north star
(lines 648-681, seven bullets). Picked per Turn 2's process
note recommending a denser region to test the per-region
convergence claim like-to-like.

**Research input:**

- Internal (primary): `docs/DECISIONS/2026-04-20-tools-scripting-language.md`
  — ADR from round 43 resolving the Bun/Deno/Python/.NET
  question to **bun + TypeScript** (medium confidence) with
  UI-TS amortization as the decision-lifting input. Round 43
  landed this ADR but VISION.md §Factory north star still
  read "research-pending" — classic case of body-ahead-of-
  map stale.
- Internal: `docs/research/crystallization-loop.md` — the
  cartographer loop design doc landed in round 44, earlier
  this session. Bullet 7's pre-cartographer vocabulary was
  stale against the now-documented loop shape.
- Internal: `memory/feedback_crystallize_everything_lossless_compression_except_memory.md`
  — diamond-noun addition, same session.
- External (not queried this turn; both edits resolve via
  internal consistency — same lightweight mode as turns 1-2).

**Crystallization outputs:**

- **Vision edit 1 (refinement):** Bullet 2 rewritten to
  cite the 2026-04-20 scripting-language ADR directly,
  replacing "research-pending" with the bun+TypeScript
  decision + the medium-confidence qualifier + the UI-TS
  amortization reason + the pre-setup / engine-adjacent
  carve-outs. Map catches up with the body. Refinement,
  not direction-shift.
- **Vision edit 2 (refinement):** Bullet 7 rewritten to
  name the loop as the cartographer crystallization loop,
  cite `crystallization-loop.md`, and add the diamond-
  per-turn language. Preserves the old loop-shape
  intuition (research → backlog → round work → merge) but
  binds it to the now-documented artefact. Refinement,
  not direction-shift.
- **Backlog rows drafted:** none this turn. The scripting
  ADR is already landed; the cartographer loop design doc
  is already landed. Both edits are catch-up on the map,
  not new work.
- **Factory candidates proposed:** none this turn. One
  observation logged for future consideration: the body-
  ahead-of-map pattern (turns 1, 2, 3 all exhibited it)
  may motivate a round-close audit that greps VISION.md
  for forward-looking "research-pending" / "TBD" / "to be
  decided" phrases and cross-checks them against the ADR
  directory. Noting here rather than filing; if it
  surfaces again in turn 4, promote to BACKLOG.
- **HUMAN-BACKLOG escalations:** none. Both refinements
  consistent with already-landed ADRs and design docs; no
  Aaron sign-off required.

**Output size:** **2** (2 vision edits + 0 backlog + 0
factory + 0 escalations).

**Convergence note — first like-to-like cross-region
datum:** Turn 1 = 1 (sparse appendix). Turn 2 = 2 (same
sparse appendix). Turn 3 = 2 (denser-region §Factory north
star). The naive density hypothesis ("denser regions produce
larger turn-outputs early") **did not predict turn 3's size
accurately** — I expected 3-4 edits from a 7-bullet section;
got 2 because five of seven bullets were already well-
crystallized in prior rounds. Honest reading: the
convergence claim measures **residual-gap density**, not
**section-text density**. A section can be long and dense
yet have low residual crystallization debt if prior rounds
already swept it. This is a **calibration-of-the-metric**
finding, not a convergence reading.

What would have made turn 3 bigger: if §Factory north star
had more un-landed ADRs / design-docs referenced as
"pending", each would crystallize into one bullet-edit.
The fact that it had only two such referents is a
**positive signal about the factory's documentation
hygiene**, not a convergence signal. Future turns should
target sections known to carry pending references, or
explicitly label the turn type as "no-pending-referents"
when the residual is genuinely zero.

**Process note — what this turn taught about the skills:**

- **Body-ahead-of-map is the dominant residual pattern
  across turns 1-3.** All three turns resolved via internal
  consistency (body + ADRs + design docs) with zero external
  research invoked. Candidate `research-vision` skill-body
  rule refinement: "the first pass is always an internal-
  consistency pass; escalate to external research only when
  the body + ADR tree + design docs are all silent." This
  is a stronger version of turn 2's candidate rule, now
  confirmed across three turns.
- **Convergence is not vision-edit-count.** The metric
  needs refinement: convergence-per-region is not
  measurable with 2-3 edits; the signal is "residual gaps
  per region", and that requires a region-by-region
  baseline scan *before* crystallization, not just after.
  Candidate factory improvement: a one-shot "residual-gap
  scan" that tallies pending-reference phrases per
  VISION.md section once, establishes a baseline, and
  measures burn-down over turns. **Not filing a BACKLOG
  row** because it's turn-3-only evidence — re-evaluate if
  turn 4's signal confirms.
- **Map-cleanup turn-type naming is stabilizing.** Turns 1,
  2, 3 are all map-cleanup (no territory expansion). A
  future turn targeting territory-expansion (e.g., a new
  vision section, or a direction-shift that requires Aaron
  sign-off) would be the first non-map-cleanup turn and
  would exercise the HUMAN-BACKLOG escalation path.

---

### Turn 2 — 2026-04-22 — Remaining gaps 1 + 2 (map-cleanup, batched)

**Target region:** `docs/VISION.md` §First-pass confidence +
gaps, remaining gaps 1 and 2:

1. *"Wire protocol server: v1 or slip to early post-v1?
   Scope impact is significant."*
2. *"Own admin UI: F# + web (Fable? SAFE Stack? Blazor?) or
   native GUI (Avalonia?). Far-future but the choice signals
   the polyglot story."*

Both are map-cleanup (same turn-type as turn 1, different
region of the same appendix section).

**Research input:**

- Internal: `docs/VISION.md` §v1.0 subset, "Pluggable
  wire-protocol layer (v1-or-early-post-v1)" (lines 408-439)
  — the body already labels the scope as indeterminate
  ("may slip from v1 to early post-v1 depending on design
  round outcome").
- Internal: `docs/VISION.md` "F# primary, polyglot over
  time" (line 827) — the stated polyglot stance.
- Internal: `docs/VISION.md` line 869-872 — "Admin UI:
  Zeta will build its own eventually (long-term). In the
  meantime, speak the PostgreSQL wire protocol so
  existing admin tools connect." — the in-the-meantime
  answer.
- External (not queried this turn; both gaps resolve from
  internal consistency alone — same lightweight mode as
  turn 1).

**Crystallization outputs:**

- **Vision edit 1 (refinement):** Gap 1 line rewritten to
  defer to the wire-protocol design round. The body already
  labels this v1-or-early-post-v1; the appendix gap was
  asking a binary the body had already marked as
  honest-indeterminacy. Refinement, not direction-shift.
- **Vision edit 2 (refinement):** Gap 2 line rewritten to
  mark the tech-pick as premature — the polyglot-over-time
  stance + long-term status means the choice gets made at
  the admin-UI design round, not speculatively today. Gap
  narrowed from "pick one of 4 technologies" to "far-future;
  design-round picks when it fires." Refinement, not
  direction-shift.
- **Backlog rows drafted:** none this turn. The wire-
  protocol-plugin work is already captured under
  `docs/BACKLOG.md` "Pluggable wire-protocol layer"; the
  admin-UI design round is far-future per existing body.
- **Factory candidates proposed:** none this turn. Both
  resolutions reference design-rounds that exist as named
  abstractions; no new skill or tooling is implied.
- **HUMAN-BACKLOG escalations:** none. Both gaps resolve via
  internal consistency; neither requires Aaron sign-off.
  The *design-round outcomes themselves* will need Aaron
  input when they fire, but the gap-as-phrased in the
  appendix closes without escalation.

**Output size:** **2** (2 vision edits + 0 backlog + 0
factory + 0 escalations).

**Convergence note:** Turn 1 = 1; turn 2 = 2. Two data
points is not yet a curve — need turn 3+ to trend.
Honest observation: both turns were map-cleanup on the
*same appendix section*; this is a sparse region and the
outputs are small as expected. Denser regions (e.g.
§Factory north star, §v1.0 subset of the factory) would
produce larger turn-outputs early. The convergence claim
is measured *per-region*, not globally — comparing turn 1
to turn 2 is like-to-like (both §First-pass gaps cleanup).

**Process note — what this turn taught about the skills:**

- Batching two adjacent gaps into one turn is legitimate
  when both target the same section and both resolve via
  internal consistency. Single-gap turns are valid but
  inefficient for map-cleanup passes.
- Both gaps exposed the same pattern: the **body already
  resolved them**; the appendix gap was residual phrasing.
  This is a repeatable signal — **before doing external
  research, re-read the vision body for the answer**.
  Turn 1 taught this; turn 2 confirmed. Candidate
  `research-vision` skill-body rule: "internal-consistency
  pass FIRST; only escalate to external research when the
  body is silent."
- `§First-pass confidence + gaps` appendix is now fully
  resolved at the gap-level (3/3 original gaps closed).
  The appendix can be retired or converted into a
  "resolved-gaps log" in a future turn. Candidate
  turn 3 target: §Factory north star or §v1.0 subset of
  the factory — denser regions that will test the
  convergence-per-region claim.

---
