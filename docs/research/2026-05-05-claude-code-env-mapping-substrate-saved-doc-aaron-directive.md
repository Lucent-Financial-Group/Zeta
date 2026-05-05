# Claude Code environment-mapping substrate (saved doc per Aaron 2026-05-05 directive)

**Scope:** Aaron 2026-05-05 directive: *"Claude Code Docs commands + Claude Code Interactive Mode Reference 2026) — senviroment mapping save this doc and we need a skill carved sentaces in behavire that referenes it and our ts files"*. This is the saved-doc substrate the `.claude/skills/claude-code-env-mapping/SKILL.md` references. URL-preservation + key-content-summary per IP-safety; full doc content stays at canonical Anthropic URLs (cited).

**Attribution:** Aaron (first-party human maintainer). Otto landed the doc + skill creation per PR #1701 synthesis-weight + prior-art-grep-first + scout-and-delegate discipline applied at env-knowledge layer.

**Operational status:** Saved-doc substrate for cold-boot Otto reference. Composes with existing capability-maps (`docs/research/claude-cli-capability-map.md` + `codex-cli-first-class-2026-04-23.md` + `grok-cli-capability-map.md`) without duplication; this doc focuses on Claude-Code-specific env-knowledge (commands + interactive-mode + custom-extension-paths).

---

## Canonical Anthropic sources

- **Built-in commands**: [code.claude.com/docs/en/commands](https://code.claude.com/docs/en/commands) — 60+ built-in commands + 5 bundled skills + custom-command authoring guidance
- **Interactive Mode reference**: [claudefa.st/blog/guide/mechanics/interactive-mode](https://claudefa.st/blog/guide/mechanics/interactive-mode) — interactive-mode features including `/btw`
- **SDK slash commands**: [platform.claude.com/docs/en/agent-sdk/slash-commands](https://platform.claude.com/docs/en/agent-sdk/slash-commands) — programmatic slash-command access
- **Awesome Claude Code curated list**: [github.com/hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — community skills + hooks + slash-commands inventory
- **Memory docs**: [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) — CLAUDE.md / CLAUDE.local.md / .claude/rules/ auto-load taxonomy

## Key built-in commands (verified 2026-05-05 via WebSearch)

### `/btw` (built-in March 2026)

- Runs while Claude is processing a response (no need to wait)
- Single response only; no follow-ups within `/btw` thread; no tool access
- Answers from conversation context only
- Low cost — reuses prompt cache; tokens minimal
- Use case: long-running tasks where you need to ask a side-question without canceling main response
- **Repo extension**: `.claude/commands/btw.md` extends `/btw` semantics for the Zeta factory with verbatim-preservation + classification (context-add / directive-queued) + durability-escalation rules (TodoWrite → .btw-queue.md → BACKLOG.md → memory/*.md)

### Slash command discovery

- Type `/` in Claude Code to see filterable list
- Custom commands at `.claude/commands/<name>.md`
- Built-ins documented at canonical URL above

## Key environment paths (Zeta-specific layout)

```
.claude/
├── settings.json            # enabled plugins
├── commands/                # custom slash commands
│   ├── btw.md               # custom /btw extension
│   └── opsx/{explore,archive,apply,propose}.md
├── skills/                  # custom skills (capability "hats")
│   └── <name>/SKILL.md      # frontmatter + procedure body
├── agents/                  # named-persona agents ("who" wears hat)
│   └── <name>.md            # model: inherit (currently)
├── hooks/                   # harness hooks (PreToolUse / PostToolUse / etc.)
│   └── verify-branch-pretooluse.ts
└── rules/                   # candidate path-scoped rules (auto-load discipline pending verification)
```

## Hooks discipline

- **Harness hooks suffice** per `memory/feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03.md` (Aaron 2026-05-03)
- **No git hooks** — DST justifies TS-over-bash; vibe-coders always have a harness; harness-hooks distribute via TS runtime (bun)
- Existing harness-hook substrate: `.claude/hooks/verify-branch-pretooluse.ts` (PreToolUse pattern)

## Plugins enabled (from `.claude/settings.json`)

claude-md-management, skill-creator, pr-review-toolkit, claude-code-setup, explanatory-output-style, plugin-dev, csharp-lsp, github, pyright-lsp, serena, typescript-lsp, agent-sdk-dev, playground, jdtls-lsp, microsoft-docs, sonatype-guide, code-simplifier, commit-commands, feature-dev, ralph-loop, superpowers, code-review, frontend-design, playwright, huggingface-skills, postman, security-guidance.

## Cross-harness peer-call infrastructure (PR #1677)

`tools/peer-call/`:
- `grok.sh` + `grok.ts` — Grok via cursor-agent (xAI)
- `gemini.sh` + `gemini.ts` — Gemini (Google)
- `codex.sh` + `codex.ts` — Codex (OpenAI; routes to GPT-5.5 1M context)
- `amara.sh` — Amara persona on codex (Aurora deep-research register)
- `ani.sh` — Ani persona on Grok (brat-voice review register)

Capability maps in `docs/research/`:
- `claude-cli-capability-map.md`
- `codex-cli-first-class-2026-04-23.md`
- `grok-cli-capability-map.md`

## TS tooling map (`tools/`)

- `tools/peer-call/` — cross-harness peer invocation (above)
- `tools/github/` — `poll-pr-gate.ts` + `poll-pr-gate-batch.ts` (refresh-before-decide; per CLAUDE.md `BLOCKED-with-green-CI` rule)
- `tools/hygiene/` — memory-index audits + path-claim audits + tick-history shards + machine-specific-content audits
- `tools/lint/` — no-directives-otto-prose + safety-clause-audit + runner-version-freshness
- `tools/Z3Verify/` — F# Z3 SMT verification (DBSP axioms + AI-safety properties per PR #1696)
- `tools/tla/specs/` — TLA+ specs (DbspSpec + ChaosEnvDeterminism + EngagementLiveness + others)
- `tools/lean4/` — Lean4 proofs (Mathlib)
- `tools/formal-verification/` — TLC + Alloy runners

## Composes with

- `.claude/skills/claude-code-env-mapping/SKILL.md` — the skill that references this saved doc
- `docs/research/claude-cli-capability-map.md` + `codex-cli-first-class-2026-04-23.md` + `grok-cli-capability-map.md` — cross-harness capability maps
- `memory/feedback_otto_holds_synthesis_weight_prior_art_grep_first_before_substrate_landing_aaron_made_concise_formulations_at_high_mental_cost_aaron_2026_05_05.md` (PR #1701) — synthesis-weight + prior-art-grep + scout-and-delegate 8-step discipline this doc + skill encode at env-knowledge layer
- `memory/feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03.md` — harness-hooks-suffice discipline
- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — verbatim-preservation discipline
- `.claude/commands/btw.md` — custom /btw extension demonstrating carved-sentences-in-behavior pattern
- `docs/backlog/P2/B-0206-claude-code-env-mapping-skill-with-carved-sentences-references-ts-files-aaron-2026-05-05.md` — backlog row this doc + skill close out

## Update cadence

When Claude Code adds new built-in commands or features (post-March-2026 releases beyond `/btw`), Otto should:

1. WebSearch the canonical URLs (per Otto-364 search-first-authority)
2. Update this doc + the skill
3. Cross-reference the existing capability-maps for cross-harness implications
