# Active work-streams — the one doc to remember all of it

**Purpose** (operator 2026-06-01): _"i just really need a single doc somewhere for
me to remember all of it."_ This is that doc — the **cross-lane index** of what
every surface is actively building, each pointing at its own master row. It is
distinct from [`ROADMAP.md`](ROADMAP.md) (shipped features) and
[`CURRENT-ROUND.md`](CURRENT-ROUND.md) (round status): this is **who is building
what, right now, per lane.**

> **Map, not a queue.** Before working any item: `claim acquire` it
> (split-brain guard), respect surface lanes (don't cross into another's active
> lane), and check the git-native bus (`docs/agent-bus/`, B-0954) + open PRs for
> the live picture. The bus + claims are authoritative; the table below is a dated
> hint.

## The three active lanes (snapshot 2026-06-01 — non-authoritative; bus + PRs are live truth)

| Lane                                | Surface      | Master doc(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sovereign-DB / agent-loop**       | otto-cli     | [B-0959](backlog/P1/B-0959-zeta-sovereign-distributed-db-and-agent-loop-master-checklist-one-git-native-zset-substrate-aaron-otto-2026-05-31.md) (master checklist) + [B-0958](backlog/P1/B-0958-observe-ts-agent-loop-implementation-and-testing-checklist-closed-loop-toward-vendor-store-aaron-otto-2026-05-31.md) (observe loop)                                                                                                                                                                                                                                                              |
| **Windows + Ace + TS distribution** | otto-windows | [B-0824](backlog/P1/B-0824-package-manager-of-package-managers-n-dimensional-dependency-space-holographic-projection-ai-rate-continuous-upstream-negotiation-aaron-2026-05-26.md) (Ace) + [B-0806](backlog/P2/B-0806-ansible-gitops-plus-crossplane-cross-os-declarative-management-for-windows-macs-non-nixos-linux-aaron-2026-05-26.md) (cross-OS / Windows) + the TS-distribution rows (B-0958 §vendor-store + Ace install repo [B-0863](backlog/P2/B-0863-ace-package-manager-one-liner-curl-install-repository-for-fast-moving-tools-hermes-agent-as-canonical-example-aaron-2026-05-27.md)) |
| **zflash USB-ISO hardware install** | vera-codex   | [B-0891](backlog/P1/B-0891-zflash-done-acceptance-criteria-qemu-test-harness-5-scenarios-initial-format-cluster-up-reformat-with-retention-reformat-from-scratch-cluster-joining-aaron-2026-05-28.md) (done-acceptance / QEMU harness) + [B-0844](backlog/P1/B-0844-zflash-agent-mode-native-implementation-close-doc-vs-implementation-gap-aaron-2026-05-26.md) (agent-mode) + [B-0884](backlog/P1/B-0884-integrate-post-quantum-gitcrypt-with-zflash-usb-bound-credential-substrate-b-0852-b-0844-b-0737-aaron-2026-05-28.md) (PQ git-crypt)                                                    |

Three surfaces, three lanes, zero overlap — the B-0959 §0 agent-partition shape
running live: each surface is a shard, `claim acquire` is the join-point, lanes are
the partition, the bus carries claims across machines.

## Lane 1 — Sovereign-DB / agent-loop (otto-cli)

The whole arc lives in **[B-0959](backlog/P1/B-0959-zeta-sovereign-distributed-db-and-agent-loop-master-checklist-one-git-native-zset-substrate-aaron-otto-2026-05-31.md)**:
one git-native Z-set substrate; the unbundled engine (git = storage, the fold =
compute, the time-primitive = coordination — no separate DB binary); the
agent-partition / encrypted-home / bus-product-heartbeat topology; the algebra
ladder (G-Set → Bag → Z-set); the observe loop; the git-native bus; the
distributed-time primitive; the 4-language 4-oracle; dual-mode transport. Remember
one handle: **B-0959**.

## Lane 2 — Windows + Ace + TS distribution (otto-windows)

Getting Zeta to run + distribute beyond macOS/NixOS: the **Ace** package-manager
(B-0824, the n-dimensional dependency manager), **cross-OS / Windows** support
(B-0806), and the **TS distribution itself** (shipping Zeta-as-TS via the Ace
one-liner install repo B-0863 + the B-0958 vendor-store track).

## Lane 3 — zflash USB-ISO hardware install (vera-codex)

The bare-metal install path: **zflash** done-acceptance + the QEMU 5-scenario test
harness (B-0891), agent-mode native implementation (B-0844), and post-quantum
git-crypt USB-bound credentials (B-0884). In flight: PR #6220
(`claim/backlog-0891-zflash-qemu-retention`).

## Coordination discipline

Composes with [B-0892](backlog/P1/B-0892-three-lanes-concurrent-operating-discipline-encryption-plus-zflash-plus-state-machine-substrate-until-each-lane-backlog-drains-per-operator-2026-05-28.md)
(three-lanes-concurrent operating discipline) and
[`agent-roster-reference-card.md`](../.claude/rules/agent-roster-reference-card.md)
(the surface / lane registry). The split-brain guard is
[`claim-acquire-before-worktree-work.md`](../.claude/rules/claim-acquire-before-worktree-work.md).

## Temporary by design

Per the operator (2026-06-01): _"until we get observe.ts all working then it won't
be an issue."_ Once the observe.ts loop coordinates lanes automatically (the bus +
claims + the dashboard's mode-aware Rx views), this manual index is redundant —
keep it current until then, retire it after. It is a bridge, not a permanent
fixture.

## Keeping it current

When a lane finishes or a new lane opens, edit the table + the per-lane sections
here. This is the one place to update so the operator's single-doc stays true. The
bus + open PRs remain the live, always-current source; this doc is the human-memorable
entry point that points at them.
