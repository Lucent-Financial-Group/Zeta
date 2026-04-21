# Harness surfaces — living inventory

**Purpose:** track every AI-coding-harness surface
the factory runs on (or plans to support), plus the
factory's adoption status for each. Prevents drift
where the factory's assumptions rot against the
platform's actual behaviour.

**Multi-harness scope** (Aaron 2026-04-20 verbatim:
*"since we are going muli test harness support we
should technically do this for all harnesses… i want
them to test their integration points you cant. i
konw codex and cursor git copilot are the ones we
care abount immediatly then maybe anitgratify and
the amazon one and any less popular ones"*):

- **Primary (populated):** Claude (Anthropic —
  model, Code CLI, Desktop, Agent SDK, API).
- **Immediate buildout queue:** Codex (OpenAI),
  Cursor, GitHub Copilot.
- **Watched buildout queue:** Antigravity (Google;
  name-spell TBD), Amazon Q Developer /
  CodeWhisperer, Kiro (Amazon's AI-native IDE,
  distinct from Amazon Q).
- **Less popular:** TBD.

**Each-harness-tests-own-integration rule.** A
harness cannot honestly test its own integration
with the factory from *within* itself — the test
needs to be run by a different harness operating the
factory. This is a capability-boundary fact, not a
process choice. Claude Code cannot verify Codex's
factory integration; Codex cannot verify Cursor's;
etc. The integration-test surface per harness is
therefore owned by *another* harness, scheduled
cross-harness.

**Triggering discipline:** cadenced audit every
5-10 rounds per populated harness, owner per
populated harness. See
`memory/feedback_claude_surface_cadence_research.md`
+ `memory/feedback_multi_harness_support_each_tests_own_integration.md`
and FACTORY-HYGIENE row 38.

**Primary feature-comparison axis —
skill-authoring + eval-driven feedback loop.**
Per
`memory/user_skill_creator_killer_feature_feedback_loop.md`,
the first feature to inventory per harness is
whether the harness has (a) a skill-authoring
system and (b) an eval-driven feedback loop on
top of it (draft → with-skill vs baseline run →
quantitative + qualitative review → rewrite →
re-run). This is the feature that made Claude
Code win the harness-selection round for
Aaron. A harness without it scores strictly
lower on the axis Aaron cares about most;
a harness with a comparable loop is a direct
parity event and should be surfaced
prominently.

**Scope:** factory-wide. Any adopter of the factory
kit inherits the harness-surface inventory as the
substrate documentation for whichever harnesses
they run.

**Adoption-status vocabulary:**

- **adopted** — factory depends on the feature;
  removal would break the factory.
- **watched** — factory knows about it, may use
  opportunistically; not load-bearing.
- **untested** — factory has not exercised the
  feature; unknown whether it fits factory rules.
- **rejected** — factory has evaluated and declined
  to adopt (see `docs/WONT-DO.md` for reasons).
- **stub** — harness not yet supported; section
  placeholder pending buildout.

## Harnesses covered

- **Claude** (Anthropic) — primary, fully
  populated. Surfaces: model, Claude Code CLI,
  Claude Desktop, Agent SDK, API.
- **Codex** (OpenAI) — stub; priority 1.
- **Cursor** — stub; priority 1.
- **GitHub Copilot** — stub; priority 1. Note:
  `.github/copilot-instructions.md` already exists
  as factory-managed contract per GOVERNANCE §31.
- **Antigravity** (Google) — stub; priority 2.
  Spelling TBD; Aaron wrote "anitgratify".
- **Amazon Q Developer / CodeWhisperer** — stub;
  priority 2.
- **Kiro** (Amazon) — stub; priority 2. Amazon's
  AI-native IDE, distinct product from Amazon Q
  Developer.
- **Less popular** — TBD.

---

# Claude (Anthropic) — primary harness, fully populated

Owner: **Architect (Kenji) — interim** until a
dedicated harness-guide role is decided. The
plugin-provided `claude-code-guide` agent (loaded
from the Anthropic official plugin cache, not a
local `.claude/agents/` file) serves as a
question-answering reference resource during the
audit but is not the audit runner. Cadence: every
5-10 rounds. Integration-point tests owned by:
**other harnesses** (when populated) per the
each-tests-own rule; Codex / Cursor / Copilot can
each drive the factory and verify Claude Code's
integration externally once their surface docs
exist.

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

## Open questions / gaps — Claude

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

# Codex (OpenAI) — stub; priority 1

**Status:** stub. Factory does not yet run on
Codex. Buildout is on the immediate queue.

**Owner (tentative):** TBD — likely a
`codex-harness-guide` persona paired with
`.claude/agents/claude-code-guide` under a
shared "harness-guide" role family, or a single
multi-harness guide. Decide before first
populated audit.

**Cadence:** every 5-10 rounds once populated;
until then, the BACKLOG row drives buildout
tempo.

**Integration-point tests owned by:** Claude Code
(per the each-tests-own-integration rule) once
Codex runs the factory for the first time.
Claude Code will externally verify Codex's
integration; Codex cannot self-verify from
within.

**Known surfaces to inventory when populated:**

- Codex CLI (`codex` binary) — model, tool use,
  context behaviour.
- Codex API — model IDs, tool-use JSON schema,
  rate limits.
- Agent-runtime features analogous to Claude
  Code's skills / subagents / hooks — map each
  to its Claude-Code equivalent for cross-harness
  portability analysis.

**Factory-relevant deltas vs Claude Code:** TBD
— the first populated audit enumerates these.

**Factory-overlay vs OpenAI-schema discipline:**
the same rule that applies to AutoMemory applies
here: factory-local conventions (ordering,
scope-tagging) layer on top; schema changes
OpenAI prescribes cannot be rewritten by the
factory.

---

# Cursor — stub; priority 1

**Status:** stub. Factory does not yet run on
Cursor. Immediate-queue buildout.

**Owner (tentative):** TBD — same question as
Codex; `cursor-harness-guide` or a shared
multi-harness guide.

**Cadence:** every 5-10 rounds once populated.

**Integration-point tests owned by:** Claude Code
(until a third harness is populated, at which
point Cursor and Claude can cross-test the
third). Cursor cannot self-verify.

**Known surfaces to inventory when populated:**

- Cursor editor — chat, composer, agent mode.
- `.cursor/rules/` and per-project MDC files —
  Cursor's equivalent of CLAUDE.md /
  copilot-instructions.md (factory already
  maintains `.github/copilot-instructions.md`
  per GOVERNANCE §31; once Cursor is populated,
  decide whether `.cursor/rules/` needs the same
  treatment).
- Cursor's model roster and routing.
- Cursor's tool-use and MCP integration story.

**Factory-relevant deltas vs Claude Code:** TBD.

---

# GitHub Copilot — stub; priority 1

**Status:** stub. Factory has a partial surface
presence — `.github/copilot-instructions.md` is
factory-managed per GOVERNANCE §31 and audited
on the existing skill-file cadence. Full harness
buildout (running the factory from inside
Copilot Workspace / Copilot Chat) is immediate-
queue but not yet done.

**Owner (tentative):** TBD. The existing
`copilot-instructions.md` audit sits under the
skill-tune-up cadence; the full harness
buildout should migrate ownership to a dedicated
guide.

**Cadence:** `copilot-instructions.md` is
already audited on the skill-tune-up cadence;
full-harness inventory audits are every 5-10
rounds once the harness is populated.

**Integration-point tests owned by:** Claude Code
(and any other populated harness) once Copilot
Workspace runs the factory end-to-end. Copilot
cannot self-verify its factory integration from
within itself.

**Known surfaces to inventory when populated:**

- `.github/copilot-instructions.md` (already
  factory-managed — inventory anchor).
- Copilot Chat (VS Code / JetBrains / web).
- Copilot Workspace (agentic mode).
- Copilot CLI.
- Copilot's model roster (GPT-5, Claude,
  Gemini, Grok, etc. — multi-model itself).

