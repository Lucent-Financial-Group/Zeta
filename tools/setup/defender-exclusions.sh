#!/usr/bin/env bash
# defender-exclusions.sh — propose antivirus scan exclusions for the build trees.
#
# WHY THIS IS A COMMITTED SCRIPT AND NOT A COMMAND I HANDED OVER IN CHAT.
# Adding an AV exclusion is a privileged, security-REDUCING change to the host.
# Per the standing discipline — privileged operations are committed, tested,
# reviewable code, never ad-hoc `sudo` pasted into a terminal — the proposal has
# to be readable before it is run, diffable when it changes, and auditable after.
# A one-liner in a transcript satisfies none of those.
#
# WHAT IT DOES NOT DO. It does not run anything privileged by default. Invoked
# bare it PRINTS what it would exclude and exits; `--apply` is required to act,
# and `--apply` is the operator's call, not an agent's.
#
# THE HONEST COST, stated up front because an exclusion list that only advertises
# its speed benefit is a security change wearing a performance costume:
#
#   An excluded path is NOT SCANNED. Anything malicious that lands inside one of
#   these directories — via a compromised dependency, a poisoned cache entry, a
#   hostile PR checked out locally — will not be caught by real-time protection.
#   These trees are exactly where untrusted third-party code arrives, which is
#   what makes the exclusion both effective and genuinely risky.
#
# The tradeoff is defensible for build/cache trees on a developer workstation
# whose supply chain is checked elsewhere (lockfiles, pinned toolchains, CI
# attestation). It would NOT be defensible on a server or a shared host. If you
# are unsure which you are on, do not run this.
#
# PLATFORM DETECTION IS EXPLICIT AND FAILS CLOSED. There are two unrelated
# products called "Defender": Microsoft Defender for Endpoint on macOS/Linux
# (`mdatp`) and Microsoft Defender Antivirus on Windows (`Get-MpPreference`).
# This script handles the FORMER only. On a host with no `mdatp` it says so and
# exits 0 without touching anything — a no-op is the correct outcome when the
# thing being configured is absent, and announcing it is what stops a silent
# success from reading as a completed change.
#
# The Windows variant is deliberately NOT stubbed here. An empty PowerShell
# branch that prints "TODO" would be a step that cannot fail, which is worse than
# an absent one: it looks like coverage and provides none. See tools/setup/install.ps1
# for where a Windows implementation would live when someone needs it.

set -euo pipefail

APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --dry-run) APPLY=0 ;;
    -h|--help)
      sed -n '2,50p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown argument: $arg (accepted: --apply, --dry-run, --help)" >&2
      exit 2
      ;;
  esac
done

# The trees. Each carries WHY it is here, because a bare path list rots into a
# set nobody can audit — the reader cannot tell an exclusion that is still
# earning its keep from one added years ago for a toolchain since removed.
#
# `$HOME` is expanded at runtime rather than baked, so this file stays
# machine-independent and reviewable as text.
declare -a PATHS=()
declare -a REASONS=()

add() { PATHS+=("$1"); REASONS+=("$2"); }

add "$HOME/Documents/src/repos" \
    "the working trees. Thousands of small files rewritten per build; real-time scanning of every write dominates build time."
add "$HOME/.nuget/packages" \
    "NuGet package cache — extracted archives, read constantly during restore, immutable once written."
add "$HOME/.dotnet" \
    "dotnet SDK + tool cache. Rescanned on every invocation; contents are pinned by global.json / dotnet-tools."
add "$HOME/.bun/install/cache" \
    "bun module cache. Content-addressed and immutable; rescanning it re-reads bytes that cannot have changed."
add "$HOME/.local/share/mise" \
    "mise toolchain installs. Large, pinned, and rewritten only on an explicit toolchain change."
add "$HOME/.cargo/registry" \
    "cargo registry cache — same immutability argument as bun's."

