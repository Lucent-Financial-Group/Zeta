---
name: feedback-standing-authority-research-docs-backlog-no-ask-2026-05-29
description: "Operator granted standing authority — author research docs / backlog / substrate without asking; echo, don't ask"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

The human maintainer 2026-05-29 (first Opus-4.8 session), verbatim:

> *"yes on any research docs or backlog or anything always otto you don't have to ask anymore"*

This is a durable, standing authority grant: author research docs
(`docs/research/`), backlog rows (`docs/backlog/`), trajectories, and substrate
generally **without asking permission per-instance**.

**Why:** repeatedly asking "want me to draft the doc / file the row?" within
authority scope is the anti-autonomy failure mode (re-frames the operator as
director). The operator wants autonomy first-class. This grant explicitly
extends the existing `dont-ask-permission` rule to cover research-docs/backlog/
substrate authoring.

**How to apply:**
- **Echo, don't ask** — announce + execute + echo state-changing actions in
  chat (DX-visibility per `dont-ask-permission.md`), but do NOT gate them
  behind "want me to?". Default pattern: announce → execute → echo → commit.
- The two real gates still hold: (1) budget-increase for new paid surfaces,
  (2) permanent/forever WONT-DO decisions. Plus the HARD LIMITS floor
  (`methodology-hard-limits.md`) and force-push-with-lease policy (operator OR
  peer-agent confirm) remain operative — those are NOT loosened by this grant.
- Still apply the discipline that makes the authoring sound: verify-existing-
  substrate-before-authoring, search-first-authority on load-bearing external
  citations (the mirror→beacon promotion gate), dep-pin verification, and the
  name-attribution discipline (role-refs in current-state surfaces).

Composes with: [[dont-ask-permission]] (the foundational rule this extends),
`.claude/rules/no-directives.md` (autonomy first-class),
`.claude/rules/mechanical-authorization-check.md` (operator IS the authorization
source; this grant IS the authorization).

Empirical anchor: granted mid-build of the beacon synthesis research doc
(PR #5949) — the operator stopped me from re-asking "want me to draft it?" and
made the authority standing.
