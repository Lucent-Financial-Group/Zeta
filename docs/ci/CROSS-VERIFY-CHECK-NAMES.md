# `cross-verify` check names — the exact strings for a ruleset promotion

**Status:** reference. This document changes no ruleset and no repository setting. It
exists so that whoever performs the promotion — a gated-class call, Aaron's — copies
strings rather than retypes them.

`docs/research/2026-08-26-three-verdict-loss-mechanisms-on-main-only-one-is-concurrency-and-the-largest-is-invisible-to-both-designs.md`
§6.1(a) is the reason this is worth writing down: **promoting an EXISTING job name into
`required_status_checks` costs zero runner-minutes and zero cache bytes.** The jobs
already run and already publish named check-runs. The expensive half — splitting one job
into many — is done; the cheap half is a ruleset edit that has not been made.

## What changed on 2026-08-26

`cross-verify (trust-core oracles + ace suite)` ran **31 audits under one check name** and
named none of them when it went red. It is now:

**31 matrix legs**, one per audit, each publishing `cross-verify (<id>)`.

There is no roll-up job, deliberately. The matrix job KEEPS the id `cross-verify`, and
GitHub collapses a whole matrix into one `needs.<job>.result` that is `success` only when
every leg succeeded — so `gate-required.needs:` is byte-identical to what it was and the
aggregate verdict is a property of the platform rather than of a job someone could make
fail open. A roll-up job was written first and then deleted for exactly that reason.

Nothing was promoted and nothing was demoted. The falsifier is
`src/Core.TypeScript/ci/cross-verify-roster.test.ts` §"the floor is not weakened", which
runs `gate-skip-verdict.ts`'s real logic against the committed `gate.yml` for every result
GitHub can produce, including the `skipped` case that a job-level `if:` would otherwise
excuse.

## The strings

Produced by `bun src/Core.TypeScript/ci/cross-verify-roster.ts --list` and pinned by the
last test in `cross-verify-roster.test.ts` — if this table stops covering the roster, that
test goes red, so the list below cannot silently go stale.

| check-run name                                 | what it audits                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `cross-verify (ace-suite)`                     | Ace package-manager suite                                                         |
| `cross-verify (qsharp-oracles)`                | Q# source-owned reference oracles                                                 |
| `cross-verify (byte-lock-oracles)`             | Cross-language byte-lock + golden-vector oracles                                  |
| `cross-verify (proof-lineage-binaries)`        | Proof-lineage binary exception (no-binary-in-proof-lineage.md)                    |
| `cross-verify (stage0-independence)`           | Stage-0 independence ratchet (doors, not file count)                              |
| `cross-verify (step-output-writers)`           | Step outputs have writers (a step that cannot succeed)                            |
| `cross-verify (action-sha-roster)`             | Third-party actions match the SHA roster (AH007)                                  |
| `cross-verify (task-zetaid-resolves)`          | Task ZetaIds resolve to work-items (AH006)                                        |
| `cross-verify (credential-role-separation)`    | Workflow credential role separation (one role, one secret)                        |
| `cross-verify (coauthor-identity-collision)`   | Co-author identity collision (AH005 — plain-username GitHub noreply form)         |
| `cross-verify (write-token-consistency)`       | Workflow write-token consistency (forge writes must reach the PAT)                |
| `cross-verify (heartbeat-lane-attestations)`   | PR-free heartbeat lane attestations (armed; vacuous until the lane exists)        |
| `cross-verify (heartbeat-lane-audit-tests)`    | Heartbeat-lane audit unit tests (a check that cannot fail is not a check)         |
| `cross-verify (push-without-rebase)`           | Commit-back lane can re-express its work (AH001)                                  |
| `cross-verify (skip-token-cannot-land)`        | Commit-back lane can actually land (AH002)                                        |
| `cross-verify (orphaned-archive-refs)`         | Archive lane record reached main (AH003)                                          |
| `cross-verify (dotnet-pin-parity)`             | .NET SDK pin declared once (.mise.toml canonical, global.json restates)           |
| `cross-verify (mise-toolchain-couplings)`      | mise toolchain couplings (rust restatements · zig byte-lock provenance)           |
| `cross-verify (flash-entrypoint-parity)`       | zflash host-arm parity (every arm verifies the ISO before writing)                |
| `cross-verify (chart-target-revisions)`        | ArgoCD chart targetRevisions resolve (offline, against the committed snapshot)    |
| `cross-verify (image-source-provenance)`       | No private-source image dependencies (offline, against the committed provenance)  |
| `cross-verify (image-source-provenance-tests)` | Private-source image dependencies — falsifiers (proves it goes red)               |
| `cross-verify (reason-truth)`                  | ArgoCD deferral reasons — every cited anchor still holds (offline)                |
| `cross-verify (no-raw-nul-in-source)`          | No raw NUL in tracked source (an audit must be able to read the file)             |
| `cross-verify (concept-registry-drift)`        | Concept registry vs published page (docs/CONCEPT-REGISTRY.md)                     |
| `cross-verify (tech-radar-claims)`             | Tech radar claims the repo can still support (paths resolve, in-use tools ringed) |
| `cross-verify (tech-radar-audit-tests)`        | Tech-radar audit unit tests (a check that cannot fail is not a check)             |
| `cross-verify (check-then-use-races)`          | No check-then-use filesystem races (TOCTOU, CWE-367)                              |
| `cross-verify (mumps-zeta-id)`                 | Execute MUMPS zeta-id packer                                                      |
| `cross-verify (zeta-id-gen-layout-drift)`      | zeta-id generated layouts vs the layout YAML                                      |
| `cross-verify (algebra-tower-drift)`           | Algebra-tower drift-check (semiring→ring→kleene + star-ring)                      |

