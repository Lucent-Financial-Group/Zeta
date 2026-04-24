# First-class Codex-CLI session experience — Phase 1 research (stage 1 of 5)

**Aaron directive** (Otto-75, 2026-04-23):
> *"can you start building first class codex support with the
> codex clis help, it might eventually be benefitial to switch
> otto to codex later depending on which modeel/harness is
> ahead. this is basically the same ask as a new session claude
> first class experience, this is a codex session as a first
> class experince."*

**Parent BACKLOG row:** PR #228 — *First-class Codex-CLI session
experience*. Names this file as the first step (research tick,
S-effort) of a 5-stage arc:

1. **Research tick (S)** — this document.
2. Parity matrix (M).
3. Gap closures (M-L per gap).
4. Codex session-bootstrap doc (S).
5. Otto-in-Codex test run + harness-choice ADR (S-M).

**Stage accountability:** this document is only Stage 1. It
does NOT advocate a harness swap, does NOT propose
implementation work, and does NOT commit to a schedule.
Subsequent stages are called for by the BACKLOG row, not this
file.

---

## 1 · What Codex CLI is (2026-04 snapshot)

OpenAI's terminal-native coding agent. Open source, built in
Rust, actively developed. Positioned parallel to Claude Code
CLI in the 2026 coding-agent landscape.

**Install:**
- `npm install -g @openai/codex`
- `brew install --cask codex`
- Direct binary download per platform (`macOS arm64/x86_64`,
  `Linux x86_64/arm64`).

**Authentication:**
- ChatGPT account sign-in (Plus / Pro / Business / Edu /
  Enterprise) **or** an OpenAI API key.
- Per Aaron's Otto-76 clarification
  (`memory/project_account_setup_snapshot_codex_servicetitan_playwright_personal_multi_account_p3_backlog_2026_04_23.md`)
  the current Codex CLI session is on ServiceTitan — same
  account as the Claude Code session — deliberately.

