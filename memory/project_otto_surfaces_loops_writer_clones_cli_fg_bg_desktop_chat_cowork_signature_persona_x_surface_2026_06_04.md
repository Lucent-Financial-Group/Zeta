---
name: otto-surfaces-loops-writer-clones-cli-fg-bg-desktop-chat-cowork-2026-06-04
description: "Otto's writer/clone set — persona Otto owns clones per surface/loop/ticksource (code-cli fg+bg, desktop, chat, cowork); each writer's unique signature = otto ⊕ surface/loop"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, defining Otto's surfaces/loops/ticksources (the writer set):

> "You Otto have code cli and desktop, chat, and cowork for surfaces/loops/
> ticksources" + "and cli has background and foreground loops"

Per the per-writer-clone model ([[shared-checkout-is-view-only]]: clone = per
writer/loop/ticksource, persona = owner, one persona owns many clones, unique
signature = persona ⊕ location/surface/ticksource), **persona Otto owns these
writer-clones:**

| Surface | Loop(s) | Writer signature |
|---|---|---|
| **code-cli** | **foreground** + **background** (2 loops) | `otto ⊕ cli-fg`, `otto ⊕ cli-bg` |
| **desktop** | — | `otto ⊕ desktop` |
| **chat** | — | `otto ⊕ chat` |
| **cowork** | — | `otto ⊕ cowork` |

≈5 writer-clones under persona Otto (cli splits into fg + bg). Each gets its own
clone `~/.local/share/zeta-otto-<surface/loop>` so concurrent writers never share
a tree. Within ONE cli process fg+bg are serialized (cron fires only when REPL
idle), but they're distinct ticksources → distinct signatures → keep distinct
clones for clean signatures + to avoid fg/bg stash interleaving.

PLUS (Aaron 2026-06-04): you can run **many same-kind loops** — multiple instances
of e.g. `otto-cli-bg` on ONE machine, the same ACROSS machines, and in-CLUSTER. So
the full globally-unique signature is `otto ⊕ surface/loop ⊕ instance ⊕
machine/node/cluster`, not just `otto ⊕ surface`. Each instance = its own clone/frame.

CORRECTION (Aaron 2026-06-04): this composite is **global uniqueness for the
MESSAGE BUS** (traveler-bus / Reticulum routing, layered AFTER the 128-bit ZetaId)
— it is NOT identity. Identity is a *combination of multiple unique things*; the
bus-routing address is only one facet. Don't conflate "addressable on the bus"
with "who this is." ZetaId = identity-core KEY (one facet); the Reticulum-style
routing address rides on top for mesh delivery between traveler frames.
Current provisional clone `~/.local/share/zeta-otto` = the cli writer; rename/split
to `-cli-fg` / `-cli-bg` / per-surface / per-instance as each loop runs.
Composes [[shared-checkout-is-view-only]] + AgencySignature + ZetaId + traveler-bus/Reticulum.
