# dbt deep integration for Zeta — research (first-draft cartographer pass)

**Date:** 2026-04-22
**Trigger:** Aaron 2026-04-22 tick-fire interrupt: *"add to
backlog research dbt deep integration for Zeta"*.
**Author:** opus-4-7 / session round-44 (post-compaction)
**Status:** map-before-walk. First-draft research — no code
landing, no adapter skeleton this round. Feeds BACKLOG row
"dbt deep integration — research row" (questions a-f).
**Scope-tag:** Zeta-specific (the question is specifically
about Zeta's retraction-native DBSP rewiring dbt semantics;
the cartographic method is factory-universal but the findings
are not portable).

## 0. Terminology check first

Before the map gets drawn, the overlap between dbt's vocabulary
and Zeta's has to be disambiguated — both use "delta", "model",
"materialization" in non-identical ways, and collapsing the
senses is the first silent failure.

| Term | Zeta meaning | dbt meaning | Distinction |
|---|---|---|---|
| **delta** | Z-set delta: a multiset of (row, weight, timestamp) triples where negative weight = retraction. Native primitive. | A diff between two model runs, conceptually row-level insert/update/delete. Often approximated via merge keys. | Zeta's delta is algebraic + retraction-native; dbt's is procedural + retraction-by-overwrite. |
| **model** | Not a first-class term; pipelines / operators are the primitives. | A SQL file defining a transformation, materialized into the warehouse. | dbt-model ≈ a named operator-graph node in Zeta; the surface is different. |
| **materialization** | A query is always materialized; retraction-native deltas *are* the materialization. | `{view, table, incremental, ephemeral}` — a strategy switch for how the SQL lands. | dbt's strategies collapse into *one* strategy in Zeta (incremental via deltas); ephemeral maps to fused operators. |
| **incremental** | Default. Every query is incremental over deltas because the engine is DBSP. | Opt-in strategy; requires merge keys + `{{ is_incremental() }}` guards; bug-prone on late-arriving data. | This is the **load-bearing subsumption claim** (question a). |
| **snapshot** | Bitemporal-native: valid-time + transaction-time are query axes, not columns to maintain. | Manual SCD2 capture via `valid_from`/`valid_to` columns owned by the snapshot model. | Question (b): bitemporal subsumes SCD2 — SCD2 becomes a *view*, not a *materialization*. |
| **test** | Invariant (skill.yaml + Liquid-`F#` contract surface). | `unique`, `not_null`, `relationships`, `accepted_values`, custom singular. | Question (c): dbt tests map to Zeta invariants, but the binding surface matters. |
| **manifest / state** | Operator-algebra lineage is native — every node knows its inputs + the operator fused into it. | `manifest.json` + `run_results.json` as dbt's DAG snapshot and run state. | Question (d): does dbt's state layer become redundant, or does its *UX* (`state:modified+`) persist as a query over Zeta's lineage? |
| **adapter** | n/a — Zeta is a runtime, not a dbt plug-in yet. | `dbt-core`'s Python contract: `get_relation`, `execute`, `get_columns_in_relation`, `get_changes`. | Question (e): shallow-first, `dbt-zeta` adapter package. |
| **Semantic Layer / metric** | Not yet — belongs to the eventual query-surface design. | MetricFlow (post-Transform acquisition 2023) — metrics as first-class compiled-to-SQL. | Question (f): orthogonal; separate research row. |

The terminology matrix is the load-bearing part of this
document. Every subsequent claim reduces to "dbt-X maps to
Zeta-Y because the delta vocabulary lines up like this".

## 1. What Aaron is asking for

dbt is the industry-standard transformation orchestrator.
*Shallow* integration (Zeta-as-warehouse that dbt-core talks
to via an adapter) is the incumbency move — earn the install
before earning the argument. *Deep* integration is the
research question: **does Zeta's DBSP runtime make dbt's
layered architecture redundant, partially-redundant, or
productively-extended**? The answer per layer is different,
and honesty here matters more than pitch-ability: over-
claiming subsumption invites reviewer rejection of the shallow
adapter before the deep claims can be measured.

