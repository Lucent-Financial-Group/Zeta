---
pr_number: 4790
title: "backlog(B-0715): file Soraya round-52 hand-off \u2014 register IsTimeInvariant axiom (DBSP chain rule)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T23:15:59Z"
merged_at: "2026-05-23T23:18:15Z"
closed_at: "2026-05-23T23:18:15Z"
head_ref: "otto/soraya-round52-b0715-istimeinvariant-axiom-registry-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4790: backlog(B-0715): file Soraya round-52 hand-off — register IsTimeInvariant axiom (DBSP chain rule)

## PR description

## Summary

Soraya autonomous round 52 — Lean axiom-registry hygiene gap.

`tools/lean4/Lean4/DbspChainRule.lean:272` defines `IsTimeInvariant` structure with `commute_zInv : ∀ s n, f (zInv s) n = zInv (f s) n`. This is a **de facto axiom** (no proof obligation; per-operator discharge). Both registered theorems (`chain_rule_proposition_3_2` + `Dop_LTI_commute`) take it as hypothesis — but the **axiom itself has no registry row**.

## Why now

The artifact's own strikethrough revision history (Prop 3.5 → Theorem 3.3 correction, round-35 2026-05-05) proves the drift class this row is designed to catch already fired empirically on THIS exact axiom. Registry rows are the structural prevention; currently missing for the axiom.

## Distinct from prior session findings

- B-0709 (round 42, expanded 49): TLA+/Alloy portfolio coverage — different tool stack
- B-0713 (round 50): Lean ImaginaryStack/ToyModel exploratory artifact — different artifact, sorry-bearing
- B-0714 (round 51): TLA+ `.cfg` runnability — different tool + axis (runnability vs registry)

This row: **registered theorems depend on unregistered axiom in same artifact**. New axis.

## Routing decision

- **Primary**: Lean 4 (structure-with-axiom is Mathlib idiomatic)
- **Cross-check**: NONE today — axiom is structural, not pointwise-algebraic; Z3/FsCheck inapplicable; paper-fidelity cross-check is human-grade (registry audit)
- **Wrong-tool cost at TOOL axis**: zero. Cost is at **REGISTRY axis** — without a row, paper-statement drift (round-35 class) goes uncaught next iteration

## TLA+-hammer guard

N/A — registry-hygiene, not tool-routing.

## Effort

S (one row + 2 back-pointers). Assignee: kenji.

## Test plan

- [ ] CI green (lint + backlog-index-integrity)
