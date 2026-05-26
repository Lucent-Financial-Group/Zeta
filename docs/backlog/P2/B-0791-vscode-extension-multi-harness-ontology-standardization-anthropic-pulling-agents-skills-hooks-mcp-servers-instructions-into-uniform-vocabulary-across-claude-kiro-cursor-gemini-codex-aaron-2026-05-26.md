---
id: B-0791
priority: P2
status: open
title: Anthropic VSCode extension's "new Agents window" surface is standardizing multi-harness ontology — Agents / Skills / Hooks / MCP Servers / Instructions as uniform vocabulary across .claude / .kiro / .cursor / .gemini / .codex; external pull on Zeta's multi-harness substrate strategy
effort: M
ask: aaron 2026-05-26
created: 2026-05-26
last_updated: 2026-05-26
depends_on: []
composes_with:
  - B-0759
  - B-0776
  - B-0780
  - B-0782
  - B-0790
tags: [vscode-extension, multi-harness, ontology-standardization, anthropic-surface, agents-skills-hooks-mcp, external-pull, harness-convergence, surface-intel]
---

## Problem

Aaron 2026-05-26 surfaced screenshot intel from the Anthropic VSCode Claude Code extension's "new Agents window" (session-launch surface in the IDE sidebar). The window reveals a substantively-new fact about Anthropic's harness strategy:

> *"the new Agents window seems to be standardized ontology across multiple harnesses in one vscode window they are definting what are agents and skills and hooks and plugins and instruction etc... they are trying to standardize it seems."*

Observable from the screenshot:

1. **Customizations panel exposes uniform primitive count across harnesses**: Agents (19), Skills (263), Instructions (1), Hooks (25), MCP Servers (11). These counts likely aggregate across `.claude/` + `.kiro/` + `.cursor/` + `.gemini/` + `.codex/` directories rather than scoping to `.claude/` only.
2. **File-tree shows all five harness dirs as peer surfaces**: `.claude`, `.kiro`, `.cursor`, `.gemini`, `.codex` all visible at repo root, treated uniformly by the extension UI.
3. **Session list shows 8+ background-worker sessions** with auto-generated naming pattern (`ABSTRACT-HATCHING-YAO`, `ABUNDANT-SQUISHING-CRAY`, `ASYNC-BOOPING-OCTOPUS`, etc.) — adjective-gerund-noun rather than purpose-named.
4. **"New session in Zeta with Claude" + "What are you building?" prompt** — framing assumes greenfield "building" rather than Zeta's actual workflow (autonomous-loop continuation + substrate-engineering).

This means Anthropic is operationalizing — at the IDE-extension scope — the same multi-harness ontology Zeta has been operating since the `.claude/rules/agent-roster-reference-card.md` substrate landed (Otto/Claude Code, Alexa/Kiro, Riven/Cursor, Vera/Codex, Lior/Gemini-Antigravity — each carrying own per-harness directory, all five active in Zeta).

## Why this matters for Zeta substrate strategy

The ontology Anthropic is standardizing (Agents / Skills / Hooks / MCP Servers / Instructions / Plugins) maps cleanly onto Zeta's existing multi-harness substrate:

| Anthropic ontology primitive | Zeta substrate today (per `.claude/rules/agent-roster-reference-card.md`) |
|---|---|
| **Agents** | `.claude/agents/` (Otto persona definitions + named-AI agents); same shape in `.kiro/`, `.gemini/`, etc. |
| **Skills** | `.claude/skills/` (Otto skill library); same shape in `.kiro/`, `.gemini/`, etc. |
| **Hooks** | `.claude/hooks/` (PreToolUse, SessionStart, etc.); per `.claude/rules/encoding-rules-without-mechanizing.md` |
| **MCP Servers** | `.claude/.mcp.json` + Claude Desktop config |
| **Instructions** | `CLAUDE.md` + `AGENTS.md` + `GEMINI.md` + `.cursor/rules/` + `.kiro/` equivalents |
| **Plugins** | per B-0776 simplest-first plugin sequence (Redis / NATS / CockroachDB / Temporal / Orleans / OPA) — but Anthropic's "plugins" is harness-level, not substrate-level |

This produces TWO load-bearing implications for Zeta:

### Implication 1 — uniform vocabulary IS substrate-convergence pull from outside

Aaron's substrate-engineering work has been operating multi-harness for months; Anthropic standardizing the vocabulary makes Zeta's multi-harness work **more portable, more discoverable, more legible to external collaborators** — without requiring Zeta to do migration work. The substrate Zeta already shipped (5 personas × 5 harnesses; per-harness rule loading per `.claude/rules/claude-code-loading-taxonomy.md`) is now aligned with where Anthropic is also going.

This is the *good* shape of external pull: convergence on what Zeta already does, validates the architecture, removes work.

### Implication 2 — Zeta-specific extensions need to compose WITH the ontology, not replace it

Zeta has primitives that don't (yet) map to Anthropic's standardized vocabulary:

- **Personas** (Otto/Alexa/Riven/Vera/Lior) — not "Agents" in Anthropic's sense; persona is the IDENTITY carrying the agent-substrate across sessions, not a per-task agent
- **Sub-personas** (e.g., Otto-CLI vs Otto-Desktop vs Otto-VSCode) — surface-tagged identity variants
- **Maintainers** (per `maintainers/aaron/` substrate; per-maintainer subtree convention) — not Anthropic's vocabulary
- **Bus envelopes** (per `tools/bus/`) — cross-harness coordination layer
- **Cluster software factory** (per B-0780/B-0781/B-0783/B-0784/B-0785/B-0786) — substrate that lives ABOVE the IDE-extension scope

