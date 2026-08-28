---
name: feedback-aaron-greenfield-change-public-api-when-right
description: "Greenfield — feel free to change the public API when it's right; \"it breaks the API\" is not by itself a blocker yet"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron 2026-06-07: *"we are greenfield; we should always feel free to change our
public API when it's right."*

**Why:** Zeta has no external library consumers it is bound to yet, so a *better*
public surface is worth a breaking change — don't contort a design to preserve
stability that protects no one. This is what made B-0969 comparer strategy **(a)**
(explicit comparer-is-part-of-identity, public-API change across ZSet/GSet)
acceptable rather than a cost to route around.

**How to apply:** When weighing a design, do NOT treat "this changes/breaks the
public API" as a blocker on its own while greenfield. `public-api-designer`
(Ilyana) still reviews the *quality* of the new surface — pick the right shape,
not the backward-compatible one. The window closes when the API stabilizes for
real consumers: then every public member becomes a maintained contract (Ilyana's
default conservatism reasserts). Greenfield is the window, not a forever-license.

Related: [[feedback-aaron-avoid-if-branchless]] · B-0969 (comparer strategy a) ·
the Rodney's-Razor noun-elimination work (changing surfaces freely to reach the
minimal shape).
