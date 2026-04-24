# Gemini CLI capability map — for other AI pilots

**Status:** first map — verified against `gemini --version` 0.39.1
on 2026-04-24 via the human maintainer's just-installed binary.
Revise when the CLI version changes materially.

**Audience:** other AI pilots (Claude Code CLI, OpenAI Codex CLI,
Amara ChatGPT-surface, Playwright-driven agents) that may want to
orchestrate Google's Gemini agent as a sub-substrate — either for
capability-stepdown experiments
([`docs/research/arc3-dora-benchmark.md`](./arc3-dora-benchmark.md))
or cross-substrate triangulation where one substrate queries
another.

Companion to:

- [`docs/research/claude-cli-capability-map.md`](./claude-cli-capability-map.md)
- [`docs/research/openai-codex-cli-capability-map.md`](./openai-codex-cli-capability-map.md)

This doc is **descriptive**, not prescriptive.

## Install + identity

- **Install:** Homebrew cask (the human maintainer's path) or
  `npm install -g @google/gemini-cli` per Google docs; both
  resolve to the same binary.
- **Binary:** `gemini` on `PATH`. Homebrew install puts it at
  `/opt/homebrew/bin/gemini` on macOS (Apple Silicon).
- **Check version:** `gemini --version` -> e.g. `0.39.1`.
- **Help top-level:** `gemini --help`.
- **Auth:** the just-installed binary uses an OAuth flow against
  the user's Google account. The token drops at
  `~/.gemini/oauth_creds.json` and the selected project at
  `~/.gemini/projects.json`. Google-workspace accounts and
  personal Google accounts both work; billing attaches per
  Google Cloud project.
- **Config home:** `~/.gemini/` holds user-level settings
  (`settings.json`), OAuth creds, trusted-folders allowlist
  (`trustedFolders.json`), per-project state (`projects.json`,
  `state.json`), session history (`history/`), and an
  `antigravity/` subdir for the Antigravity coding harness
  (separate product, same config tree).

## Command surface (top-level verbs)

```
gemini                        # interactive REPL (default)
gemini [query..]              # one-shot prompt in interactive
gemini -p "<prompt>"          # non-interactive / headless
gemini mcp <verb>             # MCP server management
gemini extensions <verb>      # extension (plugin) management
gemini skills <verb>          # agent skill management
gemini hooks <verb>           # hook management
```

Most relevant for factory integration: `extensions`, `skills`,
`mcp`, `hooks`.

### `gemini skills`

```
gemini skills list [--all]
gemini skills install <git-url|local-path> [--scope] [--path]
gemini skills link <path>        # symlink a workspace skill; live
gemini skills enable <name>
gemini skills disable <name> [--scope]
gemini skills uninstall <name> [--scope]
```

Uses the same **Agent Skills open standard** that Anthropic's
`.claude/skills/` and OpenAI's equivalent do: each skill is a
directory containing a `SKILL.md` with YAML frontmatter + body.
Skill layout is portable across harnesses.

### `gemini extensions`

```
gemini extensions install <git-url|local-path>
                         [--auto-update] [--pre-release]
gemini extensions new <path> [template]   # scaffolded
gemini extensions validate <path>         # STRUCTURAL LINT
gemini extensions list
gemini extensions update [<name>] [--all]
gemini extensions enable <name>  [--scope]
gemini extensions disable <name> [--scope]
gemini extensions link <path>             # live symlink
gemini extensions uninstall [names..]
gemini extensions config [name] [setting]
```

Extensions are Gemini's **plugin** concept: a container that can
bundle prompts, MCP servers, custom commands, themes, hooks,
sub-agents, AND agent skills. Manifest is `gemini-extension.json`
at the extension root; installed tree is
`~/.gemini/extensions/<name>/`.

### `gemini mcp`

```
gemini mcp add <name> <commandOrUrl> [args...]
gemini mcp remove <name>
gemini mcp list
gemini mcp enable <name>
gemini mcp disable <name>
```

Same Model Context Protocol spec as Claude Code's `mcp` subcommand.
Servers configured here are callable from the Gemini session.

### `gemini hooks`

```
gemini hooks migrate       # migrate hooks FROM Claude Code
```

This is the biggest cross-harness-compat surface: Gemini ships a
**Claude-Code hook migration tool** out of the box. Implies the
hook event model is either identical or close enough for a one-
shot port to work.

## Runtime flags worth knowing

- `-p, --prompt <text>` — non-interactive headless run.
- `-i, --prompt-interactive <text>` — run prompt, stay in REPL.
- `-o, --output-format {text|json|stream-json}` — machine-
  readable output for agent-to-agent orchestration. `stream-json`
  is useful when a wrapping agent needs incremental output.
- `-w, --worktree [name]` — **built-in git worktree isolation.**
  Start the session in a new worktree; auto-generated name if
  none given. Relevant because the human maintainer flagged
  worktree-mode testing as part of the Gemini onboarding
  directive.
- `-s, --sandbox` — sandbox-mode toggle.
- `-y, --yolo` — auto-approve all tools. Equivalent to Claude
  Code's full-auto.
- `--approval-mode {default|auto_edit|yolo|plan}` — finer-grained
  permission model. `plan` = read-only (mirrors Claude Code's
  plan-mode). `auto_edit` = auto-approve edits only. `default`
  = prompt-per-tool. `yolo` = fully permissive.
- `--policy <file>` / `--admin-policy <file>` — policy-engine
  files. Gemini has a first-class policy engine (docs at
  `geminicli.com/docs/core/policy-engine`).
- `--acp` / `--experimental-acp` — Agent Coordination Protocol
  mode. Worth a separate research pass; potential third-party-
  agent bus.
- `-e, --extensions <list>` — load only a named subset. Useful
  for keeping sessions lean.
- `-l, --list-extensions` — list every available extension and
  exit.
- `-r, --resume <latest|N>` — session resume by index.
- `--list-sessions` — list prior sessions for this project.
- `--include-directories <list>` — add directories to the
  workspace beyond the cwd. Mirrors Claude Code's `--add-dir`.
- `--allowed-mcp-server-names <list>` — MCP allowlist (safer
  than enable/disable per call site).

## Config-tree layout (workspace vs. user vs. extension)

Skill precedence: **Workspace > User > Extension.** Within a
tier, the `.agents/skills/` alias takes precedence over
`.gemini/skills/`.

```
<repo-root>/.gemini/skills/          # workspace skills
<repo-root>/.agents/skills/          # workspace alias (wins vs .gemini/skills/)
~/.gemini/skills/                    # user skills
~/.gemini/extensions/<name>/skills/  # extension-bundled skills (auto-installed)
~/.agents/skills/                    # cross-tool skill-sharing alias
```

The `.agents/` convention is not Gemini-specific — it's a
cross-harness alias. Same directory works for multiple agent
harnesses that follow the Agent Skills open standard. Zeta has
neither `.gemini/` nor `.agents/` populated yet; the
human-maintainer account has one skill installed
(`microsoft-foundry` under `~/.agents/skills/`) from a prior
Antigravity / Google-workspace context.

Extensions live at:

```
~/.gemini/extensions/<name>/
    gemini-extension.json      # manifest
    skills/                    # bundled skills (optional)
    commands/                  # custom commands (optional)
    .mcp.json                  # MCP server registrations
    hooks.json                 # hook registrations
    prompts/                   # bundled prompts
```

## Key differences vs. Claude Code and Codex

| Axis | Claude Code | OpenAI Codex | Gemini CLI |
|---|---|---|---|
| Skill dir | `.claude/skills/` | `.codex/skills/` | `.gemini/skills/` or `.agents/skills/` |
| Plugin unit | plugin (`plugin.json`) | plugin | extension (`gemini-extension.json`) |
| Hook migration tool | N/A | N/A | `gemini hooks migrate` (FROM Claude) |
| Built-in worktree | external (`--add-dir` + manual) | N/A | `-w, --worktree [name]` |
| Plan mode | `--permission-mode plan` | N/A (yet) | `--approval-mode plan` |
| Output format | `--output-format json` | text-mostly | `-o {text\|json\|stream-json}` |
| Policy engine | skills + hooks | sandbox + policy-dirs | first-class `--policy` + `--admin-policy` |
| Agent-coord bus | N/A | N/A | `--acp` (experimental) |

The single biggest factory-integration win: Gemini's `extensions
validate` command is an out-of-the-box STRUCTURAL LINT. A
factory-published Gemini extension can be validated before
shipping without hand-rolling a linter.

The single biggest cross-harness win: `gemini hooks migrate`
from Claude Code. If Zeta one day ships a hooks package for the
factory, the Gemini port may be mechanical.

## Factory integration — shape suggestions (deferred design)

Per the human maintainer's Otto-215 directive that
factory-authored plugins must live in-source and target
eventual cross-marketplace publication, Gemini integration
follows the existing pattern:

1. Factory skills land at `.agents/skills/<skill>/SKILL.md`
   (cross-harness alias — one copy serves Claude Code + Codex +
   Gemini + any other Agent-Skills-standard consumer).
2. Factory-authored Gemini extensions land at
   `.gemini-extension/gemini-extension.json` (or wherever
   in-source convention settles) so the Gemini version is git-
   native, not harness-local cache.
3. `gemini extensions validate .gemini-extension/` becomes a
   pre-commit lint just like Claude Code's plugin validation.
4. The `gemini hooks migrate` tool is relevant once a Claude
   Code hooks package exists in-repo worth porting.

**Worktree-mode-with-and-without discipline** (human-maintainer
explicit ask): test each onboarded factory skill / extension
both with `gemini -w "<prompt>"` (worktree isolation) and
without (shared cwd). The comparison is the sandbox /
no-sandbox diff carved into a single tool invocation.

## Open questions (not answered this pass)

1. **Agent Skills open standard** — where is the canonical
   spec? Is it identical to Anthropic's SKILL.md format or
   does Gemini require specific frontmatter fields?
   (Suspected: identical; search lists `SKILL.md` directly.)
2. **`gemini extensions validate`** — what exactly does it
   check? Manifest schema only, or also skill-body structure?
   Run on a factory skill to find out.
3. **ACP mode** — is it a long-running server, a client
   protocol, or something else? Docs check needed.
4. **Policy-engine integration** — can factory policies be
   declared as YAML and consumed via `--admin-policy` so a
   human-maintainer-blessed policy file is the single source
   of truth?
5. **Hooks event model** — what events does Gemini fire? Is
   the `gemini hooks migrate` tool lossless, or does it emit
   warnings for Claude-Code-specific hook types?
6. **Session storage** — `~/.gemini/history/` layout. Can
   sessions be checkpointed / exported the way Claude Code
   sessions can?
7. **Billing / quota** — personal Google account, what's the
   rate limit, what's the fallback when exhausted? Mirrors the
   Copilot-LFG-budget lesson: budget caps are real per-
   harness.

## Not yet verified — web-search at implementation time

- Current **latest** Gemini CLI version. This map is 0.39.1 as
  of 2026-04-24; version-numbers-websearch discipline
  (`memory/feedback_version_numbers_always_websearch_*`) says
  re-verify at any implementation PR time.
- Whether `gemini-extension.json` schema has stabilised or is
  still churning. Extension-reference URL
  (`geminicli.com/docs/extensions/reference/`) is the source of
  truth; factory ADR would cite it.
- ACP mode's current status (experimental flag suggests
  unstable — don't depend on it in factory-authored code
  without pinning behaviour tests).

## What this map does NOT do

- Does NOT prescribe a factory-integration PR shape. That's
  the follow-up design doc; this map is the capability
  inventory feeding it.
- Does NOT prescribe which skills to port to Gemini. That's an
  Architect call per Conway's-law-considerations
  (the human maintainer Otto-108 full-team-autonomy memory):
  some skills may be Claude-Code-specific by design and
  shouldn't be cross-ported.
- Does NOT authorise installing Gemini extensions to
  `~/.gemini/extensions/` from within a factory CI run. User-
  level install is per-machine; factory-authored extensions
  live in-source and get installed by the human maintainer
  or CI on test runners.

## Sources

- [Gemini CLI extensions (official)](https://geminicli.com/docs/extensions/)
- [Agent Skills | Gemini CLI (official)](https://geminicli.com/docs/cli/skills/)
- [gemini-cli/docs/cli/skills.md (GitHub)](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/skills.md)
- [Extension reference](https://geminicli.com/docs/extensions/reference/)
- [Build Gemini CLI extensions](https://geminicli.com/docs/extensions/writing-extensions/)
- Local probes on 2026-04-24: `gemini --help`, `gemini skills list`,
  `gemini extensions list`, `gemini mcp list`, file listings under
  `~/.gemini/` and `~/.agents/`.