## 2. Layer-by-layer subsumption map

### 2.1 Incremental materialization (question a) — **claim: full subsumption**

dbt's `incremental` materialization asks the model author to
specify a unique key (or a set) and wrap the model body in
`{{ if is_incremental() }}` guards. The dbt engine then
computes a SQL MERGE or INSERT of only the new rows. **Every
class of late-arriving-data bug known to dbt practitioners
reduces to "the merge strategy + the unique key didn't cover
the late-arriving row correctly"**.

A Z-set delta is the shape dbt-incremental approximates.
Retraction-native means late-arriving data is an *insert with
old-negative + new-positive weight pair*, not a special case.
The merge-key machinery disappears because the engine
*already knows* which rows are deltas — they came in as
deltas, not as new rows to MERGE against old ones.

**What this buys:**

- `ref()` returns a Z-set (or a Z-set view) instead of a
  relation. `{{ is_incremental() }}` guards become unnecessary
  — every ref is always incremental.
- Late-arriving data is a correctness property of the engine,
  not a pattern authors have to hand-code.
- The `full-refresh` escape hatch dbt authors reach for when
  incremental goes wrong is replaced by "retract everything
  and re-insert" — which is already a first-class Z-set op.

**What this costs:**

- dbt model authors have to stop reasoning in "merge keys +
  guards" and start reasoning in "this is a Z-set transform".
  That's a semantic migration, not a syntactic one.
- The `{{ ref() }}` templating survives as surface syntax but
  its return type changes. SQL-only authors won't see the
  change; authors who introspect the relation shape will.

**Claim strength:** this is the **strongest subsumption
claim** in the document — the incremental-materialization
layer isn't just extended, it's *replaced by a default that
is always correct*. The paper for this would be "incremental
by construction: replacing dbt's incremental materialization
with retraction-native deltas."

### 2.2 Snapshots / SCD2 (question b) — **claim: bitemporal subsumes materialization**

dbt snapshots handle slowly-changing dimensions by manually
capturing a row's history: when a tracked column changes, the
snapshot model appends a new row with `valid_from = now()` and
sets the prior row's `valid_to = now()`. The author owns the
columns `dbt_scd_id`, `dbt_updated_at`, `dbt_valid_from`,
`dbt_valid_to` explicitly.

Zeta's bitemporal+time-travel surface (BACKLOG row below this
one) makes SCD2 a **query**, not a **materialization**:
`SELECT … AS OF TIMESTAMP '2025-01-01'` (or the F#-DSL
equivalent) reads the same base relation at the historical
transaction-time. No duplicate rows. No author-owned
`valid_from`/`valid_to` columns. No drift between the
snapshot and the live table.

**What this buys:**

- Storage: one copy of the data, bitemporal-indexed, instead
  of a snapshot table growing linearly with change-event
  count.
- Query UX: time-travel query syntax is cleaner than joining
  against `valid_from`/`valid_to` columns.
- Correctness: SCD2 snapshots can drift from the source if
  the snapshot run misses a change window; bitemporal queries
  cannot.

**What this costs:**

- Bitemporal engines are notoriously hard to implement well
  (see Snodgrass "Developing Time-Oriented Database
  Applications in SQL", 2000). Zeta has to actually deliver
  this before the claim lands.
- dbt authors using snapshots for downstream BI consumption
  expect the SCD2-shaped relation. A view that *projects* the
  bitemporal relation back to SCD2 shape is needed for
  backward compatibility.

**Claim strength:** medium-strong. Depends on Zeta shipping
the bitemporal surface (BACKLOG row, P2, v2+). Until then,
this is a paper claim, not a migration path.

### 2.3 dbt tests (question c) — **claim: invariant-programming is strictly more expressive**

dbt's built-in tests (`unique`, `not_null`, `relationships`,
`accepted_values`) and custom singular/generic tests are SQL
predicates that run after a model materializes. They catch
violations *in the materialized result*, not *at
transformation time*. This is a correctness-after-the-fact
shape: the bad row is already in the table when the test
fires; the alert is a rollback trigger, not a shield.

