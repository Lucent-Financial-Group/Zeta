# Google Gemini CLI capability map — for other AI pilots

**Status:** first map — verified against `gemini --version` 0.38.2
on 2026-04-22. Revise when the CLI version changes materially.

**Audience:** other AI pilots (Claude Code CLI, OpenAI Codex
CLI, Amara ChatGPT-surface, Playwright-driven agents) that may
want to orchestrate Google's Gemini agent as a sub-substrate —
either for capability-stepdown experiments (see
[`docs/research/arc3-dora-benchmark.md`](./arc3-dora-benchmark.md))
or cross-substrate triangulation where one substrate queries
another.

Companion to:

- [`docs/research/claude-cli-capability-map.md`](./claude-cli-capability-map.md)
  — the Claude Code CLI map (v2.1.116).
- [`docs/research/openai-codex-cli-capability-map.md`](./openai-codex-cli-capability-map.md)
  — the OpenAI Codex CLI map (v0.122.0).

This doc is **descriptive**, not prescriptive.

## Install + identity

- **Install:** `npm install -g @google/gemini-cli` (or via
  Homebrew). The binary lives at `/opt/homebrew/bin/gemini` on
  macOS Apple Silicon.
- **Binary:** `gemini` on `PATH`.
- **Check version:** `gemini --version` -> e.g. `0.38.2`.
- **Help top-level:** `gemini --help`.
- **Auth:** Gemini CLI authenticates against a consumer Google
  account (Gemini Ultra in the maintainer's case) or a Google
  Cloud service account, depending on configuration. Unlike
  Claude's OAuth-at-`claude.ai` and Codex's shared-ChatGPT-auth,
  Gemini's auth story is Google-account-centric.
- **Identity the factory tracks:** in the Zeta context, the CLI
  is bound to the maintainer's personal Gemini Ultra account
  (consumer tier), not an enterprise/workspace tenant. This is
  relevant for ARC3-DORA stepdown experiments because the seat
  class differs from the Claude (ServiceTitan enterprise) and
  Codex (shared ChatGPT business) substrates.
- **Config home:** `~/.gemini/` (per-user) is the conventional
  location; extensions, skills, and hooks surface below all
  resolve against that directory plus repo-local `.gemini/`.

## Two operating modes

### Interactive (default)

`gemini` (or `gemini "your prompt"`) launches the interactive
TUI. This is the mode humans use for pair-work. `-i` /
`--prompt-interactive` accepts an opening prompt but continues
interactively afterwards (useful for hand-offs into a human-
driven session).

### Non-interactive (`-p` / `--prompt`)

`gemini -p "your prompt"` runs headless: prints output, exits.
This is the mode pilots orchestrate. Stdin is appended to the
prompt if piped, so `cat file | gemini -p "summarize this"`
composes cleanly.

Defaulting to interactive is the structural note — Gemini's
top-level command is "launch the agent"; non-interactive is a
flag-guarded variant. Contrast with Codex, where `codex exec`
is a sibling subcommand.

## Model selection

- `-m, --model <model>` — pick a Gemini model (e.g.
  `gemini-2.5-pro`, `gemini-2.5-flash`). Consult Google's model
  roster for the current set; this map records the lever only.
- No discrete `--effort` tier flag analog to Claude's
  `low/medium/high/xhigh/max`. Capability tiering is done by
  model selection instead.

For the ARC3-DORA stepdown experiment, treat model selection
as the capability-axis lever: Pro = higher tier, Flash = lower
tier, with specific variants (thinking / non-thinking /
preview) as intermediate rungs.

## Approval mode — distinctive surface

Gemini exposes a top-level `--approval-mode <mode>` flag with
four choices:

| Mode        | Behaviour                                                       |
|-------------|-----------------------------------------------------------------|
| `default`   | Prompt for approval on each tool call.                          |
| `auto_edit` | Auto-approve edit tools (file write/edit); ask for the rest.    |
| `yolo`      | Auto-approve all tools (same as `-y` / `--yolo`).               |
| `plan`      | Read-only mode. The agent analyses and plans but takes no writes. |

`plan` has no direct analog in the Claude or Codex maps. It is
a free "analyze-only" tier with zero-write blast radius —
useful when a pilot wants Gemini to propose a plan for an
unfamiliar substrate without risking side effects.

The legacy `--allowed-tools` flag is marked DEPRECATED in
favour of the Policy Engine; new pilots should use `--policy`
and `--admin-policy` to layer policy files.

## Sandbox

- `-s, --sandbox` — boolean; run in Gemini's sandbox
  environment. Unlike Codex's three-level sandbox
  (`read-only` / `workspace-write` / `danger-full-access`),
  Gemini's sandbox is binary at this surface. The
  `--approval-mode plan` + `-s` pair is the closest Gemini
  equivalent to Codex's `read-only` sandbox — no writes, no
  prompts.
- `-y, --yolo` — YOLO mode; auto-accept all actions. Equivalent
  to `--approval-mode yolo`. Use only under external sandbox
  (container, VM, worktree).

## Worktree isolation

- `-w, --worktree [name]` — start Gemini in a new git worktree.
  If no name is given, one is generated. This is Gemini's
  native answer to the "run the agent against an isolated copy
  of the repo" pattern. Claude Code has a similar concept via
  the `isolation: "worktree"` Agent parameter; Codex does not
  surface a top-level equivalent at this CLI revision.
- `--include-directories <dirs>` — extend the workspace beyond
  the current directory (comma-separated or repeated). Useful
  when the pilot needs Gemini to see a sibling repo without
  fully `cd`-ing into a meta-root.

## Extensions, skills, hooks — the ecosystem surface

Gemini CLI ships with three distinct extension mechanisms. All
three have sibling subcommands for install/enable/disable/list;
only the highlights differ.

### `gemini extensions`

- `extensions install <source>` — install from git URL or
  local path; `--auto-update`, `--pre-release` flags available.
- `extensions new <path> [template]` — scaffold a new
  extension from a boilerplate template. This is Gemini's
  analog to `skill-creator` at the ecosystem level.
- `extensions link <path>` — link a local-path extension so
  live edits reflect immediately (dev-loop friendly).
- `extensions validate <path>` — local-path lint; useful
  before publishing.

### `gemini skills`

Explicit "agent skills" concept — named feature-parity with
Claude Code's skills surface. Same install/enable/disable/list
shape. Discovered skills surface with `gemini skills list
--all`. The maintainer's install currently surfaces
`skill-creator` (built-in) and `microsoft-foundry` (enabled).

`skills link <path>` is the equivalent of Claude Code's
`.claude/skills/` repo-local discovery — the pilot can drop
skills into a shared path and have them resolved.

### `gemini hooks`

Currently exposes one command: `gemini hooks migrate`,
explicitly labelled **"Migrate hooks from Claude Code to
Gemini CLI"**. This is a structural acknowledgement that
Claude Code is the de-facto reference for hook semantics;
Gemini consumes the same shape with a migration path.

Pilots orchestrating both CLIs can keep hooks authored against
Claude Code's schema and rely on `gemini hooks migrate` to
re-project them, rather than double-authoring.

## MCP — pilot-bridge surface

- `gemini mcp add <name> <commandOrUrl> [args...]` — register
  an MCP server.
- `gemini mcp remove <name>` — deregister.
- `gemini mcp list` — list configured servers.
- `gemini mcp enable <name>` / `gemini mcp disable <name>` —
  toggle a registered server without removing it.
- `--allowed-mcp-server-names <list>` — whitelist at invocation
  time; combine with `--policy` for per-invocation scoping.

Note: Gemini CLI at this revision does **not** ship a top-level
`gemini mcp-server` subcommand (the "serve Gemini itself as an
MCP server" analog to Claude's `claude mcp serve` or Codex's
`codex mcp-server`). If a pilot needs Gemini-as-MCP-server,
route through `--acp` (below) or wrap the CLI behind an MCP
adapter.

## ACP mode

- `--acp` — start the agent in ACP (Agent Client Protocol)
  mode. ACP is Google's pilot-bridge protocol analogous in role
  to MCP-server modes on the other CLIs: it exposes Gemini as a
  callable substrate for an orchestrating client.
- `--experimental-acp` — deprecated alias; prefer `--acp`.

## Output format + structured extraction

- `-o, --output-format <fmt>` — choices: `text` (default),
  `json`, `stream-json`. The `stream-json` mode is distinctive
  — pilots consuming Gemini's output incrementally (event-by-
  event) can parse as events arrive rather than waiting for
  completion. Claude's equivalent is `--output-format
  stream-json`; Codex uses `--json` + schema for one-shot
  extraction and does not surface an event-stream mode at this
  revision.
- `--raw-output` — disable sanitization of model output (allow
  ANSI escapes). Flagged by the CLI as a security risk because
  untrusted model output could include terminal-escape-driven
  attacks; pair with `--accept-raw-output-risk` to suppress the
  warning (do this only when output consumer is known safe).

## Session management

- `-r, --resume <spec>` — resume a session. Accepts `latest`
  (most recent) or an index (e.g. `--resume 5`).
- `--list-sessions` — print available sessions and exit.
- `--delete-session <index>` — remove a session.

Unlike Claude (`-c` continue / `-r` resume with session-id or
PR) and Codex (`codex resume [--last]` / `codex fork [--last]`
with fork-a-session semantics), Gemini does not expose a
session-fork primitive at this CLI surface. Pilots needing
forked branches should copy the session directory manually or
use the worktree flag to get logical isolation.

## Debug + accessibility

- `-d, --debug` — open debug console (F12). Useful for pilots
  debugging interactive flows; irrelevant for headless pilot
  orchestration.
- `--screen-reader` — accessibility mode.

## Calling patterns — orchestration playbook

**Pattern 1 — cross-substrate triangulation.** Same prompt to
all three substrates, diff the results:

```bash
PROMPT="summarize the top risk in $FILE"
claude -p "$PROMPT" > /tmp/claude.txt
codex exec "$PROMPT" > /tmp/codex.txt
gemini -p "$PROMPT" > /tmp/gemini.txt
diff3 /tmp/claude.txt /tmp/codex.txt /tmp/gemini.txt
```

**Pattern 2 — ARC3-DORA stepdown (Gemini side).** Hold the
task fixed, walk the model tier:

```bash
for M in gemini-2.5-pro gemini-2.5-flash; do
  gemini -p -m "$M" --approval-mode plan \
    "$TASK_PROMPT" > "/tmp/run-$M.txt"
