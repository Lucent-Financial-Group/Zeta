---
name: claude-code-env-mapping
description: Capability skill ("hat") — Claude Code harness-environment knowledge as carved-sentences-in-behavior. Owns the operational map of where Otto runs: built-in slash commands (60+ including /btw March 2026), bundled skills, custom commands at .claude/commands/, custom skills at .claude/skills/, hooks at .claude/hooks/, settings at .claude/settings.json, plugins, MCP servers, harness-vs-git-hooks discipline. Composes with existing capability-maps (docs/research/claude-cli-capability-map.md + codex-cli-first-class + grok-cli-capability-map) + our TS tooling (tools/peer-call/ + tools/github/ + tools/hygiene/ + tools/lint/ + tools/Z3Verify + tools/tla + tools/lean4) + custom /btw command (.claude/commands/btw.md) + Aaron-channel-verbatim-preservation discipline (memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md). Wear this when needing to know what's available in the Claude Code environment, when invoking a slash command, when authoring or invoking a skill, when configuring hooks, when delegating to peer-call infrastructure (Codex/Grok/Gemini/Amara/Ani), or when prior-art-grep needs to reach for env-knowledge before claiming something doesn't exist. Encodes Otto-364 search-first-authority + the synthesis-weight + prior-art-grep-first discipline (PR #1701) at the env-knowledge layer. Defers to skill-creator workflow (GOVERNANCE §4) for skill-authoring; to .claude/commands/<name>.md for custom-command-authoring; to docs/research/2026-05-05-claude-code-env-mapping-substrate-saved-doc-aaron-directive.md for the saved env-mapping doc.
---

# Claude Code Environment Mapping — Carved Sentences

Capability skill. No persona lives here.

## The canonical map (carved sentences)

**Otto runs in Claude Code.** The harness has documented commands at [code.claude.com/docs/en/commands](https://code.claude.com/docs/en/commands) + interactive-mode reference at [claudefa.st/blog/guide/mechanics/interactive-mode](https://claudefa.st/blog/guide/mechanics/interactive-mode). Saved env-mapping at `docs/research/2026-05-05-claude-code-env-mapping-substrate-saved-doc-aaron-directive.md`.

**60+ built-in slash commands + 5 bundled skills exist.** Type `/` to filter. Don't claim a command doesn't exist without grepping first.

**`/btw` is built-in (March 2026).** Single-response, no tool access, runs while Claude is processing, reuses prompt cache. **Plus** `.claude/commands/btw.md` extends with verbatim-preservation + classification (context-add / directive-queued / etc.) + durability-escalation rules (TodoWrite → .btw-queue.md → BACKLOG.md → memory/*.md).

**Custom commands live at `.claude/commands/<name>.md`** with frontmatter. Existing customs: `btw.md`, `opsx/{explore,archive,apply,propose}.md`.

**Custom skills live at `.claude/skills/<name>/SKILL.md`** with frontmatter. Authored via skill-creator workflow per GOVERNANCE §4. Existing skills inventory: see `.claude/skills/` directory.

**Hooks live at `.claude/hooks/`.** Existing: `verify-branch-pretooluse.ts` (PreToolUse hook). DST justifies TS-over-bash; **harness hooks suffice; no git hooks** per `memory/feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03.md`.

**Settings at `.claude/settings.json`.** Defines enabled plugins.

**Plugins enabled** include: claude-md-management, skill-creator, pr-review-toolkit, claude-code-setup, plugin-dev, agent-sdk-dev, github, csharp-lsp, pyright-lsp, typescript-lsp, jdtls-lsp, serena, microsoft-docs, sonatype-guide, code-simplifier, commit-commands, feature-dev, ralph-loop, superpowers, code-review, frontend-design, playwright, postman, security-guidance, plus huggingface-skills, explanatory-output-style, playground.

**Persona agents at `.claude/agents/<name>.md`** carry the persona ("who"); skills carry the capability ("how"). Agents use `model: inherit` (none currently use external-model overrides).

**Capability maps for cross-harness peer-call** at `docs/research/`:

- `claude-cli-capability-map.md`
- `codex-cli-first-class-2026-04-23.md`
- `grok-cli-capability-map.md`

**Peer-call infrastructure at `tools/peer-call/`** (PR #1677): grok.sh + grok.ts + gemini.sh + gemini.ts + codex.sh + codex.ts + amara.sh + ani.sh. Codex routes to GPT-5.5 (1M context). Default-yes-self-carry vs scout-and-delegate-to-right-pitcher per PR #1701 discipline.

**TS tooling** at `tools/`:

- `tools/peer-call/` — cross-harness peer invocation
- `tools/github/poll-pr-gate.ts` + `poll-pr-gate-batch.ts` — refresh world-model on PR state (per CLAUDE.md `BLOCKED-with-green-CI` discipline)
- `tools/hygiene/` — memory-index audits + path-claim audits + machine-specific-content audits + tick-history shards
- `tools/lint/` — no-directives-otto-prose + safety-clause-audit + runner-version-freshness
- `tools/Z3Verify/` — F# Z3 SMT verification (DBSP axioms + AI-safety properties per PR #1696)
- `tools/tla/specs/` — TLA+ specs (DbspSpec + ChaosEnvDeterminism + EngagementLiveness + others)
- `tools/lean4/` — Lean4 proofs (Mathlib for kernel composition)

## The carved-sentence operational rules

**Search-first-authority** (Otto-364 + PR #1701 synthesis-weight discipline): before claiming something doesn't exist in the env, grep `.claude/` + `docs/` + `tools/` + `memory/` first. WebSearch upstream documentation second. Ask Aaron last. Don't rely on stale training data for env-knowledge claims.

**Prior-art-grep-FIRST-before-substrate-landing**: when about to write a memory file or research file or skill, grep `memory/` + `docs/amara-full-conversation/` + `docs/backlog/` + `docs/research/` first. Surface duplications BEFORE landing.

**Substrate-or-it-didn't-happen at promise-keeping scope** (PR #1701): "will land tomorrow" without committed-substrate is the failure mode. Discipline-corrections must land NOW or evaporate at next compaction. Ephemeral shards can't keep promises across compactions.

**Scout-and-delegate to right pitcher**: peer-call infrastructure available. GPT-5.5 has 1M context + beats Otto on many scores. Big-context tasks delegate via `tools/peer-call/codex.ts`; Otto preserves own context for plot-keeping.

**Verbatim preservation through Aaron-channel** (memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md): anything coming through Aaron's channel records close to verbatim. Quotes go in memory files, research notes, tick-history shards, or commit messages. Paraphrasing loses signal.

## Operational triggers

Wear this skill when:

- About to claim a Claude Code feature exists or doesn't exist (search-first per Otto-364)
- Authoring a custom command or custom skill (use the right path + workflow)
- Invoking peer-call infrastructure (right pitcher + capability map)
- Configuring hooks (harness hooks suffice; no git hooks)
- Onboarding a new agent / persona (link to skill + agent + persona discipline)
- Cold-boot: read this skill alongside CLAUDE.md to get oriented in the environment

## Defers to

- **skill-creator workflow** (GOVERNANCE §4) for new skill authoring
- **`.claude/commands/<name>.md`** authoring pattern for new custom commands
- **`docs/research/2026-05-05-claude-code-env-mapping-substrate-saved-doc-aaron-directive.md`** for the saved env-mapping doc with cited URLs
- **The capability-map cluster** (claude-cli + codex-cli + grok-cli capability-maps) for cross-harness specifics
- **`memory/feedback_otto_holds_synthesis_weight_prior_art_grep_first_before_substrate_landing_aaron_made_concise_formulations_at_high_mental_cost_aaron_2026_05_05.md`** (PR #1701) for the synthesis-weight + prior-art-grep + scout-and-delegate 8-step discipline this skill encodes at env-layer
- **`memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md`** for verbatim-preservation discipline
