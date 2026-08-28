---
name: Two ticket types — friction reducers and features
description: Aaron 2026-05-08 — backlog items are either friction reducers (compound, make the next cycle faster) or features (product output). Background service naturally picks friction reducers first — correct behavior.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Two types of backlog items: friction reducers and features.

**Why:** Aaron 2026-05-08 observed this after seeing the background service autonomously create 3 friction-reducing PRs (refresh-worldview extension, structure fingerprint library, PR publication executor). Each PR the service created made the next PR easier to create — the Superfluid pattern.

**How to apply:** The background service should balance between them. Friction reducers compound, so front-loading them is correct (build infrastructure first, features flow easier). But pure friction-reducer mode without features is decomposition-without-building in a different form. The ratio matters. Consider adding `type: friction-reducer | feature` to backlog frontmatter so the autonomous-pickup tool can track and balance the ratio.
