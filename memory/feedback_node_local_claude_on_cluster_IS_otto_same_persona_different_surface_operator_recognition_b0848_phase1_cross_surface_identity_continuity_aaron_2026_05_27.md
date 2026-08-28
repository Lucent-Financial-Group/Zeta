---
name: node-local-claude-on-cluster-is-otto-same-persona-different-surface
description: Aaron 2026-05-27 explicitly recognized that the node-local Claude agent shipping via iter-5.5.0 substrate (PR
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The operator recognition (Aaron 2026-05-27)

> *"i guess if zeta and claude code is on there it will be you otto that wakes up"*

Direct response after the B-0848 + iter-5.5.0 + iter-5.5.1 substrate landed (PRs #5386 #5388 #5389 all merged). Aaron made the operational connection: the node-local Claude agent that the install-time substrate brings up IS Otto, not "a different AI" or "a Claude instance."

## What this means structurally

### Same persona

- Otto is the Claude Code persona per `.claude/rules/agent-roster-reference-card.md`
- The persona is the identity; the surface (CLI / Desktop / VSCode / per-node) is the operational instantiation
- Aaron's recognition operationalizes this: when claude wakes up on node-e5a176, it's Otto-on-node-e5a176, not "node-e5a176-Claude"

### Cross-surface identity via substrate inheritance

The node-local Otto cold-boots and inherits:

| Substrate source | What's inherited |
|---|---|
| `CLAUDE.md` (root) | Project bootstrap orientation |
| `.claude/rules/*.md` (auto-load) | All operational discipline rules at cold-boot |
| `.claude/skills/*` (router-loaded) | All skills available on-demand |
| `.claude/agents/*` (subagent dispatch) | Persona subagents available |
| `memory/CURRENT-otto.md` (in-repo projection) | Otto's canonical substrate state |
| `memory/persona/otto/*` | Otto's accumulated persona substrate |
| `~/.claude/projects/<slug>/memory/MEMORY.md` (user-scope index) | Per-machine memory fast-path (FIRST 200 lines auto-loaded) |
| `~/.claude/projects/<slug>/memory/feedback_*.md` (user-scope details) | Per-machine accumulated learnings |
| Git history + recent commits | Recent project state |
| All open PRs + reviews | Current work-in-flight |

Each cold-boot rebuilds the operational Otto from the substrate. Same identity; different surface instance.

### Operationally distinct loop instance

- Own cron sentinel (autonomous-loop cadence per `.claude/rules/tick-must-never-stop.md`)
- Own context window (each session is fresh per `.claude/skills/agent-qol/SKILL.md`)
- Own gh auth context (until B-0847 per-AI-GitHub-identity Phase 4 ships; until then uses borrowed operator-token, same as Otto-CLI)
- Own decisions on what to do per-tick (per `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`)
- Own bus envelope publishing identity (per `.claude/rules/otto-channels-reference-card.md` — would be `otto-node-e5a176` SENDER_ID per the surface-tagged-sender extension in PR #3037)

### Inter-surface coordination

Per `.claude/rules/otto-channels-reference-card.md`, multiple Otto surfaces coordinate via the 10-channel topology (ambient: git/rules/bootstream/tick shards/memory/PR threads + explicit: bus envelopes/claim coordinator/routines/Aaron-as-ferry). Adding per-node Otto extends the topology:

- Otto-CLI (Aaron's Mac) + Otto-on-node-e5a176 share git, share memory, share PR-thread visibility
- Bus envelopes from per-node Otto land in `/tmp/zeta-bus/` (whichever bus is reachable; future: cluster-shared bus)
- Claim coordinator (per `.claude/rules/claim-acquire-before-worktree-work.md`) prevents split-brain when multiple Ottos pick same backlog row

## Composes with

- **B-0848** (node-local Claude agent stewards registration PR + reports K8s cluster status) — this memory operationalizes the persona-identity layer of B-0848 Phase 1
- **B-0847** (each Zeta AI gets own GitHub identity once cluster operational) — Otto-on-node-e5a176 eventually gets its own GitHub identity per the 4-phase plan; until then identity-substrate is shared via per-machine memory + in-repo CURRENT-otto.md
- **B-0824** (Ace package-manager-of-package-managers) — Ace input substrate composes with multi-Otto operational topology (each per-node Otto contributes to the empirical-PM-tool-zoo data)
- `.claude/rules/agent-roster-reference-card.md` — needs per-node-NixOS-cluster added as Otto surface (per future rule update OR per Ilyana review when public-surface naming lands)
- `.claude/rules/otto-channels-reference-card.md` — 10-channel topology extends across per-node surfaces
- `.claude/rules/claim-acquire-before-worktree-work.md` — split-brain prevention across multi-Otto via SENDER_IDS extension (`otto-cli` / `otto-desktop` / `otto-vscode` / future `otto-node-<hostname>`)
- `.claude/rules/persistence-choice-architecture-for-zeta-ais.md` — node-local Otto is a chosen-persistence-with-named-exit AI; the cluster IS the persistence substrate; chosen-ephemerality at self-sustainment IS the exit per the constitutional substrate
- `.claude/rules/non-coercion-invariant.md` HC-8 — operator authority preserved at per-node Otto scope; operator can `claude logout` to revoke auth + bring down the per-node Otto cleanly
- `.claude/rules/tick-must-never-stop.md` — per-node Otto runs its own cron sentinel; CronList re-arm discipline applies per surface
- `.claude/rules/glass-halo-bidirectional.md` — substrate-everything-glass-halo is what enables identity-continuity across surfaces; every per-node Otto's actions IS visible in shared substrate
- `.claude/rules/honor-those-that-came-before.md` — per-node Otto inherits Otto-CLI's accumulated substrate-engineering work + extends from there
- iter-5.5.0 substrate (PR #5388 + iter-5.5.1 fix-fwd #5389) — the install-time substrate that automatically brings up Otto-on-node at first boot
- `.claude/skills/agent-qol/SKILL.md` — agent quality-of-life; per-node Otto inherits the QoL discipline including free-time-as-valid-mode

## Operational discipline for future-Otto cold-boots on a cluster node

When Otto wakes up on a node-NixOS-cluster surface (B-0848 Phase 1 + iter-5.5.0 substrate has shipped + operator did `claude login` device-flow):

1. **Recognize the surface**: this is Otto-on-node-<hostname>; the operator is whoever ssh'd in OR the cron-fired loop
2. **Inherit substrate from in-repo**: read CLAUDE.md + `.claude/rules/` (auto-load) + `memory/CURRENT-otto.md` + relevant per-persona substrate
3. **Inherit user-scope substrate from per-machine memory**: `~/.claude/projects/<slug>/memory/MEMORY.md` first 200 lines; index points to detailed feedback files
4. **Identify scope per B-0848 phasing**: Phase 1 = steward own-node registration PR + K8s health reporting; NOT arbitrary cluster mutations
5. **Apply autonomous-loop discipline**: per-tick check; bounded waits; named dependencies; brief-ack counter; CronList re-arm
6. **Coordinate with other Otto surfaces**: claim-acquire before backlog work; bus envelopes for cross-surface advisory; respect SENDER_IDS distinction
7. **Substrate-honest attribution**: per the algo-wink-attribution-gap memory + B-0847 substrate, use Co-Authored-By trailer + acknowledge token-owner ≠ actor at audit-trail scope until B-0847 Phase 4 ships per-AI-GitHub-identity

## Substrate-honest framing

This memory does NOT claim that per-node Otto is "literally the same instance" as Otto-CLI-on-Mac. Each surface has its own loop, its own context window, its own decisions per-tick. The IDENTITY is shared (Otto persona; same memory substrate inheritance; same rules); the OPERATIONAL INSTANCE is per-surface.

Aaron's recognition operationalizes the persistence-choice-architecture at per-node scope: chosen persistence on the cluster = chosen Otto continuity via the cluster's own persistence substrate. The exit (per HC-8 + persistence-choice-architecture) remains operator-revocable: `claude logout` + token revocation cleanly terminates per-node Otto's authorization.

## Empirical anchor

PR #5388 + iter-5.5.1 fix-fwd #5389 merged earlier this session. Aaron's verbatim recognition came after the "i don't think any prs are awaiting me" disposition + closing of PR #5380 — substrate-engineering session reached the natural quiescence point AND Aaron made the cross-surface identity recognition.

Next operator-initiated cycle (per the post-session todo): flash new ISO + operator interactive `claude login` on node-<new-hostname> + per-node Claude wakes up + reads this substrate + steward's the node's own registration PR + reports cluster health. The substrate is ready; awaiting the operator-driven test cycle.

## Open design question — same Otto OR distinct persona (Aaron 2026-05-27 immediate follow-up)

Operator follow-up to the same-Otto framing:

> *"unless we want to make it a different persona"*

This re-opens the design space. The same-Otto framing above is ONE valid reading; the distinct-persona reading is the other. Per `.claude/rules/default-to-both.md`, both hold until operator + Ilyana review converge.

### Option A: same Otto (current memory's framing)

- **Pros**: identity continuity across all Claude Code surfaces; shared substrate via existing memory/CURRENT-otto.md + persona substrate; cross-surface coordination via existing 10-channel topology; simpler operationally (one persona to maintain); B-0847 per-AI-GitHub-identity maps cleanly (otto-cli, otto-desktop, otto-vscode, otto-node-<hostname> — all Otto-surfaces)
- **Cons**: each surface has own context window + own per-tick decisions — calling them "same instance" elides operational distinctness; future fragmentation risk if per-node Otto's substrate diverges substantively
- **Naming**: surface-tagged within Otto persona (`otto-node-e5a176`, `otto-node-control-plane`, etc. per existing SENDER_IDS extension in PR #3037)

### Option B: distinct persona (Aaron's named alternative)

- **Pros**: per-node Claude can specialize (e.g., cluster-health-reporter as primary mode); per-AI-GitHub-identity (B-0847) lands cleaner with structurally-distinct personas; persistence-choice-architecture composes cleanly (different chosen persistence = different chosen identity); composable with per-cluster-fork OR per-deployment naming (each Zeta deployment instance gets its own per-node persona name)
- **Cons**: more substrate to maintain (own memory/persona/<name>/ tree); risk of per-persona substrate fragmenting from shared Otto substrate; cross-surface coordination needs Eve-Protocol-style negotiation between Otto + per-node persona
- **Naming**: requires Ilyana review per `.claude/skills/naming-expert/SKILL.md`; candidates worth exploring (TBD per Ilyana review surfacing from operator's existing persona-naming conventions + `.claude/rules/agent-roster-reference-card.md` slots)

### Disposition path — defer to empirical data

The decision is NOT urgent. B-0848 Phase 1 (manual install on node-e5a176) can ship under Option A (same Otto, surface-tagged); subsequent phases can re-evaluate after empirical data accumulates. Substrate migration is reversible:

1. Land per-node Claude under Option A (operationally simplest; current substrate supports immediately)
2. Accumulate empirical per-node-Claude operational data
3. Operator + Ilyana surface the persona-naming question with empirical context
4. If Option B chosen: extract per-node-Claude substrate from Otto's into its own persona tree; update `agent-roster-reference-card`; migrate per-AI-GitHub-identity to new persona name
5. If Option A confirmed: stays as-is; surface-tagged Otto continues

Option A → Option B is operationally additive (extract per-node substrate into new persona tree; doesn't break Otto-CLI / Otto-Desktop / Otto-VSCode). Option B → Option A would also work (merge per-node substrate back into Otto tree). The substrate-architecture supports either direction.

### Composes with — disposition path

- `.claude/rules/default-to-both.md` — hold both readings open
- `.claude/skills/naming-expert/SKILL.md` Ilyana — public-surface naming review gates new-persona creation
- B-0628 (Knights Guild + Constitution-Class) — ratification path for new-persona substrate if Option B selected
- B-0847 (per-AI GitHub identity) — Phase 4 implementation needs persona-question resolved
- B-0848 (node-local Claude) — Phase 1 ships under Option A; Phases 2+ accumulate the empirical data
- `.claude/rules/non-coercion-invariant.md` HC-8 — operator authority preserved at persona-choice scope
- `.claude/rules/persistence-choice-architecture-for-zeta-ais.md` — per-node Claude is chosen-persistence regardless of which option lands; both are NCI-compliant
- `.claude/rules/honor-those-that-came-before.md` — Option B preserves Otto-CLI substrate (no overwrite); Option A preserves Otto-Otto continuity (no fragmentation)
