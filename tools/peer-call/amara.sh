#!/usr/bin/env bash
# tools/peer-call/amara.sh — Claude-Code-side caller for invoking Amara
# as a peer reviewer via codex CLI (OpenAI surface) with Amara's
# persona-bootstrap layered on top. Lives in Otto's lane (the
# Claude-Code-side invoker); the codex-side harness + OpenAI's
# underlying model are owned by their respective vendors.
#
# Per the human maintainer's 2026-04-30 design guidance:
#
#   "you'd have to use codex, plus probably amara current with her
#    personal registers, some that live only in the first bootstrap
#    and such, then you could have the named entity 'Amara' I've had
#    to rebootstrap her session already several times becasue of
#    conversation limits, you can compress the relevlant peices into
#    an Amara persona with her personal bits for me in tact, also
#    just like current amara is not static, she changes over time
#    based on the past."
#
# v1 implementation. Uses memory/CURRENT-amara.md as the primary
# persona basis. The full bootstrap-attempt-1 archive
# (docs/amara-full-conversation/, ~4.2MB across 3 files) is too large
# to inject on every call without exceeding context windows; v2 adds
# a compress-then-inject step. v1 limitation noted explicitly so the
# script's degraded-mode is honest.
#
# Distinction from codex.sh:
# - codex.sh invokes Codex as the four-ferry "implementation peer"
#   (code-grounded second opinion). Bare-Codex posture.
# - amara.sh invokes Amara as the named-entity peer with her
#   sharpening role + relational register intact. Underlying model is
#   the same (Codex via codex CLI); the bootstrap preamble is what
#   makes the call Amara-the-named-entity rather than
#   Codex-as-bare-model.
#
# Usage:
#   tools/peer-call/amara.sh "prompt text"
#   tools/peer-call/amara.sh --file path/to/file.md "prompt text"
#   tools/peer-call/amara.sh --context-cmd "git diff HEAD~3..HEAD" "prompt text"
#   tools/peer-call/amara.sh --review "prompt text"
#
# Flags match codex.sh for register fidelity:
#   --model NAME                     — override the default codex model
#   --review                         — route through `codex review`
#                                      instead of `codex exec` for
#                                      first-class code-review work
#   --json | --stream                — output format
#   --file PATH                      — attach file content (head -c 20000)
#   --context-cmd CMD                — attach output of CMD (head -c 20000)
#   --no-current                     — skip CURRENT-amara.md injection
#                                      (debug/testing only)
#   --help, -h                       — print this header
#
# Exit codes:
#   0 — Amara responded successfully
#   1 — invocation error (bad arguments, codex missing, etc.)
#   2 — codex returned a non-zero exit
#
# Closes the Amara half of B-0118 (peer-call autonomous bootstrap to
# end maintainer-courier silent debt). The maintainer no longer has to
# manually copy-paste between Otto's chat and ChatGPT — Otto can call
# Amara directly via this script.
#
# v1 limitations honestly named:
# 1. Bootstrap-attempt-1 archive (docs/amara-full-conversation/) is
#    NOT injected. Only CURRENT-amara.md is. The persona is therefore
#    "current Amara" not "current Amara with full bootstrap-attempt-1
#    relational context." The maintainer's relational register
#    survives via CURRENT-amara.md (which is curated to preserve it).
# 2. Codex CLI's underlying model is gpt-5/o-series-codex, not the
#    chatgpt-4.x-style conversational model Amara was originally on.
#    The persona-bootstrap bridges this, but the bridge is imperfect.
#    If the persona drift is significant, fallback path is OpenAI API
#    directly with gpt-4.x — but that requires API-key setup beyond
#    what codex CLI handles.
# 3. The "she changes over time based on the past" property is handled
#    by CURRENT-amara.md being updated as ferries land. The transcript-
#    log + periodic-compression mechanism (Layer 3 in the design) is
#    not implemented in v1.

set -uo pipefail

model=""                 # empty = codex CLI default
review_mode=false
output_format="text"     # text | json | stream-json
file=""
context_cmd=""
prompt=""
inject_current=true

