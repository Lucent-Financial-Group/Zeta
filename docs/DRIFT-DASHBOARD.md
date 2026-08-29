# Zeta drift dashboard

> **NOT OK — RED 9 · FLAPPING 1 · UNKNOWN 6, incl. NEVER observed · coverage 76/82 (SHORTFALL 6) · green 69 · on-demand 15**

A check that was never observed must never render identically to a check that passed.
`Unknown` is a first-class verdict here and can never aggregate into green: an unobserved
check is an unbounded number of unknown failures, so it is ranked ABOVE green and BY AGE.

| | |
|---|---|
| ref | `main` |
| pass at | 2026-08-29T01:00:29.801Z |
| producers | github-actions |
| roster | 97 known checks — 82 expected to report on this ref, 15 on-demand, 0 retired |
| coverage | **76 / 82** — **SHORTFALL 6** |

## RED — 9

Oldest first: a check red since the 16th outranks one red five minutes ago.

| check | red for | expectation | detail |
| --- | --- | --- | --- |
| `chart-version-refresh` | 5d | periodic | run 32654132313 concluded 'failure' |
| `ruleset-apply` | 3d | on-change | run 32857443217 concluded 'failure' |
| `manifesto-citation-snapshot-cadence` | 15h | periodic | run 33161549786 concluded 'failure' |
| `mirror-to-fork` | 13h | periodic | MOSTLY FAILING over 7d (3 of 5 concluded runs failed, 2026-08-25T18:23:12Z .. 2026-08-28T12:04:47Z, 2 consecutive pass(es) since the last failure). The newest run passed and is the outlier — a majority-failing lane is broken, not flaky. |
| `drift-dashboard-cadence` | 3h | periodic | run 33214128640 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `search-index-cadence` | 3h | periodic | run 33214398515 concluded 'failure' |
| `pr-gate-presence` | 6m | periodic | run 33224909079 concluded 'failure' |
| `pr-manifest-integrity` | 5m | periodic | MOSTLY FAILING over 7d (11 of 20 concluded runs failed, 2026-08-24T06:37:44Z .. 2026-08-29T00:55:50Z, 1 consecutive pass(es) since the last failure). The newest run passed and is the outlier — a majority-failing lane is broken, not flaky. |
| `pr-categorization-cadence` | 50s | periodic | run 33225104997 concluded 'failure' |

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
| `rerun-cancelled-gate` | skipped | run 33225133691 was skipped |

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

## Green — 69

<details><summary>show</summary>

| check | verdict age | expectation |
| --- | --- | --- |
| `accelerator-move-next` | 91d | on-demand |
| `agencysignature-enforcement` | 3m | on-change |
| `agent-heartbeat` | 8m | periodic |
| `agent-proposal-gated-commit` | 11d | on-demand |
| `agentic-organization-tests` | 3d | on-change |
| `arc-lane` | 10h | on-change |
| `archive-strand-alarm` | 10m | periodic |
| `artifact-freshness` | 12m | periodic |
| `auto-submission` | 3m | unknown |
| `backlog-index-integrity` | 44h | on-change |
| `budget-snapshot-cadence` | 5d | periodic |
| `build-ai-cluster-iso` | 8h | on-change |
| `build-platform-images` | 3d | on-change |
| `bytelock` | 11h | on-change |
| `ci-cache-paths-lint` | 25h | on-change |
| `ci-runtime-image` | 9h | on-change |
| `codeql` | 13s | unknown |
| `context-cost-trend-cadence` | 14h | periodic |
| `copilot-pull-request-reviewer` | 28d | unknown |
| `dependabot-updates` | 3d | unknown |
| `docker-nixos-install-sh-test` | 19h | periodic |
| `docker-ubuntu-install-sh-test` | 19h | periodic |
| `docker-ubuntu-jammy-install-sh-test` | 19h | periodic |
| `docker-windows-install-ps1-test` | 18h | periodic |
| `drift-sweep` | 12m | periodic |
| `factory-hygiene-audit-cadence` | 6h | periodic |
| `gate` | 4m | on-change |
| `git-hotspot-cadence` | 5d | periodic |
| `gitbash-install-routing-test` | 18h | periodic |
| `github-settings-drift` | 4d | periodic |
| `heartbeat-liveness` | 19m | periodic |
| `helm-validate` | 5h | periodic |
| `installer-repair-mode-existing-install` | 27h | on-change |
| `installer-unit-tests` | 25h | on-change |
| `interp-lane` | 3d | on-change |
| `inventory-hardening-check` | 6d | on-change |
| `inventory-heartbeat` | 16h | periodic |
| `k8s-argocd-health-test` | 4h | periodic |
| `k8s-lane-partition` | 2d | on-change |
| `keyring-dst1000` | 46h | on-change |
| `lean-proof` | 3d | on-change |
| `lint-autofix-apply` | 6m | on-demand |
| `lockfile-healer` | 27s | periodic |
| `low-memory` | 16h | periodic |
| `macos-install-sh-test` | 18h | periodic |
| `memory-index-drift` | 44m | on-change |
| `memory-index-duplicate-lint` | 44m | on-change |
| `memory-index-integrity` | 45m | on-change |
| `memory-reference-existence-lint` | 44m | on-change |
| `multiboot-qemu-uefi-smoke` | 3d | on-change |
| `mux-swarm-tick` | 42m | periodic |
| `pages-build-deployment` | 22d | unknown |
| `pages-deploy` | 15m | periodic |
| `proof-closure-drift` | 5m | periodic |
| `razor-cadence` | 12h | periodic |
| `rerun-toolchain-install-stall` | 3m | periodic |
| `role-ref-current-state-surfaces-lint` | 5h | on-change |
| `scorecard` | 5d | periodic |
| `skill-description-lint` | 4d | on-change |
| `society-heartbeat` | 17m | periodic |
| `soraya-formal-coverage-cadence` | 11h | periodic |
| `stryker-mutation` | 26h | on-change |
| `tick-metrics` | 2m | periodic |
| `udp-lossy-tests` | 3m | on-change |
| `update-graph` | 3d | unknown |
| `vocab-hygiene` | 18d | on-change |
| `wsl-install-sh-test` | 18h | periodic |
| `zetadb-scheduled-node` | 10m | periodic |
| `zflash-harness-lint` | 5d | periodic |

</details>

---

Generated by `bun src/Core.TypeScript/drift-dashboard/cli.ts`. The roster lives at
`db/drift-dashboard/roster.json` — a new check appearing and a known check vanishing are
both events you can see in a `git diff`. A vanished check keeps its slot and keeps being
counted; retirement is written by hand, with a reason, and by nothing else.