All 31 are legs of the single job id `cross-verify`, which is what `gate (required)`
consumes today.

## Before promoting any of these — the two hazards

**1. A required context that never reports WEDGES a PR; it does not fail it.** This is why
the matrix list in `gate.yml` is static rather than computed by a roster job. A dynamic
matrix would mean these names do not exist until that job succeeds, and a hiccup there
would produce zero legs and a permanently pending required check. Keep it static.

**2. A required context must be produced by a workflow that has the `merge_group:`
trigger, and must run under the pre-merge matrix.** The research doc's §6.5 names this as
a silent footgun — it presents as a stuck queue, not as a misconfiguration. `gate.yml` has
`merge_group:` and every leg above is `ubuntu-24.04`, so all 31 strings are safe on that
axis today. The lint that would keep it true has not been written; it is §6.5's
recommendation and is not part of this change.

## What a promotion would and would not buy

**Would:** a red names the defect in the checks list, without opening a log. A false
positive in one audit blocks only what it governs, rather than holding the byte-lock
oracles hostage — which is what happened on 2026-08-26, when `task-zetaid-resolves`
convicted on a work-item filed under `docs/backlog/P1/` while it indexes only
`workitems/`.

**Would not:** change what blocks. Every one of these audits already blocks today, through
`cross-verify (all audits)`. Promotion is about **legibility of the red**, not about
coverage — and stating that plainly is the point, because "we made 31 checks required"
reads like a tightening and is not one.

**A middle option, if 31 required contexts is too many:** promote the roll-up plus the
handful whose false-positive cost is highest. Nothing here requires all-or-nothing.

## Pointers

- `src/Core.TypeScript/ci/cross-verify-roster.ts` — the roster; the comment on each entry
  is the one the step it replaced carried.
- `.github/workflows/gate.yml` — `cross-verify-audit` (the matrix) and `cross-verify` (the
  roll-up).
- `docs/research/2026-08-26-three-verdict-loss-mechanisms-on-main-only-one-is-concurrency-and-the-largest-is-invisible-to-both-designs.md`
  §6 — the decomposition frontier and the setup-class pricing this split was chosen from.
