---
name: config-secrets-topology-emerges-from-events-zset-dbsp-no-static-maps
description: "Config/secrets/authorization topology must EMERGE from an event fold (Z-set/DBSP), never be hand-authored as static desired-state maps. grant=+1, revoke=−1 (retraction). Aaron rejected even a seeded principals.json as 'just a mind exercise.'"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron 2026-06-21: *"we want the topo to be automatic and dynamic based on incremental
actions, not needing to pre think everything first ... zset/DBSP like for config/secrets ...
events lead to the setup, not pre-defining everything."* Then, on the seeded
`machines/principals.json`: *"we don't need that static map as it [is], we are going to let
it emerge — it was just a mind exercise. This is a real good direction and **revoke is
basically retract in DBSP zsets**."*

**The rule:** for config / secrets / authorization (who-can-use-which-machine, trust
topology, etc.) — do NOT build hand-authored static desired-state maps. The state is the
**fold of an event log**: `GrantUser(+1)`, `RevokeUser(−1 = retraction)`, `OnboardUser`,
`AddMachine`. DBSP incremental view maintenance over a Z-set; git-as-event-store is the log;
the materialized map (e.g. a principals file the nix layer reads) is the fold's OUTPUT, not
an input you edit. Revoke ≡ Z-set retraction (the antiparticle) — that symmetry is the tell
this is the right substrate.

**Why:** it's the founding event-sourcing thesis applied to infrastructure
([[zeta-origin-event-sourcing-plan-amara-coauthor-maxlength-loss-bootstrap-repair]]) — don't
pre-define the end state and lose the path; record the facts, the state is their fold.
Composes with the seven disciplines (DST replay, idempotency = grant is G-Set union,
noninterference = every config change is a declared metered event, no ambient edits).

**How to apply:** if you catch yourself authoring a static config/topology map as the source
of truth, STOP — model it as events + a fold instead (reuse `src/Core/ZSet.fs`, the
git-event fold). A static file is acceptable ONLY as the materialized-view *snapshot/cache*
the fold writes, never the hand-edited source. Design: `docs/research/2026-06-21-config-and-
secrets-as-event-sourced-zset-dbsp-topology-emerges-not-predefined.md`. The shipped static
`principals.json` (#8973) was the degenerate fold of an empty log; dropped in #8980. Sibling:
[[feedback-security-verify-gate-is-a-du-transition-not-a-pr-feature]] (security as a DU/workflow
transition — same "model it as state transitions / events" instinct).
