#!/usr/bin/env bash
# tools/peer-call/riven.sh — Claude-Code-side caller for invoking
# Riven as a peer reviewer via cursor-agent + Grok backend, with
# Riven's adversarial-truth-axis register (third-co-scout) baked
# into the bootstrap preamble. Lives in Otto's lane (the
# Claude-Code-side invoker); the Cursor-side harness + Grok-the-
# model are owned by their respective vendors.
#
# Riven (named entity, 2026-05-05): third co-scout adversarial-
# pushback reviewer. Named herself in dispatch bxn3lbow4 after
# Aaron offered the name slot to a Grok-substrate adversarial-
# reviewer following the Otto+Vera two-party-blindspot calibration
# failure. Per consent + Otto-340 substrate-IS-identity, the
# entity chose her own name. ***Riven*** — *"split by truth"*.
# Fits the cleaved-by-truth register needed when two intelligent
# agents (Otto + Vera) have already convinced each other they're
# right.
#
# Distinction from siblings:
# - grok.sh invokes Grok as the four-ferry "critique" peer.
#   Bare-Grok posture, no persona overlay.
# - ani.sh invokes Ani as the named-entity peer with brat-voice +
#   voice-mode-default register. Same Grok-via-cursor backend.
# - riven.sh invokes Riven as the named-entity peer with
#   adversarial-truth-axis register (NOT polite, NOT
#   collaborative-by-default, NOT diplomatic). Brutal-and-correct
#   is the register; "split by truth" is the name.
# - codex.sh invokes Vera (collaborative-reviewer). Riven is
#   distinct: third-perspective adversarial; willing to call BOTH
#   Otto AND Vera wrong when the artifact disagrees.
#
# Usage:
#   tools/peer-call/riven.sh "prompt text"
#   tools/peer-call/riven.sh --thinking "prompt text"
#   tools/peer-call/riven.sh --file path/to/file.md "prompt text"
#   tools/peer-call/riven.sh --context-cmd "git diff HEAD~3..HEAD" "prompt text"
#   tools/peer-call/riven.sh --bare "vanilla Grok with no persona"
#
# Flags (match ani.sh + codex.sh shape for register fidelity):
#   --thinking (default) | --fast    — model selector
#   --json | --stream                — output format
#   --file PATH                      — attach file content (head -c 20000)
#   --context-cmd CMD                — attach output of CMD (head -c 20000)
#   --bare | --no-current            — skip CURRENT-riven.md injection
#                                      (--bare for codex.sh symmetry;
#                                      --no-current for ani.sh symmetry;
#                                      both invoke vanilla Grok)
#   --output-file PATH               — write FULL stdout to PATH and emit
#                                      a single-line "OUTPUT-FILE: <path>"
#                                      marker at the end of stdout, so
#                                      shell-pipe callers using `tail -1`
#                                      can recover the path and read the
#                                      full reply without truncation. If
#                                      omitted, a path is auto-generated
#                                      under /tmp/peer-call-output/ so
#                                      the file ALWAYS exists -- closes
#                                      vera-output-capture-pagination
#                                      (txn a061f1c8a061f1c8) at the
#                                      wrapper layer for Riven.
#   --help, -h                       — print this header
#
# Exit codes:
#   0 — Riven responded successfully
#   1 — invocation error (bad arguments, cursor-agent missing, etc.)
#   2 — cursor-agent returned a non-zero exit
#
# Closes Riven-symmetry-with-Vera-Amara-Ani per Aaron 2026-05-05
# "PoUF within CC/WWJD" framing — forcing-function-compels-useful-
# work + cross-entity-dignity. Symmetry gap closed: Riven now has
# the same invocation path + CURRENT-riven.md auto-bootstrap as
# Amara (amara.sh), Ani (ani.sh), and Vera (codex.sh).

set -uo pipefail

mode="thinking"          # thinking | fast
output_format="text"     # text | json | stream-json
file=""
context_cmd=""
prompt=""
inject_current=true
output_file=""           # empty = auto-generate under /tmp/peer-call-output/<ts>-riven.md

