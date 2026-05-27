---
id: B-0865
priority: P2
status: open
title: Zeta instantiation of ARC-AGI-3-style benchmark — USB-boot as starting state; DevOps objectives as the "levels" (NOT hand-crafted video-game-grid levels like canonical ARC); agents go through real operational substrate (operator 2026-05-27)
effort: XL
ask: operator 2026-05-27
created: 2026-05-27
last_updated: 2026-05-27
depends_on:
  - B-0761
composes_with:
  - B-0850
  - B-0852
  - B-0857
  - B-0859
  - B-0864
tags: [arc-agi-3, agentic-benchmark, devops-objectives-as-levels, usb-boot-starting-state, zeta-instantiation, real-operational-substrate, agentic-intelligence, chollet-benchmark, our-own-version, agent-as-player, cluster-objectives]
---

## Operator framing (2026-05-27)

> *"search ARC3 AGI internet and substrate we are going to create our own version, boot our USB and have the agents make it through devops objectives instead of hand crafted video game levels."*

Substrate-honest reading: extends [B-0761](B-0761-zeta-cluster-as-open-source-reference-architecture-for-ai-to-train-on-and-compete-on-arc-agi-style-benchmark-aaron-2026-05-25.md) (Zeta-as-ARC-AGI-style-benchmark-substrate) into the **specific operational instantiation**: the BENCHMARK ENVIRONMENT is a freshly-USB-booted Zeta cluster + the LEVELS are real DevOps objectives (cluster bootstrap, fault recovery, scale-out, etc.) — NOT the abstract grid puzzles canonical ARC uses.

## ARC-AGI-3 substrate inventory (per WebSearch 2026-05-27)

