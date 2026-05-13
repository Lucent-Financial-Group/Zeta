---
id: B-0428
priority: P1
status: open
title: "Resurrect F# DBpedia type provider as HKT-MDM canonical demo"
type: feature
origin: Aaron 2026-05-13 (autonomous-loop substrate cascade)
created: 2026-05-13
last_updated: 2026-05-13
composes_with:
  - B-0043
  - memory/feedback_aaron_dbpedia_is_free_master_data_human_curated_fsharp_type_provider_archived_resurrect_for_hkt_mdm_canonical_demo_fork_fsharp_compiler_for_ai_safety_real_hkt_over_clifford_2026_05_13.md
  - memory/feedback_aaron_ontology_hkt_applies_directly_to_master_data_every_company_has_one_human_lineage_2026_05_13.md
  - memory/feedback_aaron_clifford_hkt_ontology_vocabulary_axis_basis_rudders_rotors_steering_cartographer_navigator_edge_mapper_world_model_civsim_edge_runner_5_control_structures_or_4_plus_meta_2026_05_13.md
---

# Resurrect F# DBpedia type provider as HKT-MDM canonical demo

## Aaron's directive

Aaron 2026-05-13: *"dude is there still a free f# type provider
for this? https://www.dbpedia.org/ this is like free master data
with human curtatino"* + *"both but 2nd one we can do when we
fork f# compiler for ai safety to add real hkt over clifford"*.

## Path A: Type provider resurrection (THIS ROW)

Build fresh F# type provider for DBpedia on top of dotNetRDF
or RDFSharp (both active as of 2026).

**Note**: Path B (direct dotNetRDF API + F# computation
expressions) is DEFERRED per Aaron 2026-05-13 until the factory
forks F# compiler for AI safety to add real HKT over Clifford.
That's a separate (much larger) work item.

## Why DBpedia

- Free human-curated master data at Wikipedia scale
- SPARQL-queryable RDF (entity + attributes + relationships)
- Every Wikipedia entity has typed attributes
- CC-BY-SA license (free + redistributable)
- Public endpoint at `dbpedia.org/sparql`

## Why F# type provider

- Compile-time type-safety over DBpedia ontology
- `M<'T>` parametric over entity type = canonical HKT-MDM
  demo (per PR #2913)
- Composes with factory's algebra-owner skill (Z-set + Clifford
  + BP/EP F# substrate)
- IDE intellisense over master-data entities

## Original archived

Original `fsprojects/zzarchive-FSharp.Data.DbPedia` (Don Syme
demo era) is archived. No active F# type provider for DBpedia
SPARQL exists as of 2026-05-13 search-first verification.

## Implementation paths

| Foundation library | Trade-off |
|---|---|
| **dotNetRDF 3.x** | Most mature; RDF-Star + SPARQL-Star support; last updated Feb 2026 |
| **RDFSharp 3.23.0** | Lightweight; clean API; last updated March 2026 |

Both work from F#. Type-provider work wraps either.

## Pre-start checklist

Per `.claude/rules/backlog-item-start-gate.md`:

1. **Prior-art search**:
   - Original F# DBpedia type provider source (archived)
   - dotNetRDF SparqlQueryClient API
   - RDFSharp client wrappers
   - F# type provider authoring guide (Microsoft Learn)
   - Soraya formal-verification portfolio for type-provider
     safety properties

2. **Dependency restructure** — walk composes_with chain:
   - B-0043 (universal-business-templates — DBpedia type
     provider IS the canonical demo for this)
   - PR #2913 (HKT-MDM universality — composes here)
   - PR #2924 (Aurora pitch master-data scope)

3. **Per-task scope decisions**:
   - Read-only first; write-back to DBpedia is out-of-scope
   - SPARQL query construction via F# computation expressions
   - Type provider generates entity types from DBpedia ontology
   - Optional: caching layer for substrate-engineering
     reproducibility

4. **Soraya consultation** for type-safety properties + formal
   verification scope

## What this row does NOT commit to

- **NOT P0** — backlog priority among other strategic substrate
  work
- **NOT a F# fork** — Path B (real HKT over Clifford) is
  separate
- **NOT a write-API to DBpedia** — read-only scope; ontology
  exploration + master-data querying
- **NOT Aurora-pitch-replacement** — composes with Aurora; not
  superseding

## Definition of done

- Working F# type provider against DBpedia SPARQL endpoint
- Demo project showing master-data querying with intellisense
- Test coverage at DBpedia-query-type-safety scope
- Composes with B-0043 universal-business-templates substrate
- ADR recording the type-provider design + dotNetRDF-vs-
  RDFSharp choice + future-Path-B-after-F#-fork transition
  plan

## Why P1

- Composes with B-0043 (universal-business-templates already
  backlogged)
- Strategic-substrate (per PR #2902 Otto strategic encryption
  authority) — DBpedia type provider is HIGH-VISIBILITY
  factory demo
- Composes with Aurora pitch deployment (PR #2924)
- Aaron has explicitly named the work as desired
- Composes with multiple HKT substrate landings (PR #2815 /
  #2817 / #2832 / #2913 / #2914)

## Composes with

- B-0043 (universal-company-government-information-substrate)
- B-0427 (Axis 3 — Code/English split; type provider is Code-
  side substrate)
- B-0426 (Axis 2 — Mirror/Beacon; type provider can graduate
  Mirror→Beacon via citation lineage)
- B-0424 (Stage 1 factory split — type provider lives in Forge
  or Zeta?)
- PR #2913 / PR #2914 / PR #2924
- PR #2892 (KSK — typed-safety motivation composes)
- `.claude/rules/fsharp-anchor-dotnet-build-sanity-check.md`
- `.claude/rules/dv2-data-split-discipline-activated.md`
  (DBpedia satellites change; hubs stable)
- `algebra-owner` skill
- Soraya formal-verification authority
