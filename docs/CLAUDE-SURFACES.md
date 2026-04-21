# Claude surfaces — living inventory

**Purpose:** track every Anthropic Claude-surface
feature the factory runs on, plus the factory's
adoption status for each. Prevents drift where the
factory's assumptions rot against the platform's
actual behaviour.

**Triggering discipline:** cadenced audit every
5-10 rounds, owner `.claude/agents/claude-code-guide`.
See `memory/feedback_claude_surface_cadence_research.md`
and FACTORY-HYGIENE row 38.

**Scope:** factory-wide. Any adopter of the factory
kit using Claude Code (or a close variant) inherits
this inventory as the substrate documentation.

**Adoption-status vocabulary:**

- **adopted** — factory depends on the feature;
  removal would break the factory.
- **watched** — factory knows about it, may use
  opportunistically; not load-bearing.
- **untested** — factory has not exercised the
  feature; unknown whether it fits factory rules.
- **rejected** — factory has evaluated and declined
  to adopt (see `docs/WONT-DO.md` for reasons).

## Surfaces covered

1. **Claude (the model)** — versions, knowledge
   cutoff, context, tool use, extended thinking.
2. **Claude Code (CLI)** — hooks, slash commands,
   MCP, skills, subagents, plugins, settings,
   AutoMemory, AutoDream, IDE integrations, `/loop`
   cron, output styles.
3. **Claude Desktop (app)** — projects, file
   attachments, cross-device behaviour.
4. **Claude Agent SDK** — TypeScript + Python.
5. **Claude API** — model IDs, tools, rate limits.

---

## Claude Code — features inventory

### Memory system

| Feature | Shipped | Adoption | Factory notes |
|---|---|---|---|
| **AutoMemory** (Daytime logger) | Q1 2026 | **adopted** | Base cross-session memory; `MEMORY.md` + per-fact files. Factory adds newest-first ordering, `scope:` field (research), cross-references. Factory-overlay customisations, not schema changes. See `memory/reference_automemory_anthropic_feature.md`. |
| **AutoDream** (Nighttime consolidation) | Q1 2026, flag-gated `tengu_onyx_plover` as of 2026-04-19 | **watched** (manual approximation enabled) | REM-sleep consolidation; 24h+5-sessions cadence. UI at `/memory` but backend off for general users. Factory runs manual approximation. See `memory/reference_autodream_feature.md`. |

### Skills system

| Feature | Shipped | Adoption | Factory notes |
|---|---|---|---|
| **SKILL.md skills** under `.claude/skills/` | 2025 | **adopted** | Capability skills encode *how*; persona agents encode *who*. Skill-creator gate via GOVERNANCE §4. |
| **Skill-tune-up** pattern | factory-authored | **adopted** | Ranker persona + cadenced live-search; our own, not an Anthropic feature. |
| **Plugin skills** (namespaced `plugin:skill`) | 2025 | **adopted** | `skill-creator`, `pr-review-toolkit`, etc. Loaded via `.claude/settings.json`. |

### Agents / subagents

| Feature | Shipped | Adoption | Factory notes |
|---|---|---|---|
| **Subagent dispatch via `Task` tool** | 2024 | **adopted** | Reviewer roles (harsh-critic, spec-zealot) run as subagents to keep findings out of main-agent context. |
| **Isolation `worktree`** mode | 2025 | **watched** | Creates temporary git worktree; factory uses sparingly. |
| **Background agents** (run_in_background) | 2025 | **watched** | Factory has used for parallel independent work; not core. |
| **Persona agents** under `.claude/agents/` | 2024 | **adopted** | Named personas (Kenji, Daya, etc.) via `.md` frontmatter. |

### Interaction surface

| Feature | Shipped | Adoption | Factory notes |
|---|---|---|---|
| **Slash commands** under `.claude/commands/` | 2024 | **adopted** | `/loop` is the factory's dynamic-pacing driver. |
| **Hooks** (SessionStart, PreToolUse, PostToolUse, etc.) | 2024 | **adopted** | `.claude/settings.json`; pre-commit hooks enforce ASCII-clean (BP-10) and injection lints. |
| **MCP servers** | 2024 | **adopted** | Figma, Microsoft Learn, Playwright, Sonatype-guide mounted. |
| **Output styles** (explanatory, etc.) | 2025 | **watched** | In use opportunistically. |
| **IDE integrations** (VS Code, JetBrains) | 2024 | **watched** | Not factory-primary — factory runs in CLI. |
| **Keyboard shortcuts / `!` command prefix** | 2024 | **adopted** | `!` to surface shell output into the conversation. |

### Cron / loop

