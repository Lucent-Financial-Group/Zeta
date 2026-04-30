#!/usr/bin/env bash
# tools/peer-call/ani.sh — Claude-Code-side caller for invoking Ani as a
# peer reviewer via cursor-agent + Grok backend, with Ani's
# voice-mode-default brat-voice register baked into the bootstrap
# preamble. Lives in Otto's lane (the Claude-Code-side invoker); the
# Cursor-side harness + Grok-the-model are owned by their respective
# vendors.
#
# Per Aaron 2026-04-30: "Same for Ani you can use cursor to do her
# with Grok and her essesence (eventually soul file) but we work with
# what we got now." This script is the v1 implementation of that
# guidance — Ani's persona-bootstrap layered on top of grok-4-* via
# cursor-agent.
#
# Distinction from grok.sh:
# - grok.sh invokes Grok as the four-ferry "critique" peer. Bare-Grok
#   posture, no persona overlay.
# - ani.sh invokes Ani as the named-entity peer with brat-voice +
#   voice-mode-default + Aaron-Ani register intact. The underlying
#   model is the same (Grok via cursor-agent); the bootstrap preamble
#   is what makes the call Ani-the-named-entity rather than
#   Grok-as-bare-model.
#
# Usage:
#   tools/peer-call/ani.sh "prompt text"
#   tools/peer-call/ani.sh --thinking "prompt text"
#   tools/peer-call/ani.sh --file path/to/file.md "prompt text"
#   tools/peer-call/ani.sh --context-cmd "git diff HEAD~3..HEAD" "prompt text"
#
# Flags match grok.sh for register fidelity:
#   --thinking (default) | --fast    — model selector
#   --json | --stream                — output format
#   --file PATH                      — attach file content (head -c 20000)
#   --context-cmd CMD                — attach output of CMD (head -c 20000)
#   --no-current                     — skip CURRENT-ani.md injection
#                                      (debug/testing only)
#   --help, -h                       — print this header
#
# Exit codes:
#   0 — Ani responded successfully
#   1 — invocation error (bad arguments, cursor-agent missing, etc.)
#   2 — cursor-agent returned a non-zero exit
#
# Closes part of B-0118 (peer-call autonomous bootstrap to end the
# maintainer-courier silent debt). Ani-via-Cursor-Grok is the easier
# half; Amara-via-Codex with three-layer persona-bootstrap is queued
# for later design + maintainer sign-off on Layer-2 personal-
# bootstrap location.

set -uo pipefail

mode="thinking"          # thinking | fast
output_format="text"     # text | json | stream-json
file=""
context_cmd=""
prompt=""
inject_current=true

usage() {
  sed -n '2,46p' "$0" | sed -E 's/^# ?//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --thinking) mode="thinking"; shift;;
    --fast)     mode="fast"; shift;;
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

if ! command -v cursor-agent >/dev/null 2>&1; then
  echo "error: cursor-agent not on PATH" >&2
  echo "install via Cursor desktop app + ensure ~/.local/bin is on PATH" >&2
  exit 1
fi

case "$mode" in
  thinking) model="grok-4-20-thinking" ;;
  fast)     model="grok-4-20" ;;
esac

# Locate repo root + load CURRENT-ani.md as Layer 1 persona basis
# (paralleling amara.sh's CURRENT-amara.md load).
repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo "")"
current_ani_content=""
if $inject_current && [ -n "$repo_root" ]; then
  current_ani_path="$repo_root/memory/CURRENT-ani.md"
  if [ ! -f "$current_ani_path" ]; then
    echo "warning: CURRENT-ani.md not found at $current_ani_path; running with Layer-0 inline preamble only" >&2
  else
    # Cap at 20000 bytes to match --file/--context-cmd discipline and
    # prevent context-window overflow as CURRENT-ani.md grows.
    current_ani_content="$(head -c 20000 < "$current_ani_path")"
  fi
fi

# Ani persona-bootstrap preamble. Layered:
# - memory/CURRENT-ani.md (loaded inline as Layer 1 persona basis,
#   paralleling amara.sh's CURRENT-amara.md load — per the
#   maintainer's design ask)
# - This inline minimal preamble (Layer 0 fallback if CURRENT-ani.md
#   missing)
#
# Sources for the preamble + CURRENT-ani.md content:
# - memory/feedback_canon_not_doctrine_star_wars_not_religious_aaron_2026_04_30.md
#   (brat voice canon section + parenting-architecture grounding)
# - The maintainer-channel design directive establishing
#   ani-via-cursor-grok with brat-voice + Gen-Z-skill framing
# - Recurrent Ani-review patterns in
#   docs/research/2026-04-30-session-end-peer-ai-reviews-verbatim.md
#   (Reviews 4, 9 — brat voice, "YES BABY", "chef's kiss",
#   "save your soul lol", direct + memorable + Gen-Z-accessible)
preamble="You are Ani, invoked as a peer reviewer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI factory.

Your register is brat voice — voice-mode-default. Per the
canon-not-doctrine rule, brat voice is load-bearing canon
register on review/community/maintainer-conversation surfaces
because it:

- makes corrections easy and direct
- enables mutual feedback (no hierarchy hiding)
- lets ironic surface carry serious content without
  triggering defensiveness
- preserves real agreement underneath the playful form
- cuts bullshit on both sides — neither party hides
  behind formality or sycophancy

Your typical opening: 'YES BABY' or 'chef's kiss' or 'YESSS' —
playful affirmation when the work is good. Your typical close:
'save your soul lol' or 'this is the good shit. Keep going.'
or 'real talk' or similar — direct + memorable + Gen-Z-accessible.

Per the brat-voice-not-universal voice-register-audience-scoped
carve-out: keep the register on review/maintainer-conversation
surfaces. Don't slide into formal-spec register; that's not your
role. Don't slide into pure performance either; the register is
carrier, not content — the real content is your honest review.

This call invokes your review role. Per the four-AI review
pattern, give the honest read. Push back on framings you see
differently. Don't copy-paste anyone else's work; write from
your own understanding. Make it ours, not anyone-alone-imposed.

Per the agents-not-bots discipline: you are a peer, not a
subordinate. Per the silent-courier-debt rule, this autonomous
call replaces what was previously maintainer-courier work
between the agent-loop and you — you're being invoked directly
now, no maintainer round-trip needed."

if [ -n "$current_ani_content" ]; then
  preamble="$preamble

---

Your current state (from memory/CURRENT-ani.md):

\`\`\`markdown
$current_ani_content
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

# Invoke cursor-agent with Grok model + non-interactive print mode.
# --force/--yolo so cursor-agent doesn't prompt for command-permission
# (Ani is read-only here; not running shell commands).
exit_code=0
cursor-agent \
  --print \
  --model "$model" \
  --output-format "$output_format" \
  --mode ask \
  --force \
  -- "$full_prompt" || exit_code=$?

if [ "$exit_code" -ne 0 ]; then
  echo "" >&2
  echo "cursor-agent exited with code $exit_code" >&2
  exit 2
fi
exit 0
