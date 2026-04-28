# Trajectory — Data Vault Integration

## Scope

Data Vault 2.0 — Lars Rönnbäck-school + Dan Linstedt-school
modeling discipline (hub / link / satellite primitives plus
the broader DV2 toolkit: business vault, point-in-time tables,
bridge tables, raw vault vs business vault, hash keys, multi-active
satellites, effectivity satellites, etc.). This is a **long
long process** (Aaron 2026-04-28) — Data Vault language and
ideas integration into Zeta is multi-year scale, not multi-week.
Bar: Zeta speaks fluent DV2 vocabulary internally; DV2 patterns
inform retraction-native composition where they map cleanly;
mismatches are documented (DV2 is append-only-with-end-dates
semantics; Zeta is retraction-native — the gap is research-grade).

## Cadence

- **Per-concept**: when a DV2 concept lands in factory vocabulary
  (e.g. "this is a satellite," "this is a hub-link-hub bridge"),
  it gets a glossary entry + worked example.
- **Per-paradigm-mapping**: when a DV2 pattern maps cleanly to
  retraction-native composition, the mapping gets formalized.
- **Quarterly research**: literature review (Linstedt's books,
  Rönnbäck's papers, conference talks, vendor implementations).
- **Per-paper**: when paper-grade write-ups are in flight, DV2
  mapping is cited.

## Current state (2026-04-28)

- **Existing Zeta DV2 surface**:
  - `data-vault-expert` skill (`.claude/skills/data-vault-expert/SKILL.md`)
    — full hub/link/satellite + raw-vault/business-vault
  - `anchor-modeling-expert` skill — Lars Rönnbäck's Anchor
    Modeling (Stockholm University 2007)
  - `relational-database-expert`, `dimensional-modeling-expert`
    (Kimball-school sibling), `corporate-information-factory-expert`
    (Inmon-school sibling) — surrounding-school context
  - `master-data-management-expert` — golden-record adjacent
  - **Existing research absorb**:
    `docs/research/memory-optimization-under-identity-preservation-2026-04-26.md`
    — applied DV2 patterns (satellite splits + hot/cold data
    separation) to **memory hygiene** trajectory; demonstrates
    that DV2 vocabulary already carries weight in factory
    substrate (Aaron 2026-04-28: "you already have data vault
    2.0 docs from previous research; you loved the sat splits
    and hot and cold data separation"). The memory-hygiene
    application is a working example that DV2 patterns transfer
    to non-relational contexts when the underlying split is
    semantic, not just storage.
- **DV2 vs retraction-native paradigm gap**:
  - DV2: append-only with end-dating; load-date + record-source
    + load-end-date discipline; deletes are *logical* (end-dating)
    not *physical*
  - Zeta: retraction-native via Z-set algebra; deletes are
    first-class via `D` operator; retractions are mathematical
    inverses, not metadata
  - Mapping research: how do DV2 satellites translate to Z-set
    columnar storage with retraction operators? (open question)
- **Vocabulary penetration**: DV2 terminology rare in current
  factory substrate; not yet deep-integrated
- Aaron 2026-04-28: explicitly named this as **long long
  process** — months-to-years scale, not weeks

## Target state

- Zeta's design speaks fluent DV2 internally — hub / link /
  satellite primitives are first-class vocabulary in
  appropriate contexts.
- The DV2 ↔ retraction-native paradigm mapping is documented
  rigorously (where patterns translate; where they don't;
  where Zeta's retraction-native approach is strictly
  better / worse / orthogonal).
- DV2 patterns inform Zeta's modeling decisions where they
  apply (e.g. raw-vault ↔ business-vault separation as a
  design pattern).
- `docs/GLOSSARY.md` has every load-bearing DV2 term anchored.
- Possible Zeta-side Data Vault paper or implementation guide
  (long-horizon).

## What's left

In leverage order:

1. **DV2 ↔ retraction-native paradigm mapping document** —
   research-grade artifact comparing the two approaches; high
   leverage because it clarifies Zeta's positioning relative
   to DV2.
2. **Vocabulary integration** — DV2 terms surfacing in
   `docs/GLOSSARY.md` + cross-referenced from glossary anchors
   in code/specs.
3. **Worked-example collection** — show DV2 hub/link/satellite
   modelled as Zeta operator algebra; concrete case studies.
4. **Literature absorb backlog** — Linstedt's "Building a
   Scalable Data Warehouse with Data Vault 2.0" (2015), more
   recent DV2.5 / DV3 evolution, Snowflake/Databricks DV
   implementations.
5. **`anchor-modeling-expert` ↔ `data-vault-expert` skill
   relationship** — Anchor Modeling and DV2 share roots; the
   distinction warrants explicit documentation.
6. **DV2-aware `query-planner`** — the query-optimizer-expert's
   planner cost-model may benefit from DV2 join-pattern awareness.

## Recent activity + forecast

- 2026-04-28: trajectory file landed (this entry).
- (Substantive DV2 integration is pre-existing in skill files;
  factory-substrate-level integration is what this trajectory
  tracks going forward.)

**Forecast (next 1-3 months):**

- Initial paradigm-mapping research-doc draft.
- Vocabulary entries in glossary.
- 1-2 worked examples demonstrating DV2 modeling under Zeta's
  retraction-native algebra.

**Forecast (long-horizon, Aaron 2026-04-28 "long long process"):**

- DV2 vocabulary becomes routine in factory substrate.
- Paper-grade comparison: "Data Vault 2.0 under retraction-
  native composition."
- Possible canonical reference implementation showing DV2 →
  Zeta translation.
- Multi-year integration arc; this trajectory is the long-form
  tracker for that arc.

## Pointers

- Skill: `.claude/skills/data-vault-expert/SKILL.md`
- Skill: `.claude/skills/anchor-modeling-expert/SKILL.md`
- Skill: `.claude/skills/dimensional-modeling-expert/SKILL.md` (Kimball sibling)
- Skill: `.claude/skills/corporate-information-factory-expert/SKILL.md` (Inmon sibling)
- Skill: `.claude/skills/relational-database-expert/SKILL.md`
- Skill: `.claude/skills/master-data-management-expert/SKILL.md`
- Skill: `.claude/skills/data-governance-expert/SKILL.md`
- Cross-trajectory: dbsp-operator-algebra.md (Zeta's mathematical
  core that DV2 maps onto)

## Research / news cadence

External tracking required — this is an active-tracking
trajectory at long-horizon scale.

| Source | What to watch | Cadence |
|---|---|---|
| Dan Linstedt's blog + DV2 community | DV2.5 / DV3 evolution; methodology updates | Quarterly |
| Lars Rönnbäck's Anchor Modeling site + papers | Anchor Modeling evolution (DV sibling school) | Quarterly |
| TDAN.com + Data Vault Alliance publications | Industry-side DV2 case studies + patterns | Monthly (light) |
| Snowflake / Databricks / Teradata DV implementations | Vendor-side DV2 tooling evolution | Quarterly |
| dbt + Coalesce framework DV macros | Tool-side DV2 patterns | Quarterly |
| Academic DW / data-modeling research (DBLP) | Theoretical DV2 work, comparison studies | Annual |

Findings capture: DV2 methodology updates → glossary entry +
trajectory state refresh; vendor implementations → tech-radar
row candidate; comparison papers → research-doc absorb under
`docs/research/`.