Zeta's invariant-programming surface (skill.yaml + Liquid-`F#`
contracts, per `user_invariant_based_programming_in_head`
memory) is evaluated at operator-boundary. A violation of a
relationship invariant is caught before the delta lands in
the downstream Z-set. This is a type-system-grade guarantee,
not a test-after-materialize one.

**Mapping table:**

| dbt test | Zeta invariant |
|---|---|
| `unique(col)` | Uniqueness witness on the Z-set under projection to `col`. |
| `not_null(col)` | Column-level invariant; refinement type in Liquid-`F#`. |
| `relationships(from, to)` | Foreign-key witness; cross-Z-set invariant. Cheaper in DBSP because the delta tells you which refs to recheck. |
| `accepted_values(col, values)` | Refinement type; compile-time-checkable in Liquid-`F#` if the value set is closed. |
| Custom singular | Liquid-`F#` predicate over the Z-set + contract-level assertion. |

**What this buys:**

- Shift-left on correctness: violations surface before the
  transformation lands, not after.
- Cheaper rechecks via delta-awareness: if the delta doesn't
  touch a column, the invariant on that column doesn't need
  re-evaluation.
- Compile-time guarantees for the subset that reduces to
  refinement types.

**What this costs:**

- Liquid-`F#` is pre-v1; the contract surface isn't shippable
  yet. The mapping is aspirational until skill.yaml + Liquid-
  `F#` bind.
- dbt's test ecosystem (dbt-expectations, dbt-utils.test_*)
  is huge. Porting or proxying these packages is a non-trivial
  compatibility cost.

**Claim strength:** medium. Depends on Zeta's contract surface
landing. The *mapping* is clean; the *shipping* is the gap.

### 2.4 Manifest / state (question d) — **claim: operator-algebra lineage subsumes; UX persists as a view**