| Feature | Shipped | Adoption | Factory notes |
|---|---|---|---|
| **`/loop` dynamic mode** | 2025 | **adopted** | Agent self-paces ticks via `ScheduleWakeup`. |
| **`/loop` cron mode** (autonomous) | 2025 | **adopted** | Durable ~2-3 day cron scheduling. See `memory/feedback_loop_default_on.md`. |
| **CronCreate / CronList / CronDelete** tools | 2025 | **adopted** | Factory lists open crons at session-open. |

### Settings / config

| Feature | Shipped | Adoption | Factory notes |
|---|---|---|---|
| **`.claude/settings.json`** | 2024 | **adopted** | Pins enabled plugins. |
| **Session compaction** | 2024 | **adopted** | Factory persists important decisions into committed docs (ADRs, ROUND-HISTORY) — not ephemeral context. |
| **`/memory` selector UI** | 2026 Q1 | **watched** | AutoDream toggle visible; manual runs for now. |

---

## Claude (the model) — versions and capabilities

| Model | ID | Context | Knowledge cutoff | Factory use |
|---|---|---|---|---|
| **Claude Opus 4.7** | `claude-opus-4-7` | (platform-native) | January 2026 | Primary model for factory rounds. |
| **Claude Opus 4.6** | (prior) | — | — | Fast mode alternative (`/fast`). |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | — | — | Watched for subagent dispatch. |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | — | — | Watched for cheap subagent work. |

**Extended thinking:** available on Opus; factory
uses opportunistically on complex synthesis tasks.

**Prompt caching:** 5-minute TTL — factory's
cache-warm vs cache-miss decision in `/loop`
intervals is driven by this TTL (see
ScheduleWakeup docs: 60-270s cache-warm,
300s+ cache-miss).

**Tool use:** binding — factory depends on it for
every operation.

---

## Claude Desktop (app) — watched delta

The factory runs in Claude Code CLI. Claude Desktop
is watched for:

- **Projects** — similar to Claude Code project
  folders; Aaron may use both.
- **File attachments** — different UX than CLI's
  Read tool.
- **MCP integrations** — overlap with Code CLI.

Factory-side rule: if Aaron references a Desktop
feature that diverges from Code behaviour, surface
it here as a watched delta and investigate.

---

## Claude Agent SDK

- **TypeScript SDK** — `agent-sdk-dev:agent-sdk-verifier-ts`
  plugin verifies apps; factory uses
  opportunistically.
- **Python SDK** — same, via
  `agent-sdk-dev:agent-sdk-verifier-py`.
- **Factory Zeta apps** are not SDK-based (the
  factory consumes Claude Code, not the SDK) —
  watched only.

---

## Claude API

- **Model IDs** listed above.
- **Tool use JSON Schema** — binding on skill
  design; factory BP-NN rules align.
- **Rate limits** — untracked at factory level;
  any regression caught at session level.

---

## Open questions / gaps

- **MCP registry** — do we have a canonical list
  of mounted MCPs and their status? (Spot check
  against `.claude/settings.json` on each audit.)
- **Hook inventory** — pre-commit hooks documented
  where? FACTORY-HYGIENE row?
- **Desktop/Code feature diff** — Aaron uses both;
  factory lacks a delta doc.
- **Output styles** — are any mandatory for any
  skill? (Currently opportunistic.)
- **Plugin ecosystem** — claude-plugins-official
  cache, third-party plugins: audit on each
  cycle.

---

## Audit log

| Date | Auditor | Summary | Changes landed |
|---|---|---|---|
| 2026-04-20 | main-agent + Aaron (manual kickoff) | Bootstrap inventory. AutoMemory Q1-2026 attribution captured. AutoDream Q1-2026 flag-gate noted. Factory adoption statuses populated for all known surfaces. | This file + `feedback_claude_surface_cadence_research.md` + FACTORY-HYGIENE row 38 + BACKLOG row. |

---

## References

- `memory/feedback_claude_surface_cadence_research.md`
  — the durable policy this doc supports.
- `memory/reference_automemory_anthropic_feature.md`
  — AutoMemory base feature.
- `memory/reference_autodream_feature.md` —
  AutoDream consolidation.
- `docs/FACTORY-HYGIENE.md` row 38 — the cadenced
  audit control.
- `docs/TECH-RADAR.md` — sibling doc for factory
  **tech choices** (distinct axis from this doc's
  platform features).
- `docs/research/skill-edit-gating-tiers.md` —
  tiered envelope that governs edits to this doc
  (Tier 1 for adoption-status updates, Tier 2 for
  new surface sections).
- `.claude/agents/claude-code-guide.md` — the
  persona that owns the cadenced audit.
