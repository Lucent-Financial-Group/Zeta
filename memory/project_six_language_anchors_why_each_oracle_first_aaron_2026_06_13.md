---
name: project-six-language-anchors-why-each-oracle-first
description: Why Zeta has each of its 6 cross-verification oracle languages — the anchor use that justified bringing it in first (Aaron 2026-06-13)
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron 2026-06-13, on the 6-language cross-verification rollout (#8087 zeta-id
codegen, #8115 mixin, etc.): *"fs=db ts=distribution/first layer on top of os/us
cs=2nd distribution rust=fast python=common ai today go=k8s — we want everything
everywhere eventually but these are the anchors for why there first."*

The anchors (the *first* reason each language earns its place; not a ceiling):

| Lang | Anchor | Reading |
|------|--------|---------|
| **F#** | db | the algebra/DBSP core — the database engine itself |
| **TS** | distribution / first layer on top of OS/us | the reference oracle + the layer between the OS and the operator |
| **C#** | 2nd distribution | the second distribution surface |
| **Rust** | fast | the hot/perf path |
| **Python** | common AI today | the lingua franca of current AI — first-class now (this is why the `no-python-files` / B-0156 "port .py→TS" guard was RETIRED 2026-06-13, #8130) |
| **Go** | k8s | the Kubernetes / cluster-ops surface |

"Everything everywhere eventually" — the long goal is every primitive in every
language; the anchors are the *prioritisation*, the why-this-one-first.

Operational consequence already realised: B-0156's "no Python" policy is dead;
Python is a peer oracle. See [[reference-multilang-rollout-lint-shortcircuit-bits-newtype-consumer-conversion]]
for the cross-language byte-lock discipline these oracles must keep (one canonical
collation, hex-in-JSON golden vectors, every oracle conforms).