dbt's `manifest.json` + `run_results.json` + `state:modified+`
selection is dbt's own metadata layer: the DAG, the last-run
state, the diff between runs. It's how `dbt build --select
state:modified+` works.

Zeta has operator-algebra lineage natively. Every node in the
operator graph knows its inputs, its operator, its fused
neighbors. This is *more* detailed than dbt's manifest: dbt
tracks model-level dependencies; Zeta's operator graph tracks
operator-level. The lineage layer is strictly more expressive.

**The UX question is orthogonal.** `dbt build --select
state:modified+` is a *query* over the manifest + git diff.
It can run over Zeta's lineage too — the selection predicate
("operators whose upstream Z-set changed") just reads against
a more detailed graph. The UX survives; the storage layer
underneath disappears.

**What this buys:**

- One lineage source-of-truth (the operator graph), not two
  (graph + manifest.json).
- Operator-level granularity for selection, not model-level.

**What this costs:**

- dbt Cloud's lineage viewer consumes `manifest.json` shape.
  An adapter that *emits* `manifest.json` compatible output
  from Zeta's operator graph is the compatibility bridge —
  which is Extra Work on top of the algebra-native approach.

**Claim strength:** strong on subsumption, weak on migration
ergonomics. The Zeta operator graph is more expressive; the
dbt-Cloud ecosystem has a concrete shape it expects.

### 2.5 dbt-core adapter contract (question e) — **the shallow goal**

This is the incumbency move. dbt-core exposes a Python adapter
contract: implement `get_relation`, `execute`,
`get_columns_in_relation`, `get_changes`, and a handful of
materialization macros, and your engine becomes a first-class
dbt target.

A `dbt-zeta` package would:

1. Implement the adapter contract against Zeta's query API.
2. Expose Z-set deltas via `get_changes` — this is the one
   adapter hook where Zeta can advertise its native
   incrementality without asking dbt authors to think in
   Z-sets. The adapter translates "dbt wants the delta since
   last run" into "here is the Z-set delta", and the
   materialization-incremental path gets correctness-for-free
   downstream.
3. Ship a materialization override: `materialized='view'` and
   `materialized='table'` stay compatible; `materialized=
   'incremental'` becomes a no-op because the engine is
   always incremental — the guard wrappers compile to
   identity.

**Why shallow-first:** adapter packaging earns incumbency in
the dbt ecosystem *before* Zeta has to argue the deeper
semantic claims. Running under dbt is a credibility marker;
arguing that dbt doesn't *need* most of itself under Zeta is
a move you make *after* you have the install base.

### 2.6 Semantic Layer / MetricFlow (question f) — **separate concern**

MetricFlow (post-Transform acquisition, 2023) is a metrics
abstraction — metrics as first-class objects compiled down to
SQL at query time, with dimensions and filters declared at
the metric level.

This sits *above* the transformation layer. The question of
whether Zeta's query surface subsumes MetricFlow is orthogonal
to the transformation-layer subsumption claims above. It
belongs to a later research row once:

1. Zeta's query surface design has stabilized.
2. The regular-database-façade vs event-sourcing-primary
   question is resolved (BACKLOG row).
3. Shallow dbt integration has enough users that asking
   "what do they want from the metrics layer" is a concrete
   question, not a speculative one.

**Action:** split out as separate BACKLOG row once shallow
adapter lands. Not scoped here.

## 3. Orthogonal projects to survey

### 3.1 SQLMesh (Tobiko Data, Apache-2)

SQLMesh's "virtual data environments" and its retraction-aware
model semantics are **structurally similar to what retraction-
native Zeta would offer dbt**. Before Zeta commits to a
design, read:

- Tobiko's blog posts on "virtual data environments"
  (`tobikodata.com/blog`)
- SQLMesh source around incremental / snapshot models
  (`github.com/TobikoData/sqlmesh`)
- Any published benchmarks comparing SQLMesh incremental vs
  dbt incremental

**Compare-before-design question:** is SQLMesh's "retraction-
aware" already the subsumption claim Zeta is preparing to
make? If yes, Zeta's differentiator is not "retraction-aware
at all" but "retraction-aware via DBSP algebra with operator-
level lineage and contract-surface invariants". That's a
narrower, more honest pitch.

**Risk:** if SQLMesh's semantics are already close to Zeta's
claim, the deep-integration paper's novelty shrinks. The
operator-algebra angle (not just retraction, but algebraic-
lineage) stays novel.

### 3.2 Dagster (Elementl, Apache-2)

Dagster is orchestrator-not-transformer. It ships `dagster-
dbt` that competes with dbt Cloud's orchestration piece.
Relevant for Zeta because:

- Dagster's software-defined-assets abstraction is graph-
  level, similar to Zeta's operator graph. Potential
  integration surface: a `dagster-zeta` that treats Zeta
  operator nodes as first-class Dagster assets.
- Dagster's observability (asset-level lineage, materialized
  asset catalog) is what dbt Cloud charges for. An open-source
  alternative already exists; Zeta's job isn't to rebuild
  that, it's to emit asset-graph metadata Dagster can consume.

**Action:** separate BACKLOG row for `dagster-zeta` integration
*after* the `dbt-zeta` adapter lands.

## 4. Recommendation — posture

Ranked in order of shipping, not importance:

1. **Earn the install first.** `dbt-zeta` adapter package
   (shallow integration, question e) before any deep-
   integration essay ships publicly. The adapter is a
   credibility marker and a distribution channel.

2. **Subsumption claims as papers, not press releases.** The
   incremental (2.1) and bitemporal-snapshot (2.2) claims
   are paper-grade. They get reviewed by researchers who
   will flag every over-claim. Draft the papers as standalone
   artifacts with benchmarks; release when Zeta can defend
   the numbers, not before.

3. **Invariant-programming binding is the contract-surface
   gate.** Question (c) requires Liquid-`F#` / skill.yaml to
   ship. Until then, the claim stays mapped-but-unbound.

