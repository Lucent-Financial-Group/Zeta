# Zeta drift dashboard

> **NOT OK — RED 8 · UNKNOWN 5, incl. NEVER observed · coverage 62/67 (SHORTFALL 5) · green 56 · on-demand 14**

A check that was never observed must never render identically to a check that passed.
`Unknown` is a first-class verdict here and can never aggregate into green: an unobserved
check is an unbounded number of unknown failures, so it is ranked ABOVE green and BY AGE.

| | |
|---|---|
| ref | `main` |
| pass at | 2026-08-22T17:49:01.596Z |
| producers | github-actions |
| roster | 81 known checks — 67 expected to report on this ref, 14 on-demand, 0 retired |
| coverage | **62 / 67** — **SHORTFALL 5** |

## RED — 8

Oldest first: a check red since the 16th outranks one red five minutes ago.

| check | red for | expectation | detail |
| --- | --- | --- | --- |
| `chart-version-refresh` | **NEVER observed** | periodic | declared to run every 7d and has NEVER produced a verdict on this ref (schedule: '7 17 \* \* 0') |
| `budget-snapshot-cadence` | 6d | periodic | run 31959534906 concluded 'failure' |
| `tlaps-proof` | 16h | on-change | run 32542476787 concluded 'failure' |
| `manifesto-citation-snapshot-cadence` | 11h | periodic | run 32558211949 concluded 'failure' |
| `context-cost-trend-cadence` | 10h | periodic | run 32559948214 concluded 'failure' |
| `pr-manifest-integrity` | 5h | periodic | run 32573347920 concluded 'failure' |
| `k8s-lane-partition` | 32m | on-change | run 32587132920 concluded 'failure' |
| `gate` | 6m | on-change | run 32587966659 concluded 'failure' |

## UNKNOWN — 5

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
| `image-pull-measurement` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/image-pull-measurement.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |
| `inventory-phase5-proof` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/inventory-phase5-proof.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |
| `substrate-claim-checker` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/substrate-claim-checker.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |
| `zz-rustup-cache-probe` | **NEVER observed** | registered-but-absent | unknown | REGISTERED with the producer but its definition is ABSENT from the repository (workflow file '.github/workflows/zz-rustup-cache-probe.yml' is registered ACTIVE on the forge host but is ABSENT from the repository) — roster-versus-repository drift, invisible to a run-list check and to a file-tree check alike |

## Running (0) / skipped (2)

| check | state | detail |
| --- | --- | --- |
| `mirror-to-fork` | skipped | run 32572803781 was skipped |
| `rerun-cancelled-gate` | skipped | run 32588873662 was skipped |

## Not applicable — 10

Declared to fire only on request, so silence on this ref is **correct**. Listed, not
hidden, and deliberately not called green — a distinction laundered is a distinction lost.

<details><summary>show</summary>

| check | expectation |
| --- | --- |
| `accelerator-local-llm-validate` | push, but not to main |
| `agent-reviewer` | pull_request |
| `arc-swarm-fanout` | workflow_dispatch |
| `docker-ubuntu-install-sh-test` | push, but not to main |
| `lint-autofix` | pull_request |
| `passkey-proposal-gated-commit` | issues |
| `pr-archive-on-merge` | pull_request |
| `resume-diff` | pull_request |
| `scaffold-stage1-create-repos` | workflow_dispatch |
| `verify-ollama-pin` | pull_request |

</details>

## Green — 56

<details><summary>show</summary>

| check | verdict age | expectation |
| --- | --- | --- |
| `accelerator-move-next` | 85d | on-demand |
| `agencysignature-enforcement` | 17m | on-change |
| `agent-heartbeat` | 6m | periodic |
| `agent-proposal-gated-commit` | 5d | on-demand |
| `auto-submission` | 5m | unknown |
| `backlog-index-integrity` | 2d | on-change |
| `build-ai-cluster-iso` | 5h | on-change |
| `build-platform-images` | 35h | on-change |
| `bytelock` | 5d | on-change |
| `ci-cache-paths-lint` | 30m | on-change |
| `codeql` | 2m | unknown |
| `copilot-pull-request-reviewer` | 22d | unknown |
| `dependabot-updates` | 2h | unknown |
| `docker-nixos-install-sh-test` | 6h | on-change |
| `docker-ubuntu-jammy-install-sh-test` | 6h | on-change |
| `docker-windows-install-ps1-test` | 5h | on-change |
| `drift-sweep` | 4m | periodic |
| `factory-hygiene-audit-cadence` | 3h | periodic |
| `git-hotspot-cadence` | 6d | periodic |
| `gitbash-install-routing-test` | 6h | on-change |
| `github-settings-drift` | 5d | periodic |
| `heartbeat-liveness` | 11m | periodic |
| `helm-validate` | 2h | periodic |
| `installer-unit-tests` | 17h | on-change |
| `inventory-hardening-check` | 3d | on-change |
| `inventory-heartbeat` | 11h | periodic |
| `k8s-argocd-health-test` | 19m | periodic |
| `keyring-dst1000` | 17h | on-change |
| `lean-proof` | 5d | on-change |
| `lint-autofix-apply` | 67s | on-demand |
| `lockfile-healer` | 7m | periodic |
| `low-memory` | 11h | periodic |
| `macos-install-sh-test` | 6h | on-change |
| `memory-index-drift` | 42h | on-change |
| `memory-index-duplicate-lint` | 3d | on-change |
| `memory-index-integrity` | 42h | on-change |
| `memory-reference-existence-lint` | 42h | on-change |
| `multiboot-qemu-uefi-smoke` | 6d | on-change |
| `mux-swarm-tick` | 43m | periodic |
| `pages-build-deployment` | 15d | unknown |
| `pages-deploy` | 8m | periodic |
| `proof-closure-drift` | 5h | periodic |
| `razor-cadence` | 8h | periodic |
| `role-ref-current-state-surfaces-lint` | 2d | on-change |
| `scorecard` | 5d | periodic |
| `skill-description-lint` | 2d | on-change |
| `society-heartbeat` | 9m | periodic |
| `soraya-formal-coverage-cadence` | 8h | periodic |
| `stryker-mutation` | 7d | on-change |
| `tick-metrics` | 10m | periodic |
| `udp-lossy-tests` | 18m | on-change |
| `update-graph` | 21d | unknown |
| `vocab-hygiene` | 12d | on-change |
| `wsl-install-sh-test` | 6h | on-change |
| `zetadb-scheduled-node` | 17s | periodic |
| `zflash-harness-lint` | 6d | periodic |

</details>

---

Generated by `bun src/Core.TypeScript/drift-dashboard/cli.ts`. The roster lives at
`db/drift-dashboard/roster.json` — a new check appearing and a known check vanishing are
both events you can see in a `git diff`. A vanished check keeps its slot and keeps being
counted; retirement is written by hand, with a reason, and by nothing else.