**Factory-relevant deltas vs Claude Code:**
Copilot runs multiple underlying models; the
factory's model-specific assumptions
(prompt-caching TTL, context window, etc.) will
need per-model branching when populated.

---

# Antigravity (Google) — stub; priority 2

**Status:** stub. Factory does not run on
Antigravity. Watched-queue buildout. Name-
spelling TBD; Aaron wrote "anitgratify" —
verify spelling during first audit.

**Owner (tentative):** TBD.

**Cadence:** every 5-10 rounds once populated.

**Integration-point tests owned by:** any other
populated harness.

**Known surfaces to inventory when populated:**
TBD — verify the product name, official docs
location, feature set, and model roster.

---

# Amazon Q Developer / CodeWhisperer — stub; priority 2

**Status:** stub. Factory does not run on
Amazon Q. Watched-queue buildout.

**Owner (tentative):** TBD.

**Cadence:** every 5-10 rounds once populated.

**Integration-point tests owned by:** any other
populated harness.

**Known surfaces to inventory when populated:**

- Amazon Q Developer (IDE / CLI / web).
- CodeWhisperer (if still a distinct product by
  buildout time).
- AWS-side model access and IAM tie-in.

---

# Kiro (Amazon) — stub; priority 2

**Status:** stub. Factory does not run on Kiro.
Watched-queue buildout. Kiro is Amazon's AI-
native IDE product — distinct from Amazon Q
Developer (general assistant) and
CodeWhisperer (code-completion heritage).
Aaron flagged it explicitly as "initial stubs"
material alongside the other priority-2
harnesses, 2026-04-20.

