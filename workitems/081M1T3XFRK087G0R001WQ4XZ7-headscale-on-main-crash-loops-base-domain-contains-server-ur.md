---
id: 081M1T3XFRK087G0R001WQ4XZ7
type: bug
state: backlog
priority: P2
slug: headscale-on-main-crash-loops-base-domain-contains-server-ur
title: "headscale on main crash-loops: base_domain contains server_url's host"
created: 2026-09-06T01:04:24.339Z
depends_on: []
composes_with: []
---

# headscale on main crash-loops: base_domain contains server_url's host

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1T3XFRK087G0R001WQ4XZ7-*.md` glob. -->

## The live defect on main

`main` currently ships headscale with `dns.base_domain: zeta.local` while
`server_url: https://headscale.zeta.local`. headscale refuses that config at load and the pod
CrashLoopBackOffs — measured on live run 33995838640:

```
Error: initializing: loading configuration: server_url cannot be part of base_domain
in a way that could make the DERP and headscale server unreachable
```

The control server's own hostname sits inside the tailnet's MagicDNS zone, so it would shadow
itself. The upstream chart shipped `example.com`; the conflict was introduced by changing it to
`zeta.local` for tidiness during the Helm-to-raw-manifests migration.

## Why it reached main

The fix and its falsifier were written and pushed to #16696's branch, and **#16696 merged at
22:42:56Z before that push**. So the PR landed the migration and not the correction — the diagnosis
existed, on a branch, after the merge. Worth recording as a process fact rather than only a config
bug: **a fix pushed to a branch after its PR merges lands nowhere**, and nothing in the tooling
said so.

## The fix

`base_domain: tailnet.zeta.local` — a sibling label rather than an ancestor of
`headscale.zeta.local`, which is what headscale's check requires.

Plus a falsifier pinning the **predicate** headscale enforces (`host !== base` and
`!host.endsWith("." + base)`) rather than the two literal strings, so it still catches the conflict
if either value is changed later. Mutation-checked: restoring `zeta.local` fails the test.

## Still untested after this

The key-generation assumption in `configmap.yaml` — that headscale generates a missing private key
at startup. Both failures so far died before reaching the key paths (`Missing` never applied the
manifests; `Progressing` died at config load). The first boot that gets past config validation is
the one that exercises it.
