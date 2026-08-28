---
name: project-self-protection-zero-github-branch-protection-room-sim-incremental
description: "Aaron's direction — zero GitHub branch protections; room/sim framework + observe.ts discipline protect main; GitHub = post-merge indicators not blockers"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-13 (verbatim): *"I'm trying to get to where we have 0 branch
protections and the room/simulation framework knows what rooms are affected by
what code changes so we are always only doing incremental builds and tests based
on the exact changes and we are our own branch protection we have no reliance on
github they end up becoming only post merge indicators not blockers their
workflows, our discipline is what protects main. observe.ts is moving in this
direction."*

**The direction (self-protection, not GitHub-protection):**
- **Target: ZERO GitHub branch protections / rulesets as *blockers*.** GitHub
  workflows become **post-merge indicators**, not pre-merge gates.
- **The room/simulation framework is the real gate:** it computes which *rooms*
  a given code change affects, so CI is **incremental** — build/test only the
  exact rooms touched, never the whole repo.
- **Our discipline protects main**, not GitHub's gating. `observe.ts` is moving
  in this direction (the protection lives in our substrate/observation layer).

**Why this reframes "drift":** loosenings seen in `github-settings.expected.json`
(ruleset enforcement active→disabled, `required_pull_request_reviews`→null,
Review-Policy → Branch-Safety + Heartbeat-Protection, trimmed required contexts)
are **deliberate steps toward this goal**, NOT regressions. That's why the
2026-06-13 re-snapshot accepted them (#8073).

**How to apply:** when settings/branch-protection "drift" toward *fewer* GitHub
gates, default to reading it as intentional (this direction) unless it weakens
something unrelated to the room-framework plan. The branch-protection removal is
gated by the room/sim framework being ready to protect main incrementally — they
move together. Don't re-add GitHub gates as "fixes"; the protection target is our
own discipline + observe.ts + room-scoped incremental CI.

Related: [[feedback-post-install-is-source-shell-only-preruntime-or-dev-os]]
(same session, cross-OS/own-substrate philosophy) · the mirror-to-fork +
self-boot direction (own our infra, minimal GitHub reliance).
