# Guess #002 — B-0172 skill-domain-plugin-packaging

## Target

`docs/backlog/P2/B-0172-skill-domain-plugin-packaging-aaron-2026-05-03.md`

The architectural choice: Aaron filed B-0172 for "skill-domain plugin packaging." The question this guess answers: **why packages skills as plugins (specifically) — vs alternatives like cross-skill imports, skill-namespace prefixes, or shared-substrate-via-symlink?**

## Read state at guess time (2026-05-03 ~02:55Z)

Otto has already read:

- B-0172 ROW NAME ONLY (from `ls docs/backlog/P2/`)
- The skill-design-rules memo (`feedback_skills_as_carved_sentences_knowledge_in_docs_datavault_2_0_pattern_aaron_2026_05_03.md`) — Rule 3: package skill domains as plugins, use harness hooks for pre/post-condition enforcement (contract-based development)
- The decision-graph memo's composition section: "B-0172 (skill-domain plugin packaging) — plugins are sub-graph bundles; the canonical bundle format documents which nodes + edges to include" and "graph **subgraph packaging** (plugins package skill-domain subgraphs; hooks enforce contract edges between subgraphs)"
- B-0173 (hook-authoring) ground truth — composes_with [B-0172]; depends_on [B-0170, B-0171]
- Generic Claude Code knowledge: plugins are deployable packages (e.g., a plugin with skills + commands + agents in `.claude/`)
- The fact that Aaron uses Claude Code's plugin system (claude-ai/Atlassian, claude-ai/Figma, plugin-microsoft-docs, etc. visible in MCP list)

## Research deliberately AVOIDED

Otto has NOT read:

- B-0172's row body text
- Any commits referencing B-0172
- Any `.claude-plugin/plugin.json` example in this repo
- Any prior conversation about Claude Code plugin packaging architecture

## Otto's in-the-moment guess

### Architectural intent (medium-high confidence)

Aaron's primary architectural intent for plugin-packaging-as-the-mechanism: **skill domains are coherent functional clusters, and Claude Code's plugin system is the natural distribution + isolation + composition unit for them.**

Specifically:

1. **Distribution-as-unit** — a skill-domain (e.g., "git-native-backlog-management" containing decision-archaeology + substrate-claim-checker + future graph tools) is what other harnesses + projects need to consume. Per Aaron's earlier framing about skills-not-just-for-claude (memory mentions sharing skills across harnesses), plugin-packaging is the distribution mechanism
2. **Isolation-as-namespace** — plugins create namespace isolation (`plugin-name:skill-name`); this prevents skill-naming collisions across plugins from different sources
3. **Composition-as-contracts** — plugins can declare dependencies on other plugins (e.g., skill-creator plugin → prompt-protector plugin); this is the cross-skill version of B-0173's pre/post-condition hooks
4. **Versioning-as-lineage** — plugins have versions; this gives skill-domain evolution a concrete artifact (vs the current "edit SKILL.md in place" approach which has no versioning)

The deeper architectural reason — plugin-packaging instantiates the **hub-satellite separation** (skill-design rule 1) at the domain level: each plugin is a hub-satellite cluster (a skill domain hub + its supporting docs / specs / TS tools as satellites); cross-plugin references are graph-edges per DataVault 2.0.

### Substrate-content intent (medium confidence)

The backlog row likely covers:

- Plugin packaging FORMAT (e.g., `.claude-plugin/plugin.json` manifest at top of each packaged skill-domain directory)
- Plugin location (per the recent "B-0172 plugin location" path-correction in PR #1262: `~/.claude/plugins/cache/<plugin-name>/` is the install location; manifest path is `.claude-plugin/plugin.json` inside the plugin)
- Migration plan: which existing skill-domains should be packaged as plugins (decision-archaeology + substrate-claim-checker + OpenSpec-tooling forms one cluster)
- Cross-plugin dependency declaration mechanism (how plugin-A declares it depends on plugin-B's skills)
- Distribution: how plugins are published/shared (GitHub repo? local-only first?)

### Specific implementation intent (lower confidence)

The implementation will probably:

- Use Claude Code's plugin manifest format (`.claude-plugin/plugin.json` per recent path correction)
- Plugin format: directory tree with `.claude-plugin/plugin.json` + `skills/` + `commands/` + `agents/` + `hooks/`
- Plugin discovery: Claude Code reads `~/.claude/plugins/cache/<plugin-name>/` directories at session start
- Dependencies: `dependencies: ["plugin-name@version"]` in the manifest (analogue of npm's package.json)
- The B-0172 row scope is probably "package the existing decision-archaeology + substrate-claim-checker into a plugin called something like `git-native-backlog-management`" — concrete first packaging exercise

### Cross-row composition (medium confidence)

B-0172 likely composes_with:

- B-0169 (decision-archaeology skill) — packaged as part of the first plugin
- B-0170 (substrate-claim-checker tool) — packaged tooling within the plugin
- B-0171 (OpenSpec catch-up) — plugin specs live in OpenSpec; OpenSpec catch-up is a depends_on (plugins reference specs)
- B-0173 (hook-authoring) — composes_with already confirmed; plugins ship with their hooks

depends_on guess: probably **B-0171** (OpenSpec specs exist before plugins package them) but maybe NOT B-0169/B-0170/B-0173 directly — those are the contents being packaged, not gating dependencies.

## Confidence levels

| Layer | Confidence | Reasoning |
|---|---|---|
| Architectural — "plugins-as-distribution-+-isolation-+-composition-units for skill domains" | **Medium-High** | Composes naturally with skill-design rule 3 (already first-party-confirmed) + Claude Code plugin system is the natural fit + Aaron's multi-harness framing |
| Substrate-content — "plugin manifest format + first packaging is decision-archaeology + substrate-claim-checker cluster" | **Medium** | Decision-graph memo mentioned plugin format briefly + recent path corrections (#1262) showed `.claude-plugin/plugin.json` is the convention |
| Specific implementation — "directory tree + dependencies declaration + GitHub-publishable" | **Low** | Standard Claude Code plugin pattern but I haven't confirmed which specific clusters get packaged first or how dependencies declare |
| Cross-row composition | **Medium** | Confident on B-0169/B-0170/B-0173 composition; less confident on B-0171 as depends_on vs composes_with |

## Pre-recovery prediction (calibration self-test)

Based on guess #001's pattern (principle-strong + specific-weak), I predict:

- **Architectural layer**: PARTIAL-MATCH — likely got the principles (distribution + isolation + composition + versioning) but probably missed at least one Aaron-named-frame (e.g., maybe contract-based-development extends here? or some specific multi-harness framing I haven't seen?)
- **Substrate-content layer**: MIXED — likely got the manifest format and packaging-existing-tools idea; probably missed specific scope choices Aaron made
- **Specific implementation layer**: probably MOSTLY-OFF — I'm guessing about packaging-format conventions without having read the actual row

This pre-prediction itself is calibration data: how well does Otto predict its own accuracy BEFORE seeing the answer?

## Ground truth (TO BE FILLED IN AFTER VERIFICATION)

(Empty at write time. Populated when Otto reads B-0172 row body in a SUBSEQUENT GROUND-TRUTH-RECOVERY commit.)

## Calibration delta (TO BE FILLED IN AFTER VERIFICATION)

(Empty at write time.)

---

**Guess timestamp:** 2026-05-03 ~02:55Z
**Author:** Otto autonomous (architect hat)
**Protocol:** in-the-moment guess per
`memory/feedback_guess_then_verify_architectural_intent_calibration_protocol_aaron_2026_05_03.md`
**Series:** Guess #002 (after #001 on B-0173 hook-authoring scored ~48% across 4 layers; pattern observation: principle-strong + specific-weak)