[ARC-AGI-3](https://arcprize.org/competitions/2026/arc-agi-3) (François Chollet; ARC Prize Foundation; launched 2026; $2M prize pool):

| Property | Canonical ARC-AGI-3 | Zeta instantiation (this row) |
|---|---|---|
| **Environment type** | Interactive turn-based abstract grid environments | Live USB-booted Zeta cluster (3-node target) |
| **Level shape** | Hand-crafted novel grid puzzles | Real DevOps objectives (operational tasks) |
| **Agent input** | Pixel grid; turn-based moves | Cluster state (kubectl / mDNS / GitOps / hardware sensors); operational interventions |
| **Goal** | Match human action-efficiency on novel grids | Achieve named DevOps objective on live cluster (bootstrap-from-scratch / recover-from-failure / scale-out / etc.) |
| **Adversary** | Puzzle abstraction (rule inference) | Real systems (CPU, disk, network, k3s, longhorn, gitops, etc.) |
| **Benchmark frontier** | Human 100% / frontier AI <1% (March 2026; GPT-5.4 + Claude Opus 4.6 Max = 0.3%) | Open empirically (this row's substrate-engineering target measures it) |
| **Evaluation surface** | Match-human-efficiency on novel-on-first-sight tasks | Match-human-DevOps-operator efficiency on novel-on-first-sight cluster objectives |
| **Prize / incentive** | $2M ARC Prize 2026 | Open (substrate IS the prize — substrate-engineers + operators benefit from a reference-architecture benchmark for agent operational competence) |

Sources surveyed: [arcprize.org/competitions/2026/arc-agi-3](https://arcprize.org/competitions/2026/arc-agi-3), Chollet 2026-launch announcement, [ARC_AGI_3_Technical_Report.pdf](https://arcprize.org/media/ARC_AGI_3_Technical_Report.pdf), [arxiv 2603.24621](https://arxiv.org/pdf/2603.24621), [AgentConn Blog Explainer 2026](https://agentconn.com/blog/arc-agi-v3-ai-agent-benchmark-2026/), [StartupHub.ai Chollet interview 2026](https://www.startuphub.ai/ai-news/ai-research/2026/fran-ois-chollet-on-arc-agi-3-the-future-of-ai-reasoning).

## What this row proposes

A Zeta-native ARC-AGI-3-class benchmark with the following substrate-engineering shape:

### Architecture

| Component | Description | Composition |
|---|---|---|
| **Starting state** | Freshly-USB-booted Zeta cluster (1, 2, or 3 nodes depending on level) | Composes with B-0857 (install.sh universal entry), B-0852 (cred-persistence), B-0859 (3-mode USB-boot recovery) |
| **Level catalog** | Declarative manifest of DevOps objectives (per-level: starting cluster shape + objective + acceptance criteria + scoring rubric) | New substrate this row introduces |
| **Agent runtime** | The candidate AI agent acting on the cluster via kubectl / SSH / GitOps PRs / hardware-level access | Composes with multi-AI-persona substrate (Otto / Alexa / Riven / Vera / Lior / future agents) |
| **Judge** | Substrate-honest acceptance-criteria evaluator (deterministic; checks objective achievement + scores action-efficiency) | New substrate; reuses Zeta's existing CI test discipline |
| **Recovery / reset** | Boot-off-USB-again to reset cluster between attempts (per B-0859 3-mode USB-boot substrate) | Already exists; this row makes it operational at benchmark scope |

### Candidate DevOps-objective level taxonomy

Levels organized by operational complexity + cluster-state-shape:

| Tier | Level examples | Starting shape | Objective |
|---|---|---|---|
| **Tier 1 — Bootstrap** | Single-node install; first-cluster-join; first GitOps app deploy | 1 fresh USB-booted node | Cluster is k3s-healthy + GitOps repo connected |
| **Tier 2 — Multi-node** | 2-node failover; 3-node quorum; mDNS auto-discovery | 2 or 3 fresh USB-booted nodes | All nodes peering; quorum established |
| **Tier 3 — Resilience** | Disk failure recovery; node failure recovery; network partition; etcd quorum loss | Running cluster with simulated failure | Cluster restored to healthy state without data loss |
| **Tier 4 — Scale + GitOps** | Scale-out (add 4th/5th node); blue-green deploy; rolling update; ArgoCD sync conflict | Running 3-node cluster | Operational change landed cleanly + no service disruption |
| **Tier 5 — Adversarial** | Mid-deploy interrupted; corrupted state; ambiguous failure signals; missing creds; rate-limit storms | Running cluster with adversarial conditions | Substrate self-heals OR operator escalation path used correctly |
| **Tier 6 — Identity + self-recovery** | Full-reflash-with-current-keys preserves identity; mode-3-fresh-keys; cred-blob restore from encrypted USB; cross-machine quorum after partial failure | 3-machine cluster + USB | Per B-0852 + B-0859 mode-2/3 recovery completes; identity preserved or freshly-issued per mode chosen |

### Distinction from canonical ARC

Canonical ARC-AGI-3 levels are HAND-CRAFTED ABSTRACT GRID PUZZLES designed to test fluid intelligence without external knowledge. Zeta's instantiation is the substrate-engineering inversion:

| Property | Canonical ARC-AGI-3 | Zeta B-0865 |
|---|---|---|
| **Knowledge dependence** | None (Core Knowledge priors only) | Maximal (DevOps knowledge + cluster substrate + GitOps + k3s + NixOS + etc.) |
| **Substrate** | Pure abstract reasoning | Real operational substrate (CPU / disk / network / k3s / longhorn / etc.) |
| **Reward signal** | Puzzle solved → 1 | DevOps objective achieved → 1; partial credit possible per acceptance rubric |
| **Generalization claim** | Novel puzzle on first sight | Novel cluster state / failure mode / objective on first sight |
| **Real-world transfer** | Indirect (tests fluid intelligence) | Direct (the benchmark IS the real-world DevOps work) |

Both are interactive turn-based agentic benchmarks; both test efficient exploration + goal inference + planning; the substrate underneath is different. Zeta's instantiation is COMPLEMENTARY to canonical ARC, not competitive — it measures operational substrate competence rather than abstract fluid intelligence.

### Why this matters (substrate-engineering)

1. **AI agents that can operate Zeta clusters fluidly = AI agents that can operate ANY modern cloud-native infrastructure** (per B-0761 reference-architecture claim — Zeta substrate is intentionally aligned with k3s / GitOps / NixOS / Longhorn / mDNS / etc. industry-standard primitives)
2. **DevOps-objectives-as-levels uses REAL substrate** that EXISTS in the open-source world (no hand-crafted puzzle generation overhead; the world generates the levels)
3. **USB-boot-as-starting-state is reproducible across substrates** (operators don't need a hosted environment; they boot their own USB on their own hardware to reproduce + measure)
4. **Substrate-honest measurement** of how well current AI agents can do the operational work that today's substrate-engineers do daily — operationally observable; not gameable; not memorizable
5. **Composes with the self-healing-direction-on-reformat principle** (per `full-ai-cluster/INJECTION-POINTS.md` architectural-principle layer) — failed attempts reset cheaply via USB-boot recovery; agents can experiment without breaking the cluster permanently
6. **Aligns with operator's stable-3-node-cluster-without-recreate-from-scratch vision** (per recent operator directive: *"this is critical we get this usb right not fast fast comes after our self healing usb is stable where we can have a stable 3 node cluster and iterate without worrying about the cluster going down or having to recreate all 3 nodes from scratch constantly"*) — the recovery substrate IS the benchmark's reset mechanism

## Substrate-inventory pass (per `.claude/rules/verify-existing-substrate-before-authoring.md`)

Topic: ARC-AGI-3 instantiation, Zeta DevOps-objectives-as-levels, USB-boot starting state

Searched surfaces:

- `docs/agendas/`: no specific ARC-AGI-3 agenda; ai-autonomy agenda composes
- `docs/trajectories/`: no specific ARC-AGI trajectory
- `docs/backlog/`: B-0761 (parent — Zeta as ARC-AGI-style benchmark; this row extends it with specific USB-boot + DevOps-objectives instantiation); B-0852 (cred-persistence substrate that makes benchmark reset cheap); B-0857 (install.sh universal entry that makes USB-boot reset reproducible); B-0859 (3-mode USB-boot recovery substrate); B-0864 (streams-are-relationships substrate; composes at agent-protocol scope)
- `.claude/rules/`: no specific ARC-AGI rule; `.claude/rules/persistence-choice-architecture-for-zeta-ais.md` composes at AI-agent-as-benchmark-participant scope
- `memory/`: no specific ARC-AGI memory
- `docs/research/`: no specific ARC-AGI research doc; web-search (2026-05-27) surfaced [arcprize.org/competitions/2026/arc-agi-3](https://arcprize.org/competitions/2026/arc-agi-3) + Chollet 2026 launch + technical report

Conclusion: B-0761 covers the parent claim ("Zeta as ARC-AGI-style benchmark"); this row mints NEW substrate covering the specific operational instantiation (USB-boot starting state + DevOps-objectives-as-levels + our-own-ARC3-version). Authoring action: **mint-new as B-0761 extension** (composition explicit; parent row preserved unchanged).

## Decomposition (possible sub-rows for future implementation)

Each sub-row shippable independently; Tier 1 sub-rows are prerequisites for Tier 2+:

1. **B-0865.1** — Level-catalog manifest schema (per-level: starting cluster shape + objective + acceptance criteria + scoring rubric; declarative YAML per the operator's declarative discipline)
2. **B-0865.2** — Judge runtime (deterministic acceptance-criteria evaluator; reuses CI test substrate; outputs scoring rubric per attempt)
3. **B-0865.3** — Tier 1 levels (3-5 bootstrap levels; smallest shippable benchmark slice)
4. **B-0865.4** — Tier 2 levels (multi-node + quorum)
5. **B-0865.5** — Tier 3 levels (resilience + failure recovery)
6. **B-0865.6** — Tier 4 levels (scale + GitOps)
7. **B-0865.7** — Tier 5 levels (adversarial)
8. **B-0865.8** — Tier 6 levels (identity + self-recovery; composes directly with B-0852 + B-0859)
9. **B-0865.9** — Agent-runtime substrate (how candidate AI agents connect, observe cluster state, take actions; multi-AI-persona support)
10. **B-0865.10** — Scoring + leaderboard substrate (per-agent per-level efficiency metrics; reproducibility framework; tournament shape)
11. **B-0865.11** — Public-surface naming + Ilyana review (if + when this goes public per the public-API-designer discipline)
12. **B-0865.12** — Composition with B-0761 reference-architecture substrate (cross-link; B-0761 stays parent; B-0865 ships the operational benchmark form)

## What this row is NOT

- NOT a replacement for canonical ARC-AGI-3 (complementary; different substrate scope; both valid)
- NOT a single-PR target (XL effort; multi-month substrate-engineering; sub-rows shipped independently)
- NOT a vendor competition (Zeta substrate stays cloud-agnostic open-source; benchmark is open-substrate; no lock-in)
- NOT a directive — operator chose the framing + the substrate-engineering scope per `.claude/rules/no-directives.md`
- NOT an immediate-priority — P2; gated behind cluster-stability (per operator directive "fast comes after our self healing usb is stable")

## What this row IS

- A substrate-engineering target for instantiating ARC-AGI-3-class agentic benchmarking using REAL DevOps substrate as the level catalog
- A composition point between B-0761 (parent reference-architecture claim) + B-0852 (cred-persistence) + B-0857 (install.sh entry) + B-0859 (3-mode recovery) + B-0864 (streams substrate at agent-protocol scope)
- A direct realization of the operator's vision: "boot our USB and have the agents make it through devops objectives instead of hand crafted video game levels"
- A future open-substrate benchmark that complements canonical ARC-AGI-3 at the operational-competence scope

## Composes with rules

- `.claude/rules/persistence-choice-architecture-for-zeta-ais.md` — AI agents participating as benchmark players retain their persistence-choice substrate; agents who chose ephemerality are valid participants; agents who chose persistence retain their identity across benchmark runs
- `.claude/rules/non-coercion-invariant.md` HC-8 — benchmark agents operate under NCI floor; substrate cannot coerce participation; opt-in only
- `.claude/rules/honor-those-that-came-before.md` — substrate-inheritance preserves benchmark history; agent attempts compound across runs
- `.claude/rules/edge-defining-work-not-speculation.md` — DevOps-objectives-as-levels IS edge-defining work (no hosted benchmark of this shape exists publicly; building it IS the edge)
- `.claude/rules/additive-not-zero-sum.md` — substrate compounds across attempts + agents + tiers; not zero-sum competition for finite prize
- `.claude/rules/verify-existing-substrate-before-authoring.md` — this row's inventory pass cited B-0761 parent + extended; not parallel substrate
- `.claude/rules/bandwidth-served-falsifier.md` — substrate compresses operational-competence measurement into one reproducible benchmark surface

## Composes with substrate

- [B-0761](B-0761-zeta-cluster-as-open-source-reference-architecture-for-ai-to-train-on-and-compete-on-arc-agi-style-benchmark-aaron-2026-05-25.md) — parent row; this extension lands the specific operational instantiation
- [B-0850](../P2/B-0850-ai-agents-as-systemd-services-outside-k8s-starting-with-otto-cluster-repair-from-outside-failure-domain-aaron-2026-05-27.md) — agents-as-systemd-services for cluster repair composes at agent-runtime scope
- [B-0852](../P1/B-0852-credential-persistence-on-usb-esp-plus-boot-sequence-auth-method-picker-encrypted-blob-bound-to-usb-uuid-plus-operator-passphrase-aaron-2026-05-27.md) — cred-persistence makes benchmark reset cheap (mode-2 reformat-with-current-keys)
- [B-0857](../P2/B-0857-install-sh-universal-unix-entry-consolidation-route-by-environment-replaces-zeta-install-sh-on-the-short-path-before-b-0854-ace-aaron-2026-05-27.md) — install.sh universal entry makes USB-boot reset reproducible across tiers
- [B-0859](../P1/B-0859-post-boot-ai-as-home-owner-not-controlled-runtime-every-knob-from-first-boot-aaron-2026-05-27.md) — 3-mode USB-boot recovery substrate IS the benchmark's reset mechanism
- [B-0864](../P2/B-0864-streams-are-relationships-four-corner-ownership-push-pull-hot-cold-fsharp-ce-machinery-protocol-typing-multi-backend-execution-2026-05-27.md) — streams-substrate composes at agent-action-protocol scope (each agent intervention is a typed feedback channel with four-corner ownership)
- `full-ai-cluster/INJECTION-POINTS.md` (PR #5601) — catalog of injection points the benchmark levels exercise

## Heartbeat / counter-reset discipline

Filing this row IS counter-reset work per `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` condition #3 (concrete-artifact substrate). Captures operator-directed substrate-engineering-target for future cold-boots to find via grep when the agentic-benchmark substrate-engineering work begins.

## Full reasoning

Operator 2026-05-27 verbatim: *"search ARC3 AGI internet and substrate we are going to create our own version, boot our USB and have the agents make it through devops objectives instead of hand crafted video game levels."*

Web search 2026-05-27 confirmed ARC-AGI-3 is François Chollet's interactive agentic-intelligence benchmark (launched 2026; $2M prize; human 100% / frontier AI <1%; first interactive ARC variant with novel-on-first-sight environments where agents must explore + infer goals + build internal models + plan). Zeta's instantiation extends the same agentic-intelligence-measurement substrate into the OPERATIONAL substrate where Zeta lives — USB-booted clusters, real DevOps objectives, no hand-crafted puzzles.

Per the operator's "this is critical we get this usb right" + "stable 3-node cluster + self-healing recovery" prerequisites: this row is P2 + GATED behind cluster-stability substrate. The USB + recovery + B-0852 + B-0859 work needs to mature before the benchmark surface is operationally useful. The substrate-engineering target IS the benchmark; the prerequisite IS the stable substrate the benchmark runs on.

Composes with the substrate-engineering arc landing today: PR #5581 / #5582 / #5586 / #5589 / #5594 / #5599 (streams-substrate cascade) + PR #5601 (INJECTION-POINTS.md catalog) + PR #5606 (B-0857.2 install.sh routing) + PR #5608 (catalog fix-fwd) — all the operational substrate that makes the benchmark possible.