**Key surfaces:**
- `codex` — interactive terminal UI.
- `codex exec` — non-interactive scripting mode (equivalent to
  Claude Code's one-shot Bash invocation of a prompt).
- `/model` — model switcher (GPT-5.4 / GPT-5.3-Codex / others).
- Subagent dispatch + parallel execution + git worktrees.
- MCP server support with per-tool approval modes.
- Web search integration.
- Image input + image generation.
- Cloud-backed runtime (Codex Cloud) for long-running tasks.
- Background macOS automation ("Computer Use").
- Code-review agent variant (separate agent reviews before
  commit / push).

**Config surface:**
- `~/.codex/config.toml` (TOML).
- SQLite state DB (`sqlite_home` config / `CODEX_SQLITE_HOME`
  env).
- `[mcp_servers]` table mirrors Claude Code's MCP registry with
  richer per-tool approval controls (`approval_mode =
  "approve" | "prompt"` default + per-tool override).
- `[notice]` for UI prompt suppression; `notify` hook when a
  turn completes.
- `plan_mode_reasoning_effort` — Plan Mode analogue.
- `experimental_realtime_start_instructions` — system-message
  override for realtime mode.

---

## 2 · The big, non-obvious win — `AGENTS.md` is already universal

Claude Code reads `CLAUDE.md` first. Codex CLI reads `AGENTS.md`
first. **Zeta's setup already has both, and the `CLAUDE.md`
explicitly delegates to `AGENTS.md`** as the universal
onboarding handbook. The relevant lines of `CLAUDE.md`:

> 1. **[`AGENTS.md`](AGENTS.md)** — the universal
>    onboarding handbook. Pre-v1 status, the three
>    load-bearing values, how to treat contributions,
>    the build-and-test gate, code-style pointers,
>    required reading. **Start here every session.**

When a Codex CLI session opens Zeta, it will read `AGENTS.md`
by default. `AGENTS.md` already contains:

- The three load-bearing values (retraction-native / alignment-
  contract / operator-algebra).
- Build-and-test gate (`dotnet build -c Release` clean, full
  test suite).
- Required reading list (`docs/ALIGNMENT.md` /
  `docs/CONFLICT-RESOLUTION.md` / `docs/GLOSSARY.md` /
  `docs/WONT-DO.md` / `openspec/README.md` /
  `GOVERNANCE.md`).
- "Agents, not bots" discipline.
- Factory-structure pointers to `.claude/`, `docs/`, `src/`,
  `openspec/`.

**Practical consequence:** a Codex CLI session starting in Zeta
will get the universal context for free. The gap is only what
`CLAUDE.md` supplements — Claude-Code-harness-specific
mechanisms (Skills, Task subagents, Memory folder layout, Hook
specifics).

This is a materially better position than the BACKLOG row
assumed. Zeta is already ~60% first-class-Codex-ready by
accident of adopting `AGENTS.md` as canonical in
`GOVERNANCE.md` §N from earlier rounds.

---

## 3 · Capability-parity first-pass matrix

Rows Otto routinely exercises in Claude Code; column 2 is the
Codex-CLI equivalent; column 3 is `parity | partial | gap` with
a short note. **This is a first-pass; a proper matrix (Stage 2)
should run each cell against a small test prompt.**

| Claude Code (Otto usage) | Codex CLI equivalent | Status | Note |
|---|---|---|---|
| `CLAUDE.md` + `AGENTS.md` pointer tree | `AGENTS.md` native | **Parity** | The big win; see §2. |
| `Skill` tool + `.claude/skills/SKILL.md` | No direct equivalent; custom commands + MCP + `AGENTS.md` extensions | **Partial** | Cross-harness-mirror-pipeline BACKLOG row (round 34) already addresses skill-file distribution. Codex CLI reads MCP-registered tools cleanly; skills as MCP-exposed functions is one path. |
| `Task` tool (subagent dispatch) | Subagents + worktrees | **Parity** | Codex advertises parallel execution with worktrees natively; should compose cleanly with Zeta's agent roster. |
| `TodoWrite` task tracking | Not advertised as a primitive | **Gap** | May map to `AGENTS.md` + session memory; needs Stage 2 test. |
| Per-project memory (`~/.claude/projects/<slug>/memory/`) | SQLite state DB + `AGENTS.md` | **Different shape, functional** | Codex has durable state; the **file-format** differs (SQLite vs. Markdown per-fact files). `MEMORY.md` index doesn't apply directly. Future: design how per-fact memories surface in a Codex session. |
| Bash / Edit / Read / Write | Standard file + shell tool set | **Parity** | Interactive + `exec` modes cover Otto's normal workflow. |
| WebFetch / WebSearch | Web search integration advertised | **Parity** | Codex advertises "up-to-date information retrieval" during tasks. |
| MCP server support | `[mcp_servers]` TOML config | **Parity (richer)** | Codex's per-tool approval mode is stricter than Claude Code's MCP permissioning — plays well with BP-11 data-not-directives. |
| WebFetch on private/authenticated URLs | Unchanged — same constraint; use MCP | **Parity** | Neither harness fetches authenticated URLs directly; both rely on MCP servers. |
| `CronCreate` / `ScheduleWakeup` (loop autonomy) | Not documented | **Likely gap** | The autonomous-loop cadence (minutely `<<autonomous-loop>>` fire) has no Codex-CLI equivalent surfaced in the docs. **This is the biggest single gap** for Otto-in-Codex; the entire `/loop` auto-mode depends on cron. Stage 2 must verify whether Codex Cloud background tasks cover this. |
| Plan Mode | `plan_mode_reasoning_effort` config | **Parity** | Named differently; same concept. |
| Output styles (e.g., explanatory) | Not documented; may go via system-prompt override | **Gap (minor)** | Factory-side impact is small; output styles are Claude-Code-session features, not substrate. |
| Hooks (`.claude/settings.json` PreToolUse, UserPromptSubmit) | `notify` hook for turn completion; no PreToolUse equivalent | **Partial** | Zeta's ASCII-clean pre-commit + prompt-injection lints run via git-pre-commit, not via Claude Code hooks — so those are harness-neutral. Session-side hooks (SessionStart for output style) have no Codex equivalent. |
| Slash commands (`/loop`, `/fast`, `/help`, `/status-line-setup`) | `/model` + plan-mode commands | **Partial** | Codex exposes fewer user-visible slash commands; project-specific ones (e.g., Zeta's `/loop`) need re-authoring or re-routing through `codex exec`. |
| `Task` with `isolation: "worktree"` | Built-in worktree support | **Parity** | Codex advertises worktrees as a first-class subagent feature. |
| Session compaction | Not documented | **Gap (opaque)** | Codex's handling of long sessions is unclear; Stage 2 must test. |
| Code-review agent | Native "separate agent before commit" feature | **Parity (different shape)** | Codex integrates review into the CLI workflow directly; Zeta's equivalent is Codex-as-PR-reviewer on GitHub + `/ultrareview` + harsh-critic persona. Composes. |
| Image input / image generation | Native | **Parity+** | Codex exposes image generation in-CLI; Claude Code accepts image input only. |
| Background macOS Computer Use | Native | **Codex-specific** | No Claude Code equivalent; relevant if Zeta ever wants agent-run GUI tests. Not urgent for Otto. |
| Cloud-backed runtime | Codex Cloud | **Codex-specific** | May subsume the cron-gap by running long-lived agents in cloud; Stage 2 needs to verify. |

**Running gap score after first-pass:**
- Parity: 10
- Partial: 4
- Gap: 4 (of which 1 — cron/autonomous-loop — is critical)
- Codex-specific: 2

For a *first-class* Otto experience in Codex CLI, the 1
critical gap (no equivalent of `CronCreate` / `/loop`
autonomous mode) is the blocker. Without it, Otto in Codex is
a manual session; with it, Otto can run the same heartbeat
cadence.

---

## 4 · Authentication + account — no extra work needed today

Per
`memory/project_account_setup_snapshot_codex_servicetitan_playwright_personal_multi_account_p3_backlog_2026_04_23.md`,
Aaron aligned Codex CLI and Claude Code on the ServiceTitan
account in Otto-76. This means:

- Codex CLI ChatGPT sign-in on ServiceTitan = Codex access via
  enterprise ChatGPT seat.
- No separate API-key billing for factory-agent work.
- Playwright stays on Aaron's personal for Amara-ferry work (a
  deliberate cross-tier boundary — poor-man-tier for Amara,
  enterprise-tier for Otto).

The multi-account-access-design BACKLOG row (PR #230) covers
the future case where Otto operates on multiple accounts
simultaneously; **today's single-account-aligned setup
sidesteps that problem for Phase 1 Codex research**.

---

## 5 · Gap analysis — critical vs. nice-to-have

**Critical (blocks Otto-in-Codex parity):**

1. **No `CronCreate` / `ScheduleWakeup` equivalent.** The
   entire autonomous-loop cadence depends on minutely cron
   fires with the `<<autonomous-loop>>` sentinel. Without a
   Codex-CLI way to schedule wake-ups, Otto-in-Codex is
   reactive-only (waits for Aaron to kick the next tick). This
   is the single most important Stage 2 question: **does Codex
   Cloud offer a scheduled-task primitive?** If yes, parity is
   reachable. If no, Codex-in-Otto mode runs as a non-loop
   harness for now, with the /loop cadence retained in Claude
   Code.

**Important (meaningful friction, workarounds exist):**

2. **Skills aren't directly portable.** `.claude/skills/` is
   Claude-Code-specific. The existing cross-harness-mirror-
   pipeline BACKLOG row (round 34) is the right place to solve
   this; it's complementary to this work, not this row's
   scope.
3. **TodoWrite analogue unclear.** Otto relies on TodoWrite
   for tick-internal progress. Without it, task-tracking might
   degrade to free-form markdown in responses. Not critical but
   visible.
4. **Hooks gap.** PreToolUse hooks in `.claude/settings.json`
   aren't portable; git-pre-commit hooks are. Move any
   session-layer hooks to git-pre-commit or lint CI if we want
   them harness-neutral.

**Nice-to-have (low friction, low impact):**

5. Output-style / explanatory-mode parity.
6. Session compaction behaviour parity.
7. Slash-command name-parity (Zeta's `/loop` etc.).

**Codex-specific we don't need today:**

- Background macOS Computer Use (not urgent for factory
  agent).
- In-CLI image generation (not urgent).
- Codex Cloud as execution environment (may become relevant if
  critical gap #1 resolves via cloud scheduling).

---

## 6 · Recommended Stage-2 plan

Stage 2 is the parity matrix (M-effort per PR #228). Concrete
test prompts to exercise each row of §3:

1. **`AGENTS.md` reading.** Run `codex` in the Zeta repo root
   interactively; confirm it reads `AGENTS.md` before first
   turn. (Test: ask the agent to state the three load-bearing
   values; correct answer validates the read.)
2. **Subagent dispatch.** Prompt Codex to "launch a subagent
   to review `docs/ALIGNMENT.md` and report its key clauses" —
   verify subagent dispatch works, artifacts are consolidated.
3. **MCP-server invocation.** Register a no-op MCP server in
   `~/.codex/config.toml` and verify `approval_mode` gates
   trigger.
4. **Cron / scheduled-task research.** The critical gap. Read
   Codex Cloud docs specifically on scheduled task
   primitives; file the outcome.
5. **`codex exec` non-interactive.** Run
   `codex exec "list the top 5 open PRs on LFG"` and compare
   output shape to Claude Code's one-shot invocation.
6. **Git-worktree subagent.** Test isolation: "open a
   subagent in an isolated worktree and have it modify a
   single line; verify the main session doesn't see the
   change."
7. **Session resumption.** Start a session, quit, resume. Does
   Codex restore prior context from the SQLite state DB?
   Compare to Claude Code's session continuity model.

Time estimate for Stage 2: 2-3 hours of hands-on terminal
time + documentation pass. Can be split across multiple Otto
ticks or landed as one dedicated research PR.

---

## 7 · Scope limits (repeating, for clarity)

- This document does NOT commit to harness-swap.
- Does NOT propose implementing a Codex-mode Otto.
- Does NOT modify `AGENTS.md` (already good; mirror-pipeline
  row handles forward-looking changes).
- Does NOT duplicate cross-harness-mirror-pipeline work.
- Does NOT lock Zeta to one harness family.

The harness-choice ADR (Stage 5 per PR #228) is the only
stage authorised to make an executable decision about
which harness runs the primary tick cadence.

---

## 8 · References

- [Codex CLI landing — openai.com/codex](https://openai.com/codex/)
- [Codex CLI developer docs](https://developers.openai.com/codex/cli)
- [`openai/codex` GitHub — lightweight terminal agent](https://github.com/openai/codex)
- [Codex CLI 2026 review — shareuhack.com](https://www.shareuhack.com/en/posts/openai-codex-cli-agent-guide-2026)
- [ChatGPT Codex 2026 guide — two99.org](https://two99.org/blog/chatgpt-codex-guide-2026/)
- [Codex desktop computer use — remio.ai](https://www.remio.ai/post/openai-codex-can-now-control-your-desktop-what-it-means-for-the-ai-coding-agent-race)
- [Codex CLI configuration reference (TOML)](https://raw.githubusercontent.com/openai/codex/main/docs/config.md)
- Zeta's `AGENTS.md` — universal onboarding handbook (already
  consumed by both harnesses; the biggest non-obvious win
  surfaced by this research).
- Parent BACKLOG row PR #228.
- Account-setup memory (sibling context).