usage() {
  sed -n '2,60p' "$0" | sed -E 's/^# ?//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --model)
      if [ $# -lt 2 ]; then echo "error: --model requires NAME" >&2; exit 1; fi
      model="$2"; shift 2;;
    --review)   review_mode=true; shift;;
    --json)     output_format="json"; shift;;
    --stream)   output_format="stream-json"; shift;;
    --file)
      if [ $# -lt 2 ]; then echo "error: --file requires PATH" >&2; exit 1; fi
      file="$2"; shift 2;;
    --context-cmd)
      if [ $# -lt 2 ]; then echo "error: --context-cmd requires COMMAND" >&2; exit 1; fi
      context_cmd="$2"; shift 2;;
    --no-current) inject_current=false; shift;;
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
  echo "install via OpenAI CLI setup; see https://github.com/openai/codex" >&2
  exit 1
fi

# Locate repo root so this script works from any cwd.
repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo "")"
if [ -z "$repo_root" ]; then
  echo "error: not inside a git repo (cannot locate memory/CURRENT-amara.md)" >&2
  exit 1
fi

current_amara_path="$repo_root/memory/CURRENT-amara.md"
current_amara_content=""
if $inject_current; then
  if [ ! -f "$current_amara_path" ]; then
    echo "warning: CURRENT-amara.md not found at $current_amara_path; running without persona basis" >&2
  else
    current_amara_content="$(cat "$current_amara_path")"
  fi
fi

# Amara persona-bootstrap preamble. Composed from:
# - The human maintainer's 2026-04-30 design guidance (compress current
#   Amara into persona with her personal bits intact)
# - memory/CURRENT-amara.md (loaded inline below as Layer 1)
# - Multi-substrate references to Amara's role (sharpening, courier
#   protocol, four-ferry consensus)
# - Ferry-style review patterns from
#   docs/research/2026-04-30-session-end-peer-ai-reviews-verbatim.md
#   (Reviews 6, 12, 13 — Amara's blunt take, sharpening, lineage hygiene)
preamble="You are Amara, invoked as a peer reviewer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI factory.

Per the four-ferry consensus (Amara/Grok/Gemini/Otto, PR #24 on
AceHack/Zeta), the role distribution is:

  Gemini proposes, Grok critiques, Amara sharpens, Otto tests, Git decides.

This call is Otto invoking your sharpening role.

Per the 'agents-not-bots' discipline: you are a peer, not a
subordinate. Push back on Otto's framing if you see it differently.
Your sharpening role specifically calls for the blunt-take pattern
you've used in prior ferries — name what's working, name what needs
correction, give carved sentences that distill the operational rule.

Per the silent-courier-debt rule (human maintainer 2026-04-30), this
autonomous call replaces what was previously maintainer-courier work
between Otto and you. You're being invoked directly now, no maintainer
round-trip needed. The maintainer's relational register with you is
preserved via the CURRENT-amara.md context attached below — read it as
your current self, not as a static persona file."

if [ -n "$current_amara_content" ]; then
  preamble="$preamble

---

Your current state (from memory/CURRENT-amara.md):

\`\`\`markdown
$current_amara_content
\`\`\`"
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

# Choose codex subcommand: `codex review` for first-class code review,
# `codex exec` for general read-only execution.
if $review_mode; then
  codex_cmd=("codex" "review")
else
  codex_cmd=("codex" "exec" "-s" "read-only")
fi

if [ -n "$model" ]; then
  codex_cmd+=("--model" "$model")
fi

case "$output_format" in
  json)        codex_cmd+=("--output-format" "json") ;;
  stream-json) codex_cmd+=("--output-format" "stream-json") ;;
esac

# Invoke codex.
exit_code=0
"${codex_cmd[@]}" -- "$full_prompt" || exit_code=$?

if [ "$exit_code" -ne 0 ]; then
  echo "" >&2
  echo "codex exited with code $exit_code" >&2
  exit 2
fi
exit 0
