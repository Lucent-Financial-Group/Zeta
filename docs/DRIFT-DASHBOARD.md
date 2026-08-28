# Zeta drift dashboard

> **NOT OK — RED 14 · FLAPPING 1 · UNKNOWN 6, incl. NEVER observed · coverage 76/82 (SHORTFALL 6) · green 64 · on-demand 15**

A check that was never observed must never render identically to a check that passed.
`Unknown` is a first-class verdict here and can never aggregate into green: an unobserved
check is an unbounded number of unknown failures, so it is ranked ABOVE green and BY AGE.

| | |
|---|---|
| ref | `main` |
| pass at | 2026-08-28T16:47:29.190Z |
| producers | github-actions |
| roster | 97 known checks — 82 expected to report on this ref, 15 on-demand, 0 retired |
| coverage | **76 / 82** — **SHORTFALL 6** |

## RED — 14

Oldest first: a check red since the 16th outranks one red five minutes ago.

| check | red for | expectation | detail |
| --- | --- | --- | --- |
| `chart-version-refresh` | 5d | periodic | run 32654132313 concluded 'failure' |
| `ruleset-apply` | 3d | on-change | run 32857443217 concluded 'failure' |
| `manifesto-citation-snapshot-cadence` | 7h | periodic | run 33161549786 concluded 'failure' |
| `drift-dashboard-cadence` | 7h | periodic | run 33161699300 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `search-index-cadence` | 6h | periodic | run 33165420413 concluded 'failure' |
| `mirror-to-fork` | 5h | periodic | MOSTLY FAILING over 7d (3 of 5 concluded runs failed, 2026-08-25T18:23:12Z .. 2026-08-28T12:04:47Z, 2 consecutive pass(es) since the last failure). The newest run passed and is the outlier — a majority-failing lane is broken, not flaky. |
| `agent-heartbeat` | 4h | periodic | STALE: newest verdict (green) is 4h old, declared to run every 15m (schedule: `7,22,37,52 * * * *`) · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `tick-metrics` | 3h | periodic | STALE: newest verdict (green) is 3h old, declared to run every 15m (schedule: `*/15 * * * *`) · **awaiting scheduled confirmation** — a later push run concluded 'green' at 2026-08-28T15:18:52Z, NEWER than the verdict above. The verdict reports the DECLARED (scheduled) path, which is the stronger claim: a hand-run proves the code, not the cadence. This row clears when the next scheduled run passes. |
| `heartbeat-liveness` | 2h | periodic | run 33179544550 concluded 'failure' |
| `pages-deploy` | 2h | periodic | STALE: newest verdict (green) is 2h old, declared to run every 15m (schedule: `*/15 * * * *`) · **awaiting scheduled confirmation** — a later push run concluded 'green' at 2026-08-28T16:40:14Z, NEWER than the verdict above. The verdict reports the DECLARED (scheduled) path, which is the stronger claim: a hand-run proves the code, not the cadence. This row clears when the next scheduled run passes. |
| `lockfile-healer` | 2h | periodic | STALE: newest verdict (green) is 2h old, declared to run every 17m (schedule: `*/17 * * * *`) |
| `society-heartbeat` | 2h | periodic | STALE: newest verdict (green) is 2h old, declared to run every 30m (schedule: `*/30 * * * *`) |
| `pr-gate-presence` | 16m | periodic | run 33190379147 concluded 'failure' |
| `pr-manifest-integrity` | 13m | periodic | run 33190422156 concluded 'failure' |

## FLAPPING — 1

Recent CONCLUDED runs contain both passes and failures, and the newest passed. Its own
state because neither neighbour is honest: green would launder a 90% claim as a 100%
one, and red would make an oscillating lane permanently red until the alarm is muted.
A lane whose next verdict is a coin flip has no colour, so it gets its own.

| check | expectation | detail |
| --- | --- | --- |
| `tlaps-proof` | on-change | FLAPPING over 7d (2 of 7 concluded runs failed, 2026-08-22T01:22:36Z .. 2026-08-26T08:34:27Z, 2 consecutive pass(es) since the last failure), and the newest passed. The latest verdict is green; the lane's next verdict is not predictable from it. |

## UNKNOWN — 6

**Longest silence first.** Silence that persists is the strongest signal and the easiest
to habituate to, so it is aged rather than listed. `never-observed` sorts above every
finite silence, because that is what infinite silence is.

The `why unknown` column is load-bearing — five reasons, and they are NOT interchangeable:
`never-observed` (no data has ever existed) · `not-observed-this-pass` (data may exist; this
pass could not see it — today's bug wears this one's clothes) · `registered-but-absent` (the
producer declares the check and its definition is missing from the repository) ·
`expectation-unknown` (cannot tell whether it should run at all) · `source-error` (we failed
to ask, which is not the same as a correct silence).

| check | silent for | why unknown | expectation | detail |
| --- | --- | --- | --- | --- |
| `copilot` | **NEVER observed** | expectation-unknown | unknown | cannot tell whether this check should run on this ref (host-managed check 'dynamic/copilot-swe-agent/copilot' — never declared in this repository, so its trigger cannot be read from the tree), and it has never produced a verdict |
| `inventory-phase5-proof` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/inventory-phase5-proof.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |
| `root-flake-check` | **NEVER observed** | never-observed | on-change | declared to run on changes to this ref (push to main) and has never produced a verdict |
| `spanserializer-windows-repro` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/spanserializer-windows-repro.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |
| `substrate-claim-checker` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/substrate-claim-checker.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |
| `zz-rustup-cache-probe` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/zz-rustup-cache-probe.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |

## Not yet due — 0

Declared, correct, and **not yet owed a verdict** — its definition has not existed for a
full period. Its own state on purpose: calling it green claims a verdict nobody gave, and
calling it red cries wolf on every scheduled check anyone adds, which gets the alarm muted.

_none_

## Running (0) / skipped (1)

| check | state | detail |
| --- | --- | --- |
| `rerun-cancelled-gate` | skipped | run 33191263918 was skipped |

## Not applicable — 11

Declared to fire only on request, so silence on this ref is **correct**. Listed, not
hidden, and deliberately not called green — a distinction laundered is a distinction lost.

<details><summary>show</summary>

| check | expectation |
| --- | --- |
| `accelerator-local-llm-validate` | push, but not to main |
| `agent-reviewer` | pull_request |
| `agentic-organization-integration` | workflow_dispatch |
| `arc-swarm-fanout` | workflow_dispatch |
| `image-pull-measurement` | pull_request |
| `lint-autofix` | pull_request |
| `passkey-proposal-gated-commit` | issues |
| `pr-archive-on-merge` | pull_request |
| `resume-diff` | pull_request |
| `scaffold-stage1-create-repos` | workflow_dispatch |
| `verify-ollama-pin` | pull_request |

</details>

## Green — 64

<details><summary>show</summary>

| check | verdict age | expectation |
| --- | --- | --- |
| `accelerator-move-next` | 91d | on-demand |
| `agencysignature-enforcement` | 6s | on-change |
| `agent-proposal-gated-commit` | 11d | on-demand |
| `agentic-organization-tests` | 2d | on-change |
| `arc-lane` | 2h | on-change |
| `archive-strand-alarm` | 26m | periodic |
| `artifact-freshness` | 25m | periodic |
| `auto-submission` | 8m | unknown |
| `backlog-index-integrity` | 35h | on-change |
| `budget-snapshot-cadence` | 5d | periodic |
| `build-ai-cluster-iso` | 2h | on-change |
| `build-platform-images` | 2d | on-change |
| `bytelock` | 2h | on-change |
| `ci-cache-paths-lint` | 17h | on-change |
| `ci-runtime-image` | 25m | on-change |
| `codeql` | 4m | unknown |
| `context-cost-trend-cadence` | 6h | periodic |
| `copilot-pull-request-reviewer` | 28d | unknown |
| `dependabot-updates` | 3d | unknown |
| `docker-nixos-install-sh-test` | 10h | periodic |
| `docker-ubuntu-install-sh-test` | 11h | periodic |
| `docker-ubuntu-jammy-install-sh-test` | 11h | periodic |
| `docker-windows-install-ps1-test` | 10h | periodic |
| `drift-sweep` | 22m | periodic |
| `factory-hygiene-audit-cadence` | 22h | periodic |
| `gate` | 5m | on-change |
| `git-hotspot-cadence` | 5d | periodic |
| `gitbash-install-routing-test` | 9h | periodic |
| `github-settings-drift` | 4d | periodic |
| `helm-validate` | 22h | periodic |
| `installer-repair-mode-existing-install` | 19h | on-change |
| `installer-unit-tests` | 17h | on-change |
| `interp-lane` | 2d | on-change |
| `inventory-hardening-check` | 6d | on-change |
| `inventory-heartbeat` | 7h | periodic |
| `k8s-argocd-health-test` | 20h | periodic |
| `k8s-lane-partition` | 40h | on-change |
| `keyring-dst1000` | 38h | on-change |
| `lean-proof` | 2d | on-change |
| `lint-autofix-apply` | 3m | on-demand |
| `low-memory` | 7h | periodic |
| `macos-install-sh-test` | 10h | periodic |
| `memory-index-drift` | 5h | on-change |
| `memory-index-duplicate-lint` | 5h | on-change |
| `memory-index-integrity` | 5h | on-change |
| `memory-reference-existence-lint` | 5h | on-change |
| `multiboot-qemu-uefi-smoke` | 2d | on-change |
| `mux-swarm-tick` | 42m | periodic |
| `pages-build-deployment` | 21d | unknown |
| `pr-categorization-cadence` | 5m | periodic |
| `proof-closure-drift` | 14m | periodic |
| `razor-cadence` | 4h | periodic |
| `rerun-toolchain-install-stall` | 25m | periodic |
| `role-ref-current-state-surfaces-lint` | 5h | on-change |
| `scorecard` | 4d | periodic |
| `skill-description-lint` | 4d | on-change |
| `soraya-formal-coverage-cadence` | 3h | periodic |
| `stryker-mutation` | 17h | on-change |
| `udp-lossy-tests` | 16s | on-change |
| `update-graph` | 2d | unknown |
| `vocab-hygiene` | 18d | on-change |
| `wsl-install-sh-test` | 9h | periodic |
| `zetadb-scheduled-node` | 25m | periodic |
| `zflash-harness-lint` | 5d | periodic |

</details>

---

Generated by `bun src/Core.TypeScript/drift-dashboard/cli.ts`. The roster lives at
`db/drift-dashboard/roster.json` — a new check appearing and a known check vanishing are
both events you can see in a `git diff`. A vanished check keeps its slot and keeps being
counted; retirement is written by hand, with a reason, and by nothing else.