**Owner (tentative):** TBD.

**Cadence:** every 5-10 rounds once populated.

**Integration-point tests owned by:** any other
populated harness.

**Known surfaces to inventory when populated:**

- Kiro IDE — agent mode, spec-driven workflow
  (Kiro's headline feature is spec-first
  agentic development, which may overlap
  interestingly with Zeta's own OpenSpec +
  formal-spec discipline).
- Kiro's model roster and routing.
- Kiro's equivalent of `.claude/` — where
  per-project rules, skills, hooks live.
- AWS-side tie-in and IAM.

**Factory-relevant deltas vs Claude Code:** Kiro's
spec-first workflow may have native concepts
that correspond to Zeta's `openspec/specs/**`
and `docs/**.tla` layering — worth a first-
audit comparison when populated.

---

# Less popular harnesses — stub

**Status:** stub. Enumerate as needed. Candidates
so far: none named; factory audits will flag any
that rise to warrant inclusion.

---

## Audit log

| Date | Auditor | Summary | Changes landed |
|---|---|---|---|
| 2026-04-20 | main-agent + Aaron (manual kickoff) | Bootstrap inventory. AutoMemory Q1-2026 attribution captured. AutoDream Q1-2026 flag-gate noted. Factory adoption statuses populated for all known surfaces. | This file + `feedback_claude_surface_cadence_research.md` + FACTORY-HYGIENE row 38 + BACKLOG row. |
| 2026-04-20 | main-agent + Aaron | Multi-harness refactor. Renamed `CLAUDE-SURFACES.md` → `HARNESS-SURFACES.md`. Added stub sections for Codex, Cursor, GitHub Copilot, Antigravity, Amazon Q Developer, Kiro. Codified each-harness-tests-own-integration capability boundary. Kiro added explicitly by Aaron as priority-2 stub, distinct from Amazon Q. | This file + `feedback_multi_harness_support_each_tests_own_integration.md` + FACTORY-HYGIENE row 38 (widened) + BACKLOG row (renamed + new integration-test row). |

---

## References

- `memory/feedback_claude_surface_cadence_research.md`
  — the durable policy this doc supports
  (Claude-specific origin; now extended
  multi-harness).
- `memory/feedback_multi_harness_support_each_tests_own_integration.md`
  — the multi-harness extension + the
  capability-boundary rule that each harness
  cannot self-test its own factory
  integration.
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
