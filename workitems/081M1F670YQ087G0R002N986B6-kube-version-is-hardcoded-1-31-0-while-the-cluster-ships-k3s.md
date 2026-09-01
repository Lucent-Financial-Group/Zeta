---
id: 081M1F670YQ087G0R002N986B6
type: bug
state: backlog
priority: P2
slug: kube-version-is-hardcoded-1-31-0-while-the-cluster-ships-k3s
title: "KUBE_VERSION is hardcoded 1.31.0 while the cluster ships k3s 1.34 — the chart audit renders against a version we do not run"
created: 2026-09-01T19:12:55.255Z
depends_on: []
composes_with: []
---

# KUBE_VERSION is hardcoded 1.31.0 while the cluster ships k3s 1.34 — the chart audit renders against a version we do not run

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F670YQ087G0R002N986B6-*.md` glob. -->

## The measurement

`src/Core.TypeScript/hygiene/audit-observability-chain.ts:70` declares:

```ts
export const KUBE_VERSION = "1.31.0";
```

Every chart in the tree is rendered against that with `helm template --kube-version`.
The one in-repo sighting of a resolved k3s store path — `full-ai-cluster/nixos/tests/k3s-server-join.nix:527`
— reads `k3s-1.34.5+k3s1`. k3s comes from `pkgs.k3s`, so the version follows the flake's
nixpkgs pin rather than any declaration we own.

**So the audit renders against a Kubernetes three minors older than the cluster probably runs.**

## Why it is a bug in both directions

A stale `kubeVersion` is not conservative. It fails **both** ways:

- **Rejects charts that would work.** `mimir-distributed` 6.x declares `kubeVersion: ^1.32.0-0`
  and cannot render at 1.31.0 — so the bump was reverted (2026-09-01) on a constraint that
  may not apply to us at all.
- **Clears charts that might not.** Anything relying on an API removed between 1.31 and 1.34
  renders clean here and fails on the real cluster. That is the more dangerous direction, and
  it is silent.

## Why it was not just raised

Raising it on the strength of a store path inside a test would trade a **checked** constraint
for a **plausible** one, on a constant that gates how every chart in the tree is validated.
The version needs to come from something that declares it.

## Done when

The Kubernetes version the audits render against is derived from, or checked against, the
version the cluster actually runs — not a literal that drifts silently — and `mimir` is
re-evaluated against the corrected value.

## Origin

Found 2026-09-01 while bumping charts. `audit-observability-chain` refused a roster refresh;
the cause was not a stale roster but this constant. Worth noting the checker I had written
for the bump **missed it entirely**, because it renders without `--kube-version` — the audit
caught it precisely because it passes one.
