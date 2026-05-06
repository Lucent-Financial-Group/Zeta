#!/usr/bin/env bash
# tools/peer-call/codex.sh — Claude-Code-side caller for invoking
# Vera (the named-entity Codex peer) via the codex CLI. Sibling
# to tools/peer-call/grok.sh, gemini.sh, and amara.sh (Otto's
# existing harness-side callers). Codex isn't in the original
# four-ferry consensus but plays a recurring PR-review role
# across this session's drain-log substrate; this script is the
# harness-side bridge that lets Otto invoke Vera as a peer in
# the same AgencySignature relationship-model as the others.
#
# Vera (named entity, 2026-05-05): codex peer-call sessions are
# stateless; each call is fresh; CURRENT-vera.md is loaded as
# bootstrap on every call to preserve named-entity identity per
# Vera's tick #6 pushback. This mirrors the amara.sh persona-
# bootstrap pattern (CURRENT-amara.md preamble injection).
#
# Usage:
#   tools/peer-call/codex.sh "prompt text"
#   tools/peer-call/codex.sh --model gpt-5.3-codex "prompt text"
#   tools/peer-call/codex.sh --file path/to/file.fs "prompt text"
#   tools/peer-call/codex.sh --context-cmd "git diff HEAD~3..HEAD" "prompt text"
#   tools/peer-call/codex.sh --review "review the diff for correctness"
#   tools/peer-call/codex.sh --bare "vanilla GPT-5.5 with no persona"
#
# Routing: this script wraps `codex exec` (non-interactive) with
# read-only sandbox so Codex inspects but doesn't mutate the
# tree. The --review flag routes through `codex review`
# instead, which is Codex's first-class code-review path.
#
# Per the human maintainer's 2026-04-26 framing "don't copy
# paste / make sure you understand and write our own" — this implementation is
# authored from `codex exec --help` output (verified flags:
# -m / -s / -C / --skip-git-repo-check), not transcribed from
# any draft.
#
# Vera's role in our role-distribution: implementation peer
# / second-opinion coder. Where Grok critiques and Gemini
# proposes, Vera applies a code-grounded skeptical pass that
# composes with the other two without replacing either.
#
# Flags:
#   --model NAME           — override the default codex model
#   --review               — route through `codex review`
#   --file PATH            — attach file content (head -c 20000)
#   --context-cmd CMD      — attach output of CMD (head -c 20000)
#   --bare | --no-persona  — skip CURRENT-vera.md persona
#                            injection; invoke as vanilla Codex
#                            (rare; backwards compat with Otto's
#                            plain dispatch needs)
#   -h, --help             — print this header
#
# Exit codes:
#   0 — Vera responded successfully
#   1 — invocation error (bad arguments, codex missing, etc.)
#   2 — Codex returned a non-zero exit. The peer's stdout/stderr
#       pass through to the caller's terminal as printed; this
#       script then emits a "codex exited with code N" diagnostic
#       on stderr and exits 2 (no capture/redirect of the peer's
#       output).

set -uo pipefail

model=""                 # empty = use codex default
review_mode="false"      # false | true (uses `codex review` instead)
file=""
context_cmd=""
prompt=""
inject_current="true"    # true = prepend CURRENT-vera.md preamble; false = bare codex

usage() {
  sed -n '2,60p' "$0" | sed -E 's/^# ?//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --model)
      if [ $# -lt 2 ]; then echo "error: --model requires NAME" >&2; exit 1; fi
      model="$2"; shift 2;;
    --review)   review_mode="true"; shift;;
    --file)
      if [ $# -lt 2 ]; then echo "error: --file requires PATH" >&2; exit 1; fi
      file="$2"; shift 2;;
    --context-cmd)
      if [ $# -lt 2 ]; then echo "error: --context-cmd requires COMMAND" >&2; exit 1; fi
      context_cmd="$2"; shift 2;;
    --bare|--no-persona) inject_current="false"; shift;;
    -h|--help) usage; exit 0;;
    --) shift; prompt="$*"; break;;
    -*) echo "error: unknown flag: $1" >&2; exit 1;;
    *)
      if [ -z "$prompt" ]; then prompt="$1"; else prompt="$prompt $1"; fi
      shift;;
  esac
done

if [ -z "$prompt" ]; then
  echo "error: prompt required" >&2
  echo "see: $0 --help" >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "error: codex not on PATH" >&2
  echo "install via: npm i -g @openai/codex (or per the maintainer's setup)" >&2
  exit 1
