---
id: B-0424
priority: P1
status: open
title: "Three-repo split Stage 1 — create empty Forge + ace with day-one scaffolding"
type: feature
origin: Aaron 2026-05-13 (autonomous-loop substrate cascade)
created: 2026-05-13
last_updated: 2026-05-13
composes_with:
  - memory/project_three_repo_split_zeta_forge_ace_software_factory_named_forge.md
  - memory/project_repo_split_provisional_names_frontier_factory_and_peers_2026_04_23.md
  - docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md
  - B-0425
---

# Three-repo split Stage 1 — create empty Forge + ace repos with day-one scaffolding

## Aaron's directive

Aaron 2026-05-13: *"let's split repos to make it easy backlog"* +
*"that project repo split stuff alreday exists"* + *"Also there
is backlog for repo split on products too"*.

The three-repo split substrate already exists (memory file plus
ADR plus 4-stage migration plan from 2026-04-22). Stage 0 is done. This
backlog row tracks Stage 1 — make it easy to land.

## What Stage 1 produces

Per `docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md`:

1. **`Lucent-Financial-Group/Forge`** — empty repo, software factory
   home, Claude/Otto-owned governance
2. **`Lucent-Financial-Group/ace`** — empty repo, package manager
   home, Aaron-owned governance

Both with full best-practice scaffolding applied at creation:

- Squash-merge only, delete head branches, auto-merge on, merge queue on
- Branch protection main: PR required, 1 review, required status checks,
  no force-push, signed commits, linear history
- Secret scanning + push protection, Dependabot + security updates
- CodeQL default-setup (NOT advanced-only — required for `code_scanning`
  ruleset rule)
- OpenSSF Scorecard, SECURITY.md
- CI safe-patterns: shared-runners, SHA-pinned actions, minimal
  permissions, concurrency groups, read-only `GITHUB_TOKEN` default,
  inline-untrusted-in-run Semgrep rule
- Budget caps $0 on LFG org Copilot/Actions/Packages
- Day-one governance files: README, AGENTS.md, CLAUDE.md, GOVERNANCE.md,
  LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY,
  `.github/copilot-instructions.md`
- Pre-commit hooks: ASCII-clean (BP-10), prompt-injection lint
- SVG social-preview
- Declarative `docs/GITHUB-SETTINGS.md` per repo
- Per-repo `docs/UPSTREAM-RHYTHM.md`

## Pre-start checklist — COMPLETED 2026-05-13 (B-0424.1)

Per `.claude/rules/backlog-item-start-gate.md`:

1. **Prior-art-search** — completed 2026-05-13:
   - `memory/project_three_repo_split_zeta_forge_ace_software_factory_named_forge.md` — read; substrate current, Stage 0 done (ADR exists)
   - `docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md` — read; full checklist present, no drift
   - `memory/project_ace_package_manager_agent_negotiation_propagation.md` — file exists; ace name + Ouroboros design confirmed
   - LFG/AceHack topology (`.claude/rules/lfg-acehack-topology.md`) — LFG is active dev; AceHack is mirror; Forge + ace repos do NOT yet exist at LFG — confirmed via worldview refresh (0 open PRs on main)
   - No existing `tools/scaffold/` directory — clean slate, no prior art to extend
   - Skill router checked: no existing scaffold or repo-creation skill

2. **Dependency-restructure** — B-0425 (product-repo split planning) is sibling row, not a blocker for Stage 1. Reciprocal pointer in B-0425 not yet present; will add in a follow-up pass. Stage 1 is executable independently.

3. **License question resolved** — Apache 2.0 (same as Zeta). Forge and ace are open-source/designed-to-be-forked; honor-system framing does not apply.

4. **Scope decision** — B-0424 is too broad to implement in one PR. This PR (B-0424.1) implements the smallest safe slice: day-one governance file templates for Forge and ace + a TypeScript dry-run tool (`tools/scaffold/create-repo.ts`) that shows the GitHub API calls needed to complete Stage 1. Actual GitHub repo creation (irreversible external action) is deferred to a follow-up PR with Aaron's review.

## Composes with

- B-0425 (product-repo split planning) — sibling backlog row
- `.claude/rules/lfg-acehack-topology.md` — LFG = active dev; AceHack
  = mirror; both forks already exist for Zeta
- `memory/feedback_aaron_civsim_forkable_pvp_raids_destiny_style_mutual_privacy_no_strategic_advantage_game_design_2026_05_13.md`
  — civsim forkable design property (PR #2903)
- `memory/feedback_aaron_grants_otto_strategic_encryption_decision_authority_team_decides_what_to_git_crypt_civsim_strategic_substrate_post_decision_audit_2026_05_13.md`
  — Otto's strategic encryption authority composes here (PR #2902)

## Why P1

- Substrate already exists; Stage 1 is execution
- Unblocks Stage 2 (move Forge content) and downstream
- Aaron has explicitly asked for the easy-to-track backlog surface
- Composes with the canonical product framing (PR #2851)

## Definition of done

- Both repos exist at LFG/Forge + LFG/ace
- Best-practice scaffolding checklist 100% applied
- Day-one governance files in place
- Branch protection + budget caps + CodeQL active
- ADR updated with Stage 1 completion note
- This backlog row closed with PR link to Stage-1-execution commits
