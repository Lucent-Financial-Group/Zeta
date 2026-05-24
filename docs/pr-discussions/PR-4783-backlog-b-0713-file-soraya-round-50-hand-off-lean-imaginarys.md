---
pr_number: 4783
title: "backlog(B-0713): file Soraya round-50 hand-off \u2014 Lean ImaginaryStack/ToyModel registry gap"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T22:46:14Z"
merged_at: "2026-05-23T22:47:49Z"
closed_at: "2026-05-23T22:47:49Z"
head_ref: "otto/soraya-round50-b0713-imaginary-stack-registry-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4783: backlog(B-0713): file Soraya round-50 hand-off — Lean ImaginaryStack/ToyModel registry gap

## PR description

## Summary

Soraya autonomous round 50 — Lean ImaginaryStack/ToyModel registry gap.

`tools/lean4/ImaginaryStack/ToyModel.lean` (177 LOC, 7 `sorry` placeholders) claims fidelity to a HaPPY-paper QECC isomorphism ([Pastawski-Yoshida-Harlow-Preskill 2015, arXiv:1503.06237](https://arxiv.org/abs/1503.06237)) but has **no row in `docs/research/verification-registry.md`**.

**Distinct from B-0709** (round-42 portfolio coverage of TLA+/Alloy): this is a separate axis — sorry-bearing Lean artifact with external-paper fidelity claim. Failure mode is paper-version-drift on a multi-year-old preprint without a registry row to pin the version + preconditions against.

## Routing decision

- **Primary**: Lean 4 + Mathlib (correctly wired; Lean is right tool)
- **Cross-check**: none warranted today
- **Wrong-tool cost at TOOL axis**: zero. Cost is at **REGISTRY axis** — verification-drift-auditor cannot flag future Class 1/2/3 drift without a row to compare against.
- **TLA+-hammer guard**: N/A (registry-discipline, not tool-routing)

## Effort

S (one evening). Assignee: kenji.

## Policy-flip authorization

Per Aaron's 2026-05-23 21:30Z direction: Otto auto-ships Soraya findings as backlog rows immediately. Aaron reviews aggregates (DORA, drift reports, root-axiom-changes), not per-row.

## Test plan

- [ ] CI green (lint + backlog-index-integrity)
- [ ] Kenji picks up: row + tools/lean4/README.md cross-link

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-23T22:48:12Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `c8ff0b200b`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

## Review threads

### Thread 1: docs/BACKLOG.md:667 (unresolved)

**@chatgpt-codex-connector** (2026-05-23T22:48:12Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Remove dangling B-0700 index entry from generated backlog**

This commit adds a `docs/BACKLOG.md` row for `B-0700` whose target file (`docs/backlog/P2/B-0700-soraya-continuous-loop-substrate-with-bus-escalation-2026-05-17.md`) does not exist in this commit, creating a dead link and making the generated index inconsistent with source rows. Because `BACKLOG.md` is generated from `docs/backlog/**`, `tools/backlog/generate-index.ts --check` will rewrite/drop this entry and the backlog-index-integrity gate can fail until the missing row file is added (or the index line is removed).

Useful? React with 👍 / 👎.
