---
pr_number: 5759
title: "docs(B-0808): land Zeta safety substrate inventory for classifier-floor gate"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T10:53:39Z"
merged_at: "2026-05-28T10:55:40Z"
closed_at: "2026-05-28T10:55:40Z"
head_ref: "otto-cli/b0808-safety-substrate-inventory-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:50Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5759: docs(B-0808): land Zeta safety substrate inventory for classifier-floor gate

## PR description

## Summary

Lands the Zeta safety substrate inventory at `docs/security/B-0808-zeta-safety-substrate-inventory.md` per B-0808 acceptance. The inventory feeds the B-0810 ratification gate that B-0720's standing operator-self-constraint depends on.

## What it covers

8 candidate safety floors classified into `mechanical` / `reviewer-only` / `research` / `missing`:

| # | Candidate | Status |
|---|---|---|
| 1 | B-0628 Knights Guild / Constitution-Class | research |
| 2 | B-0703 multi-oracle BFT + DST | research with mechanical primitive |
| 3 | B-0664 NCI (HC-8) | reviewer-only |
| 4 | methodology hard-limits rule | reviewer-only |
| 5 | classifier-bypass-research rule | reviewer-only (active) |
| 6 | Auto-loaded ruleset (87 rules) | reviewer-only (content); mechanical (auto-load) |
| 7 | B-0798 research boundary | reviewer-only |
| 8 | B-0807 findings schema | reviewer-only with schema primitive |

Per-candidate fields: what it protects, what's mechanical, what's reviewer-only, evidence today, aspirational vs current, gap to lift criterion.

## Load-bearing gap named

Content-aware Zeta-native refusal floor on HARD LIMIT classes (CSAM / weapons-uplift / verified secrets / real PII / active-harm). The external classifier currently provides this floor; Zeta does not have a native replacement. This is THE blocker to lifting B-0720; everything else is supporting infrastructure.

## Substrate-honest framing

- Most floors are reviewer-only today
- F# BFT/DST primitives exist mechanically but are not wired to content-class decisions
- Knights Guild is not constituted; B-0810 cannot invoke a body that doesn't exist yet
- The inventory is descriptive of state as of 2026-05-28, not aspirational

## B-0808 acceptance — all 5 criteria satisfied

- [x] Inventory document lands in durable repo surface and is linked from B-0720
- [x] Each candidate floor has classification
- [x] Distinguishes current evidence from aspirational claims
- [x] Lists gaps blocking B-0720 lift (6 ordered blockers)
- [x] B-0810 can use as ratification input ("Input format for B-0810" section)

Row marked `status: closed` per acceptance fulfillment. Document is a **living doc** — future status changes land as additive PRs against the inventory directly without re-opening B-0808.

## Test plan

- [x] Substrate-inventory pass (per `.claude/rules/verify-existing-substrate-before-authoring.md`) — confirmed no prior B-0808 inventory; convention from B-0720 / B-0798 / B-0807 / B-0799 siblings places child docs at `docs/security/B-<id>-<slug>.md`
- [x] Backlog index regenerated via `BACKLOG_WRITE_FORCE=1 bun tools/backlog/generate-index.ts`
- [x] `bun tools/backlog/lint-frontmatter.ts` — no new findings on B-0808 / B-0720 (422 pre-existing on other rows)
- [x] Branch-guard on commit (`git branch --show-current` matched ZETA_EXPECTED_BRANCH)
- [x] Commit canary: HEAD ls-tree size 61 = HEAD~1 size 61 (no tree collapse)

Composes with B-0628, B-0664, B-0703, B-0720, B-0810.

operative-authorization: aaron 2026-05-14: "- **Devil-pole** (edge-runner drive): keep pushing, discover, go hard, never-be-idle"

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## General comments

### @chatgpt-codex-connector (2026-05-28T10:53:43Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
