# Zeta drift dashboard

> **NOT OK — RED 11 · FLAPPING 1 · UNKNOWN 6, incl. NEVER observed · coverage 76/82 (SHORTFALL 6) · green 67 · on-demand 15**

A check that was never observed must never render identically to a check that passed.
`Unknown` is a first-class verdict here and can never aggregate into green: an unobserved
check is an unbounded number of unknown failures, so it is ranked ABOVE green and BY AGE.

| | |
|---|---|
| ref | `main` |
| pass at | 2026-08-29T06:48:20.256Z |
| producers | github-actions |
| roster | 97 known checks — 82 expected to report on this ref, 15 on-demand, 0 retired |
| coverage | **76 / 82** — **SHORTFALL 6** |

## RED — 11

Oldest first: a check red since the 16th outranks one red five minutes ago.

| check | red for | expectation | detail |
| --- | --- | --- | --- |
| `chart-version-refresh` | 6d | periodic | run 32654132313 concluded 'failure' |
| `ruleset-apply` | 4d | on-change | run 32857443217 concluded 'failure' |
| `manifesto-citation-snapshot-cadence` | 21h | periodic | run 33161549786 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `mirror-to-fork` | 19h | periodic | MOSTLY FAILING over 7d (3 of 5 concluded runs failed, 2026-08-25T18:23:12Z .. 2026-08-28T12:04:47Z, 2 consecutive pass(es) since the last failure). The newest run passed and is the outlier — a majority-failing lane is broken, not flaky. |
| `drift-dashboard-cadence` | 6h | periodic | run 33225169595 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `search-index-cadence` | 5h | periodic | run 33226408971 concluded 'failure' |
| `docker-windows-install-ps1-test` | 2h | periodic | run 33233681555 concluded 'failure' |
| `macos-install-sh-test` | 2h | periodic | run 33234027910 concluded 'failure' |
| `pr-gate-presence` | 10m | periodic | run 33238939546 concluded 'failure' |
| `gate` | 8m | on-change | run 33238368515 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `pr-categorization-cadence` | 3m | periodic | run 33239203153 concluded 'failure' |

## FLAPPING — 1

Recent CONCLUDED runs contain both passes and failures, and the newest passed. Its own
state because neither neighbour is honest: green would launder a 90% claim as a 100%
one, and red would make an oscillating lane permanently red until the alarm is muted.
A lane whose next verdict is a coin flip has no colour, so it gets its own.

| check | expectation | detail |
| --- | --- | --- |
| `pr-manifest-integrity` | periodic | FLAPPING over 7d (10 of 20 concluded runs failed, 2026-08-24T12:37:19Z .. 2026-08-29T06:40:05Z, 2 consecutive pass(es) since the last failure), and the newest passed. The latest verdict is green; the lane's next verdict is not predictable from it. |

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
| `rerun-cancelled-gate` | skipped | run 33239116232 was skipped |

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

## Green — 67

<details><summary>show</summary>

| check | verdict age | expectation |
| --- | --- | --- |
| `accelerator-move-next` | 91d | on-demand |
| `agencysignature-enforcement` | 8m | on-change |
| `agent-heartbeat` | 9m | periodic |
| `agent-proposal-gated-commit` | 12d | on-demand |
| `agentic-organization-tests` | 3d | on-change |
| `arc-lane` | 16h | on-change |
| `archive-strand-alarm` | 16m | periodic |
| `artifact-freshness` | 17m | periodic |
| `auto-submission` | 7m | unknown |
| `backlog-index-integrity` | 2d | on-change |
| `budget-snapshot-cadence` | 6d | periodic |
| `build-ai-cluster-iso` | 31m | on-change |
| `build-platform-images` | 3d | on-change |
| `bytelock` | 16h | on-change |
| `ci-cache-paths-lint` | 43m | on-change |
| `ci-runtime-image` | 14h | on-change |
| `codeql` | 4m | unknown |
| `context-cost-trend-cadence` | 20h | periodic |
| `copilot-pull-request-reviewer` | 28d | unknown |
| `dependabot-updates` | 4d | unknown |
| `docker-nixos-install-sh-test` | 3h | periodic |
| `docker-ubuntu-install-sh-test` | 3h | periodic |
| `docker-ubuntu-jammy-install-sh-test` | 3h | periodic |
| `drift-sweep` | 22s | periodic |
| `factory-hygiene-audit-cadence` | 12h | periodic |
| `git-hotspot-cadence` | 6d | periodic |
| `gitbash-install-routing-test` | 2h | periodic |
| `github-settings-drift` | 5d | periodic |
| `heartbeat-liveness` | 4m | periodic |
| `helm-validate` | 11h | periodic |
| `installer-repair-mode-existing-install` | 33h | on-change |
| `installer-unit-tests` | 66m | on-change |
| `interp-lane` | 3d | on-change |
| `inventory-hardening-check` | 6d | on-change |
| `inventory-heartbeat` | 13m | periodic |
| `k8s-argocd-health-test` | 10h | periodic |
| `k8s-lane-partition` | 2d | on-change |
| `keyring-dst1000` | 2d | on-change |
| `lean-proof` | 3d | on-change |
| `lint-autofix-apply` | 56s | on-demand |
| `lockfile-healer` | 2m | periodic |
| `low-memory` | 18m | periodic |
| `memory-index-drift` | 7h | on-change |
| `memory-index-duplicate-lint` | 7h | on-change |
| `memory-index-integrity` | 7h | on-change |
| `memory-reference-existence-lint` | 7h | on-change |
| `multiboot-qemu-uefi-smoke` | 3d | on-change |
| `mux-swarm-tick` | 37m | periodic |
| `pages-build-deployment` | 22d | unknown |
| `pages-deploy` | 2m | periodic |
| `proof-closure-drift` | 9m | periodic |
| `razor-cadence` | 18h | periodic |
| `rerun-toolchain-install-stall` | 11m | periodic |
| `role-ref-current-state-surfaces-lint` | 12m | on-change |
| `scorecard` | 5d | periodic |
| `skill-description-lint` | 12m | on-change |
| `society-heartbeat` | 3m | periodic |
| `soraya-formal-coverage-cadence` | 17h | periodic |
| `stryker-mutation` | 31h | on-change |
| `tick-metrics` | 6m | periodic |
| `tlaps-proof` | 3d | on-change |
| `udp-lossy-tests` | 8m | on-change |
| `update-graph` | 3d | unknown |
| `vocab-hygiene` | 18d | on-change |
| `wsl-install-sh-test` | 2h | periodic |
| `zetadb-scheduled-node` | 16m | periodic |
| `zflash-harness-lint` | 6d | periodic |

</details>

---

Generated by `bun src/Core.TypeScript/drift-dashboard/cli.ts`. The roster lives at
`db/drift-dashboard/roster.json` — a new check appearing and a known check vanishing are
both events you can see in a `git diff`. A vanished check keeps its slot and keeps being
counted; retirement is written by hand, with a reason, and by nothing else.