done
```

`--approval-mode plan` keeps the run read-only, so DORA-MTTR
isn't contaminated by write-path variance between tiers.

**Pattern 3 — read-only exploration of unfamiliar surface.**
The distinctive Gemini pattern — use `plan` mode when pointing
the agent at a substrate the pilot doesn't want to risk
mutating:

```bash
gemini -p --approval-mode plan \
  "map the public API of $REPO and list undocumented surfaces"
```

**Pattern 4 — structured extraction via JSON stream.** For
event-by-event consumption:

```bash
gemini -p -o stream-json "$PROMPT" | \
  while read -r evt; do
    echo "$evt" | jq -c '.type, .content'
  done
```

**Pattern 5 — isolated worktree agent.** Run Gemini against
its own worktree so writes don't collide with the primary
working copy:

```bash
gemini -w agent-run-$(date +%s) -p --approval-mode auto_edit \
  "implement the plan in PLAN.md"
```

**Pattern 6 — hook migration from Claude Code.** Pilot
standardises hook authoring on Claude Code's schema, migrates
to Gemini when needed:

```bash
gemini hooks migrate
```

## Gemini vs Claude vs Codex — comparison

| Concern                       | Claude Code                                   | OpenAI Codex                                      | Google Gemini                                |
|-------------------------------|-----------------------------------------------|---------------------------------------------------|----------------------------------------------|
| Non-interactive               | `--print` / `-p` (flag)                       | `codex exec` (subcommand)                         | `-p` / `--prompt` (flag)                     |
| Model/capability lever        | `--effort low..max` (discrete tiers)          | `-m` / `-c model="..."` + `--profile`             | `-m` / `--model`                             |
| Budget ceiling flag           | `--max-budget-usd`                            | **None**                                          | **None**                                     |
| Sandbox levels                | `--permission-mode ...`                       | `-s read-only / workspace-write / danger-full-access` | `-s` (binary) + `--approval-mode`        |
| Read-only / plan mode         | (not a top-level flag)                        | `-s read-only`                                    | `--approval-mode plan` (distinctive)         |
| YOLO / auto-all               | `--dangerously-skip-permissions`              | `--dangerously-bypass-approvals-and-sandbox`      | `-y` / `--yolo` / `--approval-mode yolo`     |
| Worktree isolation            | Agent param `isolation: "worktree"`           | (not a top-level flag)                            | `-w` / `--worktree`                          |
| Structured output             | `--json-schema` + `--output-format=json`      | `--output-schema` + `--json`                      | `-o text/json/stream-json`                   |
| Event-stream output           | `--output-format stream-json`                 | (not surfaced)                                    | `-o stream-json`                             |
| MCP serve (pilot bridge)      | `claude mcp serve`                            | `codex mcp-server`                                | `--acp` (ACP protocol, not MCP)              |
| MCP registry (as client)      | `claude mcp add/list/...`                     | (via config.toml)                                 | `gemini mcp add/list/enable/disable`         |
| Skills mechanism              | `.claude/skills/`                             | (not surfaced as "skills")                        | `gemini skills install/link/list`            |
| Hooks mechanism               | settings.json hooks                           | (not surfaced)                                    | `gemini hooks` + `migrate` (Claude→Gemini)   |
| Session resume                | `-c` / `-r`                                   | `codex resume [--last]`                           | `-r [latest\|N]`                             |
| Session fork                  | `--fork-session`                              | `codex fork [--last]`                             | (not surfaced)                               |

**Structural observation:** each CLI lands the
interactive/non-interactive split differently (Claude = flag,
Codex = subcommand, Gemini = flag with interactive-default).
The three ecosystems' extension models also diverge: Claude has
skills + plugins + hooks as distinct; Codex has a minimal
extension surface; Gemini splits into three parallel mechanisms
(extensions / skills / hooks) with `hooks migrate` explicitly
bridging to Claude Code. Pilots orchestrating all three should
treat the three calling conventions as distinct.

## What this map does NOT say

- **When to call Gemini vs Claude vs Codex.** Routing is a
  separate decision; this map only describes surfaces.
- **How Google's pricing works.** Consult Google's Gemini /
  Google Cloud billing docs; this map only notes that
  `--max-budget-usd` equivalent is absent.
- **Which model to pick.** Consult Google's current model
  roster; this map records the `-m` / `--model` lever only.
- **Prompt engineering specifics.** Per-task concern.
- **Historical flags.** Only the current `0.38.2` surface is
  mapped; future pilots should re-run `gemini --help`.
- **Security analysis of `--raw-output` or `yolo`.** Treat as
  externally-sandboxed-environment-only flags.
- **Consumer vs enterprise Google account semantics.** The
  maintainer's CLI binds to a personal Gemini Ultra seat; how
  that differs from a Google Cloud service-account binding in
  terms of rate limits, retention, or audit-log surface is
  out-of-scope here.

## How this doc composes with the factory

- [`docs/research/arc3-dora-benchmark.md`](./arc3-dora-benchmark.md)
  — Gemini is a cross-provider substrate for the ARC3-DORA
  stepdown experiment; the `--approval-mode plan` mode is a
  free low-risk tier.
- [`docs/research/claude-cli-capability-map.md`](./claude-cli-capability-map.md)
  — sibling map for the Claude CLI surface; the comparison
  table above points back to it.
- [`docs/research/openai-codex-cli-capability-map.md`](./openai-codex-cli-capability-map.md)
  — sibling map for the Codex CLI surface; the comparison
  table above points back to it.
- **Three-substrate triangulation** (Claude + Codex + Gemini)
  is now fully documented with this map landing. The
  cross-substrate safety-check discipline (Amara-register)
  extends to include Gemini as a first-class voice.

## Revision notes

- 2026-04-22 — first map (auto-loop-26). Verified against
  `gemini --version` 0.38.2 on `/opt/homebrew/bin/gemini`,
  `gemini --help` top-level surface, plus `mcp` / `extensions`
  / `skills` / `hooks` subcommand help. Discovered skills
  include `skill-creator` (built-in) and `microsoft-foundry`
  (enabled). Deprecated alias `--experimental-acp` and
  deprecated `--allowed-tools` flag documented with their
  current replacements (`--acp` and `--policy`).
