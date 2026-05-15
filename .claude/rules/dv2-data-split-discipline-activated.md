# Data Vault 2.0 — fifth always-active discipline (re-activated 2026-05-13)

Carved sentence:

> Aaron applies Data Vault 2.0 data-split disciplines as
> rigorously as he applies DST. The discipline went dormant.
> Re-activate alongside scale-free / lock-free (wait-free) /
> weight-free / DST. DV2.0 hub-satellite partition catches the
> ruleset-divergence smell + informs repo-split + skill-design.

## Operational content

Per the human maintainer 2026-05-13: *"all my 'smells' come from
applying Data Vault 2.0 data split dicipliens as rigoursly as i do
Deterministic Simulation I've just forgot to repeat data vault
2.0 enought to keep it activated like scale-free lock(wait)-
free weight free DST"*.

**Five always-active substrate-engineering disciplines** (from
2026-05-13):

| Discipline | Scope | What it produces |
|---|---|---|
| Scale-free | Design layers | Multi-scale composability |
| Lock-free / wait-free | Concurrency | No-lock concurrency primitives |
| Weight-free | Type theory | No implicit weighting |
| DST | Verification | Deterministic replay |
| **DV2.0** (re-activated) | **Partition** | **Change-rate-based partition into storage shapes** |

All five apply simultaneously per
`.claude/rules/default-to-both.md`.

## DV2.0 in one paragraph

Data Vault 2.0 (Linstedt) is enterprise-data-warehouse modeling
that partitions substrate by CHANGE RATE:

- **Hubs** — stable business keys (Customer, Product, Employee)
- **Links** — relationships between hubs (Customer purchases
  Product)
- **Satellites** — versioned descriptive attributes (Customer's
  name, email, address — change frequently)

The discipline is: separate things that change at DIFFERENT
RATES into different storage shapes.

## When to apply DV2.0

Whenever evaluating substrate-engineering decisions, ask: **what
changes at what rate; how should substrate be partitioned?**

### Repo-split decisions

DV2.0 informs the orthogonal three-axis repo-split design
(per B-0424 + B-0425 + B-0426 + B-0427):

- **Code repos** = hubs (stable infrastructure)
- **Cross-repo dependency manifests** = links (stable
  relationships)
- **Memory files / research docs / philosophy substrate** =
  satellites (fast-changing English)
- **Ruleset-divergence smell** (B-0427) IS DV2.0 applied to
  repo topology

### Skill design

Per `memory/feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md`:

- **Skills as carved sentences** = hubs (stable procedure)
- **Knowledge in docs** = satellites (refresh on cadence)

### Master Data Management

Per PR #2913 (HKT-MDM universality):

- Factory HKT `M<'T>` is parametric over entity type — exactly
  what MDM needs
- DV2.0 hub-satellite shape IS natural HKT instance
- Every company has master data; the factory's HKT-MDM ontology
  is universal

### Substrate landing decisions

When deciding where new substrate goes (memory file? rule? skill?
ADR? agent? backlog row?), ask:

- What's the change rate? (skill changes rarely; memory changes
  often; rule changes very rarely)
- What's the audience-bandwidth? (per bandwidth-served falsifier)
- What partition shape fits?

## Why this rule auto-loads

Per `.claude/rules/wake-time-substrate.md`: load-bearing
methodology needs wake-time landing. DV2.0 had gone dormant —
existing memory files describe it but the discipline was not
being actively applied. Aaron's 2026-05-13 disclosure named the
re-activation requirement.

Without wake-time landing:

- Future-Otto inheriting at cold-boot won't recognize the
  partition discipline
- Substrate-engineering decisions miss the change-rate framing
- The repo-split smell test loses its DV2.0 anchor

## Composes with other rules

- `.claude/rules/wake-time-substrate.md` — this rule IS the
  wake-time landing for DV2.0
- `.claude/rules/default-to-both.md` — all five always-active
  disciplines apply simultaneously
- `.claude/rules/bandwidth-served-falsifier.md` — DV2.0 IS
  bandwidth-engineering applied to data-modeling (partition
  serves change-rate bandwidth)
- `.claude/rules/glass-halo-bidirectional.md` — DV2.0 partition
  composes with substrate observation (different change rates
  observable as different glass-halo cadences)
- `.claude/rules/additive-not-zero-sum.md` — DV2.0 partition is
  ADDITIVE (different shapes for different change rates; doesn't
  subtract)
- `.claude/rules/fsharp-anchor-dotnet-build-sanity-check.md` —
  HKT-MDM substrate is F#-anchored

## Composes with substrate

- B-0424 (three-repo split Stage 1 — factory)
- B-0425 (product-repo split planning)
- B-0426 (Axis 2 — Mirror/Beacon)
- B-0427 (Axis 3 — Code/English with ruleset-divergence smell;
  DV2.0 INFORMS the smell test)
- `memory/feedback_aaron_data_vault_2_is_source_of_repo_split_smell_intuitions_needs_reactivation_alongside_scale_free_lock_free_weight_free_dst_2026_05_13.md`
  (the re-activation memory; PR #2912)
- `memory/feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md`
  (existing DV2.0 at skill-design scope)
- `memory/feedback_dv2_scope_universal_indexing.md`
  (DV2.0 universal-indexing scope)
- `memory/feedback_cross_disciplinary_pattern_adoption_aaron_thinking_style_dataVault_at_skill_level_2026_05_03.md`
  (cross-disciplinary pattern adoption)
- `memory/feedback_aaron_ontology_hkt_applies_directly_to_master_data_every_company_has_one_human_lineage_2026_05_13.md`
  (HKT-MDM universality; PR #2913)
- `memory/feedback_aaron_clifford_hkt_ontology_vocabulary_axis_basis_rudders_rotors_steering_cartographer_navigator_edge_mapper_world_model_civsim_edge_runner_5_control_structures_or_4_plus_meta_2026_05_13.md`
  (Clifford/HKT vocabulary; PR #2914)
- B-0043 (universal-company-government-information-substrate —
  master-data ontology already backlogged)

## Operational rule for future-Otto

When evaluating any substrate-engineering decision:

1. **Apply scale-free** — does this work at multiple scales?
2. **Apply lock-free / wait-free** — does this avoid lock
   contention?
3. **Apply weight-free** — does this avoid implicit weighting?
4. **Apply DST** — can this be replayed deterministically?
5. **Apply DV2.0 (NEW always-active)** — what changes at what
   rate; how should substrate be partitioned?

The fifth question catches:

- Ruleset-divergence smells in repo-split work (per B-0427)
- Hub-satellite separations in skill design
- Master-data partition shapes
- Memory vs rule vs skill vs ADR vs agent placement decisions

## Full reasoning

`memory/feedback_aaron_data_vault_2_is_source_of_repo_split_smell_intuitions_needs_reactivation_alongside_scale_free_lock_free_weight_free_dst_2026_05_13.md`
(PR #2912 — Aaron's re-activation disclosure)

`memory/feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md`
(existing DV2.0 substrate at skill-design scope)

PR #2911 (B-0427 Axis 3 — Code/English with ruleset-divergence
smell test; DV2.0 informs the smell)

PR #2913 (HKT-MDM universality — DV2.0 hub-satellite is natural
HKT instance)

PR #2914 (Clifford/HKT vocabulary list — DV2.0 partition fits
the ontology layer)
