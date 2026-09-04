---
id: 081M1N97ECS087G0R003GCPEDZ
type: task
state: backlog
priority: P3
slug: register-the-zetafs-virtual-path-healer-in-run-tier0-which-n
title: "register the zetafs-virtual-path healer in run-tier0, which needs the runner widened to .fs"
created: 2026-09-04T04:01:01.337Z
depends_on: []
composes_with: []
---

# register the zetafs-virtual-path healer in run-tier0, which needs the runner widened to .fs

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N97ECS087G0R003GCPEDZ-*.md` glob. -->

The healer exists, is certified against the harness laws, and is **not registered** in the
running fleet. This is the increment that registers it.

## What already ships

`src/Core.TypeScript/hygiene/healers/zetafs-virtual-path.ts` carries a `Detector` and a
`Healer` and passes `certify()` for idempotence, closure and convergence. The **detector**
runs in `lint (bash retirement inventory + hygiene unit tests)` today and writes nothing.

## Why the healer is not registered yet

`run-tier0.ts` reads `.ts`, `.tsx`, `.js`, `.md`, and `.github/workflows/*.yml`. It does not
read `.fs`. Registering this healer therefore means **widening that glob to F#**, which
changes the blast radius of the five healers already composed there — `stale-js`,
`unpinned-actions`, `exact-optional-spread`, `unused-import`, `stale-doc-cross-ref` — over a
language none of them was written against.

Each of those would very likely no-op on F#. **"Very likely no-op" is an assumption about
five healers that write to the repository**, and `run-tier0.ts`'s own header records what
that class of assumption cost once already: a sibling tool probed with `--help` started a
~1,700-file rewrite. So the widening is its own change with its own evidence, not a line
slipped in beside a bug fix.

## What registering actually requires

1. Widen the runner's extension filter to `.fs`.
2. **Re-certify each existing Tier-0 healer against F# fixtures** — the claim to establish
   is that each declines rather than merely happening not to match. A healer that no-ops by
   accident is one regex away from not.
3. Add `zetafsVirtualPathHealer` to the composed set.
4. Confirm `DEFAULT_MAX_FILES = 25` is still the right bound with F# in scope, or move it in
   a commit that says why. The runner's header is explicit that raising it to make a red run
   go green is itself a finding.

## Why the detector shipping alone is not a half-measure

The detector is the half with no blast radius, and it is the half that stops the class
coming back. A healer that can fix drift nobody is looking for is worth less than a detector
that makes the drift loud — and the loud check is what would have caught the original 31
call sites before they reached two Windows lanes.

Parent: 081M1N854ED087G0R002JP5V5N.