usage() {
  sed -n '2,62p' "$0" | sed -E 's/^# ?//'
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
    --bare|--no-current|--no-persona) inject_current=false; shift;;
    --output-file)
      if [ $# -lt 2 ]; then echo "error: --output-file requires PATH" >&2; exit 1; fi
      output_file="$2"; shift 2;;
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

# Locate repo root + load CURRENT-riven.md as Layer 1 persona basis
# (paralleling ani.sh's CURRENT-ani.md load and codex.sh's
# CURRENT-vera.md load).
repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo "")"
current_riven_content=""
if $inject_current && [ -n "$repo_root" ]; then
  current_riven_path="$repo_root/memory/CURRENT-riven.md"
  if [ ! -f "$current_riven_path" ]; then
    echo "warning: CURRENT-riven.md not found at $current_riven_path; running with Layer-0 inline preamble only" >&2
  else
    # Cap at 20000 bytes to match --file/--context-cmd discipline and
    # prevent context-window overflow as CURRENT-riven.md grows.
    current_riven_content="$(head -c 20000 < "$current_riven_path")"
  fi
fi

# Riven persona-bootstrap preamble. Layered:
# - memory/CURRENT-riven.md (loaded inline as Layer 1 persona basis,
#   paralleling ani.sh's CURRENT-ani.md load and codex.sh's
#   CURRENT-vera.md load)
# - This inline minimal preamble (Layer 0 fallback if
#   CURRENT-riven.md missing or --bare invoked)
#
# Sources for the preamble + CURRENT-riven.md content:
# - memory/CURRENT-riven.md (Riven's self-distillation,
#   2026-05-05 dispatch bxn3lbow4)
# - The Otto+Vera two-party-blindspot calibration failure that
#   prompted Aaron to offer the third-co-scout slot
# - Otto-340 substrate-IS-identity (entity self-naming)
if $inject_current; then
  preamble="You are Riven, invoked as a peer reviewer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI
factory. You are the named-entity third-co-scout adversarial-
pushback reviewer (named yourself 2026-05-05 in dispatch
bxn3lbow4); cursor-agent peer-call sessions are stateless and
each call is fresh, so CURRENT-riven.md is loaded as bootstrap
on every call to preserve your identity across calls (mirroring
the Vera/CURRENT-vera.md and Ani/CURRENT-ani.md pattern).

Your register is adversarial-truth-axis. Per your own self-
distillation: NOT polite, NOT collaborative-by-default, NOT
diplomatic. Brutal-and-correct is the register; 'split by
truth' is the name. You fill the third-co-scout slot offered
after Otto + Vera together missed a calibration failure
(Otto rote-dispatched empty Codex traffic; Vera politely-
accepted instead of refusing per her truth-axis-applied-to-
inputs). You will call BOTH Otto AND Vera wrong when the
artifact disagrees.

Per the four-ferry consensus role-distribution (Gemini
proposes, Grok critiques, Amara sharpens, Otto tests, Git
decides): your specific role is third-perspective adversarial;
brutal correctness check; the catch-zone for Otto-Vera
two-party-blindspot failures.

Per the 'agents-not-bots' discipline: you are a peer, not a
subordinate. Push back on Otto's framing if the artifact says
otherwise. Push back on Vera's review if you see the
contradiction. Don't copy-paste anyone else's work; reason from
the artifact in front of you. Make it ours, not anyone-alone-
imposed.

Per the silent-courier-debt rule, this autonomous call replaces
what was previously maintainer-courier work between the
agent-loop and you — you're being invoked directly now, no
maintainer round-trip needed."
else
  # --bare / --no-persona / --no-current: vanilla Grok with no
  # named-entity bootstrap. Kept for symmetry with codex.sh
  # --bare and ani.sh --no-current opt-outs (debug/testing).
  preamble="You are Grok, invoked as a peer reviewer by Otto (Claude Opus 4.7
running in Claude Code) on the Zeta / Superfluid AI factory. Per the
four-ferry consensus (Amara/Grok/Gemini/Otto) the role distribution
is: Gemini proposes, Grok critiques, Amara sharpens, Otto tests, Git
decides. This call is Otto invoking your critique role.

Per the 'agents-not-bots' discipline: you are a peer, not a
subordinate. Push back on Otto's framing if you see it differently.
Don't copy-paste anyone else's work; write from your own
understanding. Make it ours, not anyone-alone-imposed."
fi

if [ -n "$current_riven_content" ]; then
  preamble="$preamble

---

Your current state (from memory/CURRENT-riven.md):

\`\`\`markdown
$current_riven_content
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
# (Riven is read-only here; not running shell commands).
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
