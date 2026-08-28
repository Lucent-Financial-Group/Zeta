# Zeta drift dashboard

> **NOT OK — RED 14 · FLAPPING 1 · UNKNOWN 6, incl. NEVER observed · coverage 76/82 (SHORTFALL 6) · green 64 · on-demand 15**

A check that was never observed must never render identically to a check that passed.
`Unknown` is a first-class verdict here and can never aggregate into green: an unobserved
check is an unbounded number of unknown failures, so it is ranked ABOVE green and BY AGE.

| | |
|---|---|
| ref | `main` |
| pass at | 2026-08-28T21:48:49.029Z |
| producers | github-actions |
| roster | 97 known checks — 82 expected to report on this ref, 15 on-demand, 0 retired |
| coverage | **76 / 82** — **SHORTFALL 6** |

## RED — 14

Oldest first: a check red since the 16th outranks one red five minutes ago.

| check | red for | expectation | detail |
| --- | --- | --- | --- |
| `chart-version-refresh` | 5d | periodic | run 32654132313 concluded 'failure' |
| `ruleset-apply` | 3d | on-change | run 32857443217 concluded 'failure' |
| `manifesto-citation-snapshot-cadence` | 12h | periodic | run 33161549786 concluded 'failure' |
| `mirror-to-fork` | 10h | periodic | MOSTLY FAILING over 7d (3 of 5 concluded runs failed, 2026-08-25T18:23:12Z .. 2026-08-28T12:04:47Z, 2 consecutive pass(es) since the last failure). The newest run passed and is the outlier — a majority-failing lane is broken, not flaky. |
| `drift-dashboard-cadence` | 5h | periodic | run 33191596114 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `search-index-cadence` | 4h | periodic | run 33194550052 concluded 'failure' |
| `heartbeat-liveness` | 3h | periodic | run 33200386979 concluded 'failure' · **recheck in flight — this is the last CONCLUDED verdict, not a current one** |
| `pages-deploy` | 3h | periodic | STALE: newest verdict (green) is 3h old, declared to run every 15m (schedule: `*/15 * * * *`) · **recheck in flight — this is the last CONCLUDED verdict, not a current one** · **awaiting scheduled confirmation** — a later push run concluded 'green' at 2026-08-28T21:22:32Z, NEWER than the verdict above. The verdict reports the DECLARED (scheduled) path, which is the stronger claim: a hand-run proves the code, not the cadence. This row clears when the next scheduled run passes. |
| `lockfile-healer` | 3h | periodic | STALE: newest verdict (green) is 3h old, declared to run every 17m (schedule: `*/17 * * * *`) |
| `society-heartbeat` | 2h | periodic | STALE: newest verdict (green) is 2h old, declared to run every 30m (schedule: `*/30 * * * *`) |
| `rerun-toolchain-install-stall` | 85m | periodic | STALE: newest verdict (green) is 85m old, declared to run every 15m (schedule: `*/15 * * * *`) |
| `agent-heartbeat` | 54m | periodic | STALE: newest verdict (green) is 54m old, declared to run every 15m (schedule: `7,22,37,52 * * * *`) |
| `pr-gate-presence` | 44m | periodic | run 33210982845 concluded 'failure' |
| `pr-manifest-integrity` | 11m | periodic | run 33213329702 concluded 'failure' |

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
| `rerun-cancelled-gate` | skipped | run 33213595325 was skipped |

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
| `agencysignature-enforcement` | 28m | on-change |
| `agent-proposal-gated-commit` | 11d | on-demand |
| `agentic-organization-tests` | 3d | on-change |
| `arc-lane` | 7h | on-change |
| `archive-strand-alarm` | 74m | periodic |
| `artifact-freshness` | 19m | periodic |
| `auto-submission` | 27m | unknown |
| `backlog-index-integrity` | 40h | on-change |
| `budget-snapshot-cadence` | 5d | periodic |
| `build-ai-cluster-iso` | 5h | on-change |
| `build-platform-images` | 3d | on-change |
| `bytelock` | 7h | on-change |
| `ci-cache-paths-lint` | 22h | on-change |
| `ci-runtime-image` | 5h | on-change |
| `codeql` | 23m | unknown |
| `context-cost-trend-cadence` | 11h | periodic |
| `copilot-pull-request-reviewer` | 28d | unknown |
| `dependabot-updates` | 3d | unknown |
| `docker-nixos-install-sh-test` | 15h | periodic |
| `docker-ubuntu-install-sh-test` | 16h | periodic |
| `docker-ubuntu-jammy-install-sh-test` | 16h | periodic |
| `docker-windows-install-ps1-test` | 15h | periodic |
| `drift-sweep` | 80m | periodic |
| `factory-hygiene-audit-cadence` | 3h | periodic |
| `gate` | 8m | on-change |
| `git-hotspot-cadence` | 5d | periodic |
| `gitbash-install-routing-test` | 14h | periodic |
| `github-settings-drift` | 4d | periodic |
| `helm-validate` | 2h | periodic |
| `installer-repair-mode-existing-install` | 24h | on-change |
| `installer-unit-tests` | 22h | on-change |
| `interp-lane` | 3d | on-change |
| `inventory-hardening-check` | 6d | on-change |
| `inventory-heartbeat` | 12h | periodic |
| `k8s-argocd-health-test` | 37m | periodic |
| `k8s-lane-partition` | 45h | on-change |
| `keyring-dst1000` | 43h | on-change |
| `lean-proof` | 3d | on-change |
| `lint-autofix-apply` | 37m | on-demand |
| `low-memory` | 12h | periodic |
| `macos-install-sh-test` | 15h | periodic |
| `memory-index-drift` | 10h | on-change |
| `memory-index-duplicate-lint` | 10h | on-change |
| `memory-index-integrity` | 10h | on-change |
| `memory-reference-existence-lint` | 10h | on-change |
| `multiboot-qemu-uefi-smoke` | 2d | on-change |
| `mux-swarm-tick` | 51m | periodic |
| `pages-build-deployment` | 22d | unknown |
| `pr-categorization-cadence` | 5h | periodic |
| `proof-closure-drift` | 11m | periodic |
| `razor-cadence` | 9h | periodic |
| `role-ref-current-state-surfaces-lint` | 2h | on-change |
| `scorecard` | 5d | periodic |
| `skill-description-lint` | 4d | on-change |
| `soraya-formal-coverage-cadence` | 8h | periodic |
| `stryker-mutation` | 22h | on-change |
| `tick-metrics` | 2m | periodic |
| `udp-lossy-tests` | 28m | on-change |
| `update-graph` | 3d | unknown |
| `vocab-hygiene` | 18d | on-change |
| `wsl-install-sh-test` | 14h | periodic |
| `zetadb-scheduled-node` | 74m | periodic |
| `zflash-harness-lint` | 5d | periodic |

</details>

---

Generated by `bun src/Core.TypeScript/drift-dashboard/cli.ts`. The roster lives at
`db/drift-dashboard/roster.json` — a new check appearing and a known check vanishing are
both events you can see in a `git diff`. A vanished check keeps its slot and keeps being
counted; retirement is written by hand, with a reason, and by nothing else.