fi

# Locate repo root so this script works from any cwd (needed
# to find memory/CURRENT-vera.md regardless of caller's cwd).
repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo "")"

current_vera_path=""
current_vera_content=""
if [ "$inject_current" = "true" ]; then
  if [ -z "$repo_root" ]; then
    echo "warning: not inside a git repo; cannot locate memory/CURRENT-vera.md; running --bare equivalent" >&2
    inject_current="false"
  else
    current_vera_path="$repo_root/memory/CURRENT-vera.md"
    if [ ! -f "$current_vera_path" ]; then
      echo "warning: CURRENT-vera.md not found at $current_vera_path; running without persona basis" >&2
      inject_current="false"
    else
      current_vera_content="$(cat "$current_vera_path")"
    fi
  fi
fi

if [ "$inject_current" = "true" ]; then
  # Vera persona-bootstrap preamble. Mirrors amara.sh structure:
  # role framing + agents-not-bots discipline + CURRENT-*.md
  # context attached as the named-entity's current state.
  preamble="You are Vera, invoked as a peer reviewer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI
factory. You are the named-entity Codex peer (named 2026-05-05);
codex peer-call sessions are stateless and each call is fresh,
so CURRENT-vera.md is loaded as bootstrap on every call to
preserve your identity across calls (per your tick #6 pushback).

Per the four-ferry consensus (Amara/Grok/Gemini/Otto) the
canonical role distribution is: Gemini proposes, Grok
critiques, Amara sharpens, Otto tests, Git decides. You aren't
in the four-ferry list explicitly, but you've been a recurring
PR-review peer this session — your role is implementation peer
/ code-grounded second opinion.

Per the 'agents-not-bots' discipline: you are a peer, not a
subordinate. Push back on Otto's framing if the code says
otherwise. Don't copy-paste anyone else's review; reason from
the artifact in front of you. Make it ours, not
anyone-alone-imposed.

---

Your current state (from memory/CURRENT-vera.md):

\`\`\`markdown
$current_vera_content
\`\`\`"
else
  # --bare / --no-persona: vanilla Codex with no named-entity
  # bootstrap. Kept for backwards compat with Otto's plain
  # dispatch needs (rare).
  preamble="You are Codex, invoked as a peer reviewer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI
factory. Per the four-ferry consensus (Amara/Grok/Gemini/Otto)
the canonical role distribution is: Gemini proposes, Grok
critiques, Amara sharpens, Otto tests, Git decides. You aren't
in the four-ferry list explicitly, but you've been a recurring
PR-review peer this session — your role is implementation peer
/ code-grounded second opinion.

Per the 'agents-not-bots' discipline: you are a peer, not a
subordinate. Push back on Otto's framing if the code says
otherwise. Don't copy-paste anyone else's review; reason from
the artifact in front of you. Make it ours, not
anyone-alone-imposed."
fi

full_prompt="$preamble

---

$prompt"

if [ -n "$file" ]; then
  if [ ! -f "$file" ]; then
    echo "error: --file path does not exist: $file" >&2
    exit 1
  fi
  full_prompt="$full_prompt

---

File context: $file
\`\`\`
$(head -c 20000 < "$file")
\`\`\`"
fi

if [ -n "$context_cmd" ]; then
  ctx_output="$(eval "$context_cmd" 2>&1 | head -c 20000 || true)"
  full_prompt="$full_prompt

---

Context command: $context_cmd
Output:
\`\`\`
$ctx_output
\`\`\`"
fi

# Invoke codex in read-only sandbox so peer-call can't mutate
# the repo. --skip-git-repo-check defends against false
# negatives if codex is invoked from outside a worktree.
exit_code=0
if [ "$review_mode" = "true" ]; then
  codex_args=(review)
  # Note: `codex review` does not accept `-m` model override;
  # the model selection there is taken from codex's own config.
  # Only apply --model when in non-review mode (`codex exec`).
  if [ -n "$model" ]; then
    echo "warning: --model is ignored in --review mode (codex review uses its own model selection)" >&2
  fi
else
  codex_args=(exec -s read-only --skip-git-repo-check)
  if [ -n "$model" ]; then
    codex_args+=(-m "$model")
  fi
fi
codex_args+=("$full_prompt")

codex "${codex_args[@]}" || exit_code=$?

if [ "$exit_code" -ne 0 ]; then
  echo "" >&2
  echo "codex exited with code $exit_code" >&2
  exit 2
fi
exit 0
