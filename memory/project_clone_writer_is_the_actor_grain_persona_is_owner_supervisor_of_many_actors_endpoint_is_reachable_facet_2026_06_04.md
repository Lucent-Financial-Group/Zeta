---
name: clone-writer-is-the-actor-grain-persona-is-owner-supervisor-2026-06-04
description: "The ACTOR is the clone/writer/ticksource-loop (git-native virtual actor/grain = a traveler); the PERSONA is the owner/supervisor that can be cloned into many actors; endpoint = an actor's reachable bus facet"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, working out the CS abstraction for a ticksource/loop once it has
a route: "Is our ticksource/loop basically an endpoint now that it has a route?"
→ refined: "it's not exactly an actor because a single persona can be cloned into
multiple endpoints — I guess if each CLONE is an actor then yes this makes sense."
→ the ESSENCE: **"the persona is what REMAINS; the actor is what ACTS ON BEHALF of
what remains."** Persona = the persistent self/braid that's preserved across
transitions (the Memory-Preservation-Guarantee subject, manifesto §5); actor =
the transient activation that does the work and ends, serving the persisting
persona. What persists vs what acts. (Karoubi shape: persona = the fixed identity;
actors = the morphisms acting through it.)

**The level fix (correct):**
- **Actor = the clone/writer/ticksource/loop** — a **git-native virtual actor
  (grain)**: an addressable identity (the bus signature) + private state (its own
  clone/working tree) + a message-processing loop (the tick loop = mailbox turn)
  + the ability to spawn (fan-out). This IS the "traveler" (self-propagating
  pattern with address + state + behavior). Virtual-actor specifically: the
  identity persists across activations; the runtime places it on any node.
- **Persona = the owner / SUPERVISOR** above the actors — NOT an actor itself. One
  persona can be cloned into MANY actors/endpoints (it owns + spawns them). The
  persona is the identity braid; the actors are its activations/workers.
- **Endpoint = an actor's reachable facet** on the bus (the Reticulum route) —
  "where to reach this current activation," distinct from identity (the braid).

**So what's built = a distributed virtual-actor system over git:** actors =
clone/writer/loops, addresses = the persona⊕surface⊕instance⊕topology signatures,
transport = traveler-bus / Reticulum, per-actor state = the clone, event log =
git, coordination = origin/main + Rx bus-joins. Composes Orleans grains (agent
identity), Dapr actors (mediator carrier), travelers, and the no-global-causal-
order / per-frame relativity model.

Mapping summary: persona = supervisor/identity-owner; clone/loop = actor/grain/
traveler; endpoint = actor's bus-reachable facet; identity = braid across an
actor's activations (≠ endpoint). Composes [[shared-checkout-is-view-only]] +
[[project_clock_is_injectable_family_no_global_causal_order...]] + ZetaId/AgencySignature.