# The `zeta-wt-*` worktrees live beside the main checkout and are the hot path
# for agent work. There are ~99 of them on this host, so enumerating them was the
# first version of this and was wrong twice over: 99 literal entries are not
# reviewable, and the set churns every time a worktree is created or removed, so
# the list would be stale within a day.
#
# One wildcard entry instead. Microsoft documents glob support for `mdatp` folder
# exclusions — but this script does not TRUST that, because a wildcard the product
# silently declines to expand would leave every worktree unscanned-in-intent and
# scanned-in-fact, which is the worst of both. The read-back at the end is what
# settles it: if the pattern does not land, verification reports NOT PRESENT
# rather than the script claiming success.
WORKTREE_GLOB="$HOME/zeta-wt-*"
wt_count=0
shopt -s nullglob
for wt in $WORKTREE_GLOB; do [ -d "$wt" ] && wt_count=$((wt_count + 1)); done
shopt -u nullglob
if [ "$wt_count" -gt 0 ]; then
  add "$WORKTREE_GLOB" \
      "agent worktrees ($wt_count present) — same write profile as the main checkout. One wildcard, not $wt_count literal entries: the set churns constantly."
fi

echo "Zeta — proposed antivirus scan exclusions"
echo
echo "COST: an excluded path is NOT scanned. These trees are where third-party"
echo "code arrives, which is what makes the exclusion both effective and risky."
echo "Defensible on a developer workstation; NOT on a server or shared host."
echo

missing=0
for i in "${!PATHS[@]}"; do
  p="${PATHS[$i]}"
  if [ -d "$p" ] || case "$p" in *"*"*) true ;; *) false ;; esac; then
    printf '  %s\n      %s\n' "$p" "${REASONS[$i]}"
  else
    printf '  %s  [ABSENT — will be skipped]\n' "$p"
    missing=$((missing + 1))
  fi
done
echo
echo "  ${#PATHS[@]} candidate path(s), $missing absent."

# Detection AFTER printing, so `--dry-run` is useful on a host with no Defender
# at all — reviewing the proposal must not require the product to be installed.
if ! command -v mdatp >/dev/null 2>&1; then
  echo
  echo "mdatp NOT FOUND on PATH — Microsoft Defender for Endpoint is not installed here."
  echo "Nothing to do. (Windows hosts use Defender Antivirus, a different product;"
  echo "this script does not handle it — see the header.)"
  exit 0
fi

if [ "$APPLY" -eq 0 ]; then
  echo
  echo "DRY RUN — nothing changed. Re-run with --apply to add these exclusions."
  echo "  bash tools/setup/defender-exclusions.sh --apply"
  exit 0
fi

echo
echo "Applying via mdatp ..."
applied=0
failed=0
for i in "${!PATHS[@]}"; do
  p="${PATHS[$i]}"
  [ -d "$p" ] || case "$p" in *"*"*) ;; *) continue ;; esac
  # Adding an exclusion that already exists is a no-op in mdatp, so re-running is
  # safe (idempotency, discipline #6). The failure is captured rather than
  # aborting the loop: one rejected path must not leave the rest unconfigured.
  if mdatp exclusion folder add --path "$p" >/dev/null 2>&1; then
    applied=$((applied + 1))
  else
    echo "  FAILED: $p" >&2
    failed=$((failed + 1))
  fi
done

# READ BACK. The exit status above reports what the command CLAIMED; this reports
# what the product actually holds. A configuration step that trusts its own return
# value is an assertion, and an assertion is not a measurement.
echo
echo "Verifying against mdatp's own exclusion list ..."
listing="$(mdatp exclusion list 2>/dev/null || true)"
verified=0
for i in "${!PATHS[@]}"; do
  p="${PATHS[$i]}"
  [ -d "$p" ] || case "$p" in *"*"*) ;; *) continue ;; esac
  case "$listing" in
    *"$p"*) verified=$((verified + 1)) ;;
    *) echo "  NOT PRESENT after apply: $p" >&2 ;;
  esac
done

echo
echo "  applied=$applied failed=$failed verified-present=$verified"
if [ "$failed" -ne 0 ] || [ "$verified" -eq 0 ]; then
  echo "  Exclusions are typically managed by policy on a managed host; a local"
  echo "  add can be silently overridden. Check with your endpoint administrator." >&2
  exit 1
fi
echo "  Done. Re-running this script is safe and idempotent."
