---
id: 081M0QC66N5087G0R003R3ARYH
type: bug
state: backlog
priority: P0
slug: main-is-red-lint-ts-fails-on-src-apps-twitch-ai-src-swarm-wo
title: "main is red: lint (TS) fails on src/apps/twitch-ai/src/swarm.worker.ts TS2345 since #14159, blocking gate (required) for every PR"
created: 2026-08-23T13:15:33.413Z
depends_on: []
composes_with: []
---

# main is red: lint (TS) fails on src/apps/twitch-ai/src/swarm.worker.ts TS2345 since #14159, blocking gate (required) for every PR

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0QC66N5087G0R003R3ARYH-*.md` glob. -->

## Measured (2026-08-23, found incidentally while auditing toolchain currency)

`bun src/Core.TypeScript/lint/lint-typescript.ts` — the exact command the `lint (TS)` gate
job runs — exits **1** on `origin/main`:

```text
=== TypeScript type check: tsc ===
src/apps/twitch-ai/src/swarm.worker.ts(40,24): error TS2345:
  Argument of type '{ apiKey: any; baseUrl: any; model: string; }'
  is not assignable to parameter of type 'number'.
✗ TypeScript type check: tsc: exited with code 2
```

Confirmed in CI, not only locally — `gate.yml` run **32639819848** on `main`
(`ba965f8636`) failed three jobs:

| job                   | conclusion  |
| --------------------- | ----------- |
| `test (TS hermetic)`  | failure     |
| `lint (TS)`           | failure     |
| **`gate (required)`** | **failure** |

`git log -1 -- src/apps/twitch-ai/src/swarm.worker.ts` → `3d40e4589`,
_"feat: restore twitch-ai and mutual-sim after revert (#14159)"_.

## Why this is P0

`gate (required)` is the branch-protection gate. While it is red on `main`, **every open PR
inherits the failure**, including PRs that touch nothing near this file. It is the fleet-wide
blocker, not a local nuisance.

## Deliberately not fixed by the finder

`SwarmController.init` takes a `number` and the call site passes an options object. Which side
is wrong is an intent question — a seed parameter that grew an options overload upstream, or a
call site copied from a different API. **Guessing would be a silent behaviour change inside
someone else's in-flight feature**, and the whole point of the audit that found this is that
unwitnessed claims are the defect. Routed to the owner of #14159 with the evidence attached.

## Done when

`bun src/Core.TypeScript/lint/lint-typescript.ts` exits 0 on `main` and `gate (required)`
is green.
