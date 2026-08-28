---
name: branch-protection-control-within-standing-authority-2026-06-04
description: "Branch-protection control is WITHIN standing authority (not gated) — relax for folders-on-main/no-PR, but always keep the delete + force-push floor"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, granting + making explicit so it's not re-litigated:
*"you have full control over branch protections"* + *"that's within your
standing authority rules maybe we need to add it explicitly so you don't
forget."*

**Branch-protection / ruleset control is WITHIN standing authority** — it is the
"everything except budget + liability" domain (see
[[feedback-aaron-standing-auth-everything-except-budget-and-liability]]). Do NOT
hesitate or over-ask before adjusting rulesets to enable the agreed direction.

**Why:** PRs cost (the review/gate cycle, not the free workflows); we're moving
to **folders-on-main / no-PR** (sovereign mode). GitHub workflows stay (free)
but **don't gate**; "green" is defined locally by `docs/BUILD-GATES.md`.

**How to apply — keep the FLOOR when relaxing:**
- KEEP: no-delete, no-force-push (non-fast-forward), linear-history. These are
  the floor (composes force-push-with-lease discipline). Never remove them.
- RELAX (for folders-on-main): the `pull_request`/review requirement +
  required-status-checks (so workflows run free but don't block direct push).
- Reversible: snapshot a ruleset before deleting (e.g.
  `docs/ops/ruleset-backups/`); disable beats delete when the API allows.

**Done 2026-06-04 (this session):** disabled CI Gate ruleset + removed classic
required_pull_request_reviews + deleted Review Policy ruleset (snapshot saved);
kept Branch Safety floor; pushed B-1016 slice 1 + BUILD-GATES.md direct to main.
Composes [[no-directives]] (gated = budget+liability only) + sovereign-no-PR
local-build-gate + B-1016 (context-min) + dont-ask-permission.
