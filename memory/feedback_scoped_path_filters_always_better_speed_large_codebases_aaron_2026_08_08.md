---
name: feedback-scoped-path-filters-always-better
description: Aaron — CI checks should use the smallest/most-scoped path filter that covers the real trigger set; never every-PR jobs
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-08T17:49:00.285Z
---

Aaron 2026-08-08: "smaller more scoped path filters are always better for speed
and larger codebases."

Said affirming the choice to keep the **path-filtered** `installer-unit-tests.yml`
(#10131) over an equivalent every-PR job in `gate.yml` (#10134) — both gated the
same 271 installer tests; the scoped one won.

**Why:** an every-PR job taxes every change with work unrelated to it; that cost
compounds as the codebase grows. A scoped `paths:` filter keeps each change's CI
fan-out proportional to what it actually touched.

**How to apply:** when adding a CI check, default to the narrowest `paths:` trigger
that still covers the real dependency set (the area's code + its shared deps:
package.json/bun.lock/tsconfig/.mise.toml + the workflow file itself), as a
separate targeted workflow — the k8s-argocd-health-test / keyring-dst1000 /
installer-unit-tests pattern. Do NOT add an every-PR job (nor a new blocking-floor
entry — that's also a treaty-amendment consent path post-FLIP 2026-08-01). Prefer
scoped-and-separate over co-located-and-broad.