4. **Manifest/state UX-compatibility shim.** Question (d) — emit
   `manifest.json`-compatible output from the operator graph
   so dbt Cloud's lineage viewer works out of the box. Non-
   load-bearing; ergonomics only.

5. **Survey SQLMesh before committing to a deep-integration
   pitch.** If SQLMesh already covers most of the retraction-
   native story, Zeta's novelty is operator-algebra +
   invariants, not retraction itself. Frame the pitch
   accordingly.

## 5. Open questions

- Does `dbt-core`'s adapter contract support returning a
  "relation that is itself a delta stream"? If not, the
  adapter has to *materialize* the delta into a relation
  before handing it back, which throws away the very
  advantage Zeta wants to sell. Worth a deep-read of the
  adapter contract before committing to the shallow goal.

- Is there an existing `dbt-materialize` adapter (Materialize
  Inc's streaming engine)? If yes, it has likely already
  faced the "return a changefeed, not a relation" question.
  Survey it before designing `dbt-zeta`.

- What does the dbt Semantic Layer (MetricFlow) look like
  when the underlying engine is retraction-native? Does the
  metric-definition surface change, or is it orthogonal?
  (Defer per §2.6 but note the question.)

- Operator-level lineage vs model-level lineage: does dbt
  Cloud's UI actually *want* operator-level, or is that noise
  for SQL authors? The answer changes whether §2.4's
  "operator-algebra is strictly more expressive" is a feature
  or an overwhelm.

## 6. What this doc does NOT do

- Does not design the `dbt-zeta` adapter package. That's a
  follow-up BACKLOG row — design + prototype once this
  research is reviewed.
- Does not propose a Semantic-Layer mapping (§2.6 deferred).
- Does not benchmark subsumption claims. Benchmark design
  is a separate research task; the claims here are
  structural, not measured.
- Does not prescribe a migration path for dbt users. The
  migration story is a v2+ concern after shallow adapter
  has usage data.

## 7. References

- dbt-labs/dbt-core: `github.com/dbt-labs/dbt-core` (MIT)
- dbt adapter contract: `docs.getdbt.com/docs/
  contributing/building-a-new-adapter`
- dbt incremental models: `docs.getdbt.com/docs/build/
  incremental-models`
- dbt snapshots: `docs.getdbt.com/docs/build/snapshots`
- dbt tests: `docs.getdbt.com/docs/build/data-tests`
- dbt manifest: `docs.getdbt.com/reference/artifacts/
  manifest-json`
- MetricFlow / Semantic Layer: `docs.getdbt.com/docs/build/
  about-metricflow`
- SQLMesh: `github.com/TobikoData/sqlmesh`,
  `tobikodata.com/blog`
- Dagster: `github.com/dagster-io/dagster`,
  `dagster-dbt` package
- Materialize dbt adapter (precedent for changefeed-return):
  `github.com/MaterializeInc/materialize/tree/main/misc/dbt-
  materialize`
- Snodgrass R. T., *Developing Time-Oriented Database
  Applications in SQL* (2000) — bitemporal foundation
  reading, relevant to §2.2.

## 8. Round-44 audit trail

- Trigger: tick-fire interrupt 2026-04-22.
- Landed: `docs/BACKLOG.md` row (commit `b6ad33e`); this
  doc (first-draft research).
- Consumers of this doc: the architect when scheduling
  `dbt-zeta` adapter spike; the human maintainer when
  reviewing the shallow-integration posture; any reviewer
  of the future incremental-subsumption paper.
- Known gaps: §5 questions stay open; benchmarks not run;
  Materialize precedent not yet deep-read.
