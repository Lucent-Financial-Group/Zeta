---
id: B-0324
priority: P1
status: open
title: "Org-level billing/usage page reader — extract Actions minutes and costs via UI"
tier: agent-capability-expansion
effort: S
parent: B-0064
created: 2026-05-08
last_updated: 2026-05-09
depends_on: [B-0318]
composes_with: [B-0064, B-0319]
tags: [agent-capability, github-ui, playwright, billing, cost-parity, read-only]
type: friction-reducer
---

# Org-level billing/usage page reader

Build `tools/playwright/github-ui/billing-reader.ts` — reads
the org-level GitHub Actions usage and billing pages via
Playwright to extract minutes consumed, cost data, and plan
limits that are only visible in the web UI.

## Why

The cost-parity audit (Otto-65 addendum) needed billing data
that was only available via manual paste from the GitHub UI
because the billing API is limited. This tool automates that
read, closing a known data gap.

## Scope

- Implement a TS module that:
  1. Navigates to `github.com/organizations/<org>/settings/billing`
     and related billing sub-pages via B-0317 auth +
     B-0318 snapshot.
  2. Extracts structured data: Actions minutes used/limit,
     storage used/limit, Packages usage, Codespaces usage,
     Copilot seat count (if visible).
  3. Returns a typed JSON result suitable for the
     cost-parity audit tool to consume.
  4. Handles the case where the authenticated user lacks
     billing-admin access — returns a clear
     "insufficient-permissions" error, not a silent empty.
- Read-only: no billing changes, no plan modifications.

## Done-criteria

- [x] `tools/playwright/github-ui/billing-reader.ts` exists.
- [ ] Running it returns structured billing data for the
      Lucent-Financial-Group org. ← follow-up: needs live auth credentials.
- [x] Output is JSON-serializable and includes at minimum
      Actions minutes used and limit (types defined; 27 unit tests pass).

## What this row does NOT do

- Does NOT modify billing settings — strictly read-only.
- Does NOT replace the GitHub billing API for data it
  already exposes — supplements it for UI-only fields.

## Pre-start checklist (2026-05-09)

**Prior-art search:**

- Skill router: no billing-reader skill exists; `github-ui` tools in
  `tools/playwright/github-ui/` cover snapshot/auth/reconcile — no billing.
- `tools/hygiene/LOST-FILES-LOCATIONS.md`: checked; no orphaned billing
  extractor in deleted files or closed branches.
- Decision-archaeology: B-0318 (auth), B-0064 (parent UI-reader), B-0319
  (reconcile-settings) — all compose with but do not duplicate billing.
- Result: no prior art; this is net-new substrate.

**Dependency-restructure:**

- `depends_on: [B-0318]` — B-0318 provides `withGitHubSession`; merged
  (PR #2309 area). Dependency satisfied.
- `composes_with: [B-0064, B-0319]` — B-0064 is the parent UI-reader
  program; B-0319 adds reconcile-settings as a peer module.
- No broken pointers found.

**Smallest-slice decision:**
Full item scope includes live navigation + CI end-to-end. Smallest safe
slice: pure-function HTML extractors + `readOrgBilling` navigator + unit
tests. Live Playwright run requires org billing-admin credentials unavailable
in CI — deferred to follow-up slice that adds an integration test fixture.
