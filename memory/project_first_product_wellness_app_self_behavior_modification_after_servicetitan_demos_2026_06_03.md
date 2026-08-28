---
name: project-first-product-wellness-app-self-behavior-modification-after-servicetitan-demos
description: "First Zeta product likely a wellness app for self-behavior-modification, shipped after the ServiceTitan demos; stays wellness-device side (not medical)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-06-03: *"Our first product will likely be a wellness app for self
behavior modification after the ServiceTitan demos."*

The likely **first Zeta product** (on top of the Zeta substrate) = a **wellness
app for self-behavior-modification**, sequenced **after the ServiceTitan demos**.

**Why:** First public product needs to stay in the lighter-regulation lane. Per
the device-class rule landed 2026-06-03 (PR #6646,
`.claude/rules/wellness-device-yes-medical-device-no-at-this-point-describe-dont-diagnose-clinician-interprets.md`):
build **wellness / self-knowledge / behavior-modification** devices (describe +
self-report; legal-counsel-confirmed not a medical device); do **NOT** build
medical devices at this point (FDA-class + HIPAA-class red tape — revisable, not
forever). The first product sits squarely on the wellness side by design.

**How to apply:** When the first-product work starts (post-ServiceTitan-demos),
scope it wellness-side from the start — outputs **describe** (data / drift /
self-report), never **diagnose / direct treatment**; any clinical interpretation
lives with a human clinician. The concept shape discussed: track **stated
moral-invariants** with honest **drift-metrics** for self-report to the user's
chosen support network — the metric must be able to report "you did not hold
them" (no self-flattering / gameable metric). "Am I holding my invariants" =
wellness (IN); "am I well" = clinical (OUT, clinician's domain).

Tentative ("likely") + timing-gated ("after the ServiceTitan demos") — a roadmap
intention, not committed work yet. Co-built with the co-maintainer (Max).

Related: the device-class discipline [[wellness-device-not-medical-device-rule]];
the forwarded proof-cadence + permission/liability governance landed the same
session (PRs #6638/#6645/#6646).