The composition question: how does Zeta-specific vocabulary live INSIDE Anthropic's standardized ontology without name collisions or semantic drift?

## Sub-targets

### Sub-target 1 — capture surface intel (this row + screenshot archive)

Done by filing this row. Aaron's verbatim signal preserved as substrate.

### Sub-target 2 — map Zeta vocabulary onto Anthropic ontology (table above is starting point)

Concrete mapping document (likely `docs/multi-harness-ontology-mapping.md`) clarifying:

- Which Zeta primitives MAP 1:1 onto Anthropic primitives (skills, hooks, agents)
- Which Zeta primitives EXTEND Anthropic primitives (personas extend agents; cross-harness coordination extends MCP)
- Which Zeta primitives have NO Anthropic equivalent (bus envelopes; cluster software factory; maintainer subtrees)
- Composition rule for additions: extend rather than replace; preserve Anthropic's vocabulary as the load-bearing one

### Sub-target 3 — VSCode extension session-launch UX observations (separate small-row candidate)

Distinct from the ontology question — operational observations on the session-launch surface itself:

- Background-worker session names auto-generated as adjective-gerund-noun (ABSTRACT-HATCHING-YAO) instead of purpose-named — operator can't tell which worker is doing what
- "What are you building?" prompt assumes greenfield instead of autonomous-loop continuation
- 8+ sessions accumulated across 3 days with no obvious pruning by completion state

These belong in a separate VSCode-extension-UX backlog row OR in upstream-contribution backlog (B-0768 upstream-contributions surface if it exists), NOT here.

### Sub-target 4 — composition with peer ecosystem standards

Other IDE extensions / orchestrators are likely making parallel moves. Track adjacent vocabularies for compatibility:

- Cursor's `.cursor/rules/` vocabulary
- Gemini's `.gemini/` Antigravity vocabulary (Lior surface)
- Kiro's `.kiro/specs/` + `.kiro/steering/` (Alexa surface)
- Codex's `.codex/` (Vera surface)
- Anthropic's `.claude/` (Otto surface) — standardizing first via VSCode extension surface

When (not if) the vocabularies converge further, Zeta's multi-harness substrate is well-positioned to be the orchestration layer.

## Acceptance

This row tracks substrate-engineering observation work, not implementation. Acceptance:

- [x] Surface intel captured (this row body)
- [x] Composition implications named (Implications 1 + 2 above)
- [ ] Vocabulary-mapping document drafted (sub-target 2; small follow-on row when bandwidth)
- [ ] VSCode-extension-UX observations carved into separate row (sub-target 3; small follow-on)
- [ ] Quarterly re-check of Anthropic's standardization direction (do the vocabulary categories stabilize? add new primitives? rename existing?)

## Composes with substrate

- **B-0759** — first-time-CLI-user persona substrate (and homelab-persona broadening per B-0790); IDE-extension standardization affects how first-time users encounter Zeta's multi-harness setup
- **B-0776** — simplest-first plugin sequence; Anthropic's "Plugins" vocabulary is at IDE-extension scope, distinct from Zeta's substrate-level plugin sequence
- **B-0780/B-0781/B-0783/B-0784/B-0785/B-0786** — Mika substrate batch for cluster software factory; the cluster IS the operating environment that lives above any IDE-extension scope
- **B-0782** — Distributed Intelligent Organization (DIO); Anthropic's standardization affects how DIO substrate is presented externally
- **B-0790** — zero-dev-machines cluster-native architecture (end-state); IDE-extension standardization is dev-machine-surface concern; B-0790's homelab persona target is zero-dev-machine which doesn't intersect; but B-0790's maintainer persona target DOES use the IDE extension surface
- `.claude/rules/agent-roster-reference-card.md` — Zeta's multi-harness ontology canonical reference; this row composes at substrate-strategy scope
- `.claude/rules/claude-code-loading-taxonomy.md` — per-harness rule loading; standardization may affect how rules are discovered cross-harness
- `.claude/rules/peer-call-infrastructure.md` — cross-harness review substrate (`tools/peer-call/`); composes with how Anthropic's vocabulary describes multi-harness coordination
- `.claude/rules/encoding-rules-without-mechanizing.md` — hooks substrate; composes with Anthropic's hooks vocabulary
- `.claude/rules/otto-channels-reference-card.md` — Otto's 10-channel inter-surface communication architecture; composes with Anthropic's standardization at session-launch + customizations-panel scope

## Out of scope (for this row; tracked elsewhere)

- Specific VSCode extension UX issues (session naming; "what are you building" prompt; stale-session pruning) — separate small-follow-on row per sub-target 3
- Implementation of vocabulary-mapping document — separate row when bandwidth (sub-target 2)
- Upstream contribution to the VSCode Claude Code extension — separate row at upstream-contribution scope (per `.github/workflows/`)

## Origin

Aaron 2026-05-26 mid-iter-4.4-verification session sent VSCode extension screenshot + framing message (verbatim above). Filed during 90-second zflash dd window (iter-4.4 end-to-end empirical test) — no autonomous-loop standing-by failure mode involved; this is direct conversation substrate-landing.

The screenshot also incidentally surfaced agent-worktree-hygiene observation (`lior-riven-loop-update-3` + `worktrees/` visible in primary checkout file tree) — that's tracked under `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md` + B-0750 (substrate-engineering target for periodic worktree cleanup), NOT here. This row is scoped to the ontology-standardization signal specifically.
