#!/usr/bin/env bash
# install-git-hooks.sh — point this clone at the TRACKED hooks directory
# (081KWN0JKJV). Safe to re-run; no-op when not inside a git checkout.
#
# MECHANISM: `core.hooksPath = scripts/hooks` (RELATIVE, no symlinks).
#
# This used to symlink scripts/hooks/* into `git rev-parse --git-path hooks`.
# That mixed two different scopes and silently disarmed the fleet:
#
#   source      = $(dirname $0)/..     -> the CURRENT WORKTREE   (local)
#   destination = --git-path hooks     -> the OWNING CLONE       (global)
#
# Run from a throwaway worktree, it wrote a symlink into the owning clone's
# shared hooks dir pointing INTO the worktree. When the worktree was deleted
# the symlink dangled, and git SKIPS a hook it cannot execute WITHOUT ANY
# ERROR — so commit-msg and pre-push stopped running for every worktree of
# that clone, with no signal. Measured: the installer printed success (rc=0)
# naming a path inside the doomed worktree, and the next manus-leak commit
# subject sailed through.
#
# `core.hooksPath` fixes it by construction rather than by care:
#   * There is no symlink, so nothing can dangle.
#   * A RELATIVE value resolves against the top level of whichever worktree
#     git is running in (githooks(5): hooks run from the worktree root), so
#     every worktree runs ITS OWN tracked hooks — including its own branch's
#     version of them. Verified from subdirectories too.
#   * The setting is written to the SHARED .git/config even when set from a
#     linked worktree, so one install arms every present and future worktree.
#   * The hooks are the tracked files themselves — `git checkout` updates
#     them, and there is no second copy to drift.
set -euo pipefail

HOOKS_REL="scripts/hooks"
HOOK_NAMES="commit-msg pre-push"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "install-git-hooks: git not on PATH — skip"
  exit 0
fi

if ! git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "install-git-hooks: not a git work tree — skip"
  exit 0
fi

# Resolve the worktree top level from git rather than trusting $0's parent:
# the value we are about to store is interpreted relative to THIS directory.
top_level="$(git -C "$REPO_ROOT" rev-parse --show-toplevel)"

missing=""
for hook in $HOOK_NAMES; do
  if [ ! -f "$top_level/$HOOKS_REL/$hook" ]; then
    missing="$missing $hook"
  fi
done
if [ -n "$missing" ]; then
  echo "install-git-hooks: missing tracked hook(s) under $top_level/$HOOKS_REL:$missing" >&2
  echo "  Remedy: run from a complete checkout, or 'git checkout -- $HOOKS_REL'." >&2
  exit 1
fi

# --- Refuse to clobber a foreign core.hooksPath -----------------------------
# A refusal that names its remedy is a guard; one that does not is a dead end.

# Worktree-scoped config SHADOWS the shared value (measured), so a stale
# per-worktree entry would silently win over everything we set below.
if [ "$(git -C "$REPO_ROOT" config --get extensions.worktreeConfig || true)" = "true" ]; then
  wt_val="$(git -C "$REPO_ROOT" config --worktree --get core.hooksPath 2>/dev/null || true)"
  if [ -n "$wt_val" ] && [ "$wt_val" != "$HOOKS_REL" ]; then
    echo "install-git-hooks: refused — a worktree-local core.hooksPath ('$wt_val') would" >&2
    echo "  shadow the shared setting, leaving this worktree's hooks disarmed." >&2
    echo "  Remedy: git -C '$REPO_ROOT' config --worktree --unset core.hooksPath" >&2
    echo "  then re-run: bash $HOOKS_REL/install-git-hooks.sh" >&2
    exit 1
  fi
fi

local_val="$(git -C "$REPO_ROOT" config --local --get core.hooksPath 2>/dev/null || true)"
if [ -n "$local_val" ] && [ "$local_val" != "$HOOKS_REL" ]; then
  echo "install-git-hooks: refused — core.hooksPath is already set to '$local_val'." >&2
  echo "  Overwriting it would silently disable hooks this clone deliberately uses." >&2
  echo "  Remedy: keep it and add Zeta's hooks to '$local_val', or adopt ours with" >&2
  echo "    git -C '$REPO_ROOT' config --local core.hooksPath $HOOKS_REL" >&2
  exit 1
fi

# --- Arm ---------------------------------------------------------------------
for hook in $HOOK_NAMES; do
  chmod +x "$top_level/$HOOKS_REL/$hook"
done

# --local writes to the SHARED .git/config even from a linked worktree, so this
# arms every worktree of this clone at once (measured).
git -C "$REPO_ROOT" config --local core.hooksPath "$HOOKS_REL"
echo "install-git-hooks: core.hooksPath = $HOOKS_REL (tracked; resolves per-worktree)"

inherited="$(git -C "$REPO_ROOT" config --global --get core.hooksPath 2>/dev/null || true)"
if [ -n "$inherited" ] && [ "$inherited" != "$HOOKS_REL" ]; then
  echo "install-git-hooks: note — your global core.hooksPath ('$inherited') is overridden"
  echo "  for this repository only; other repositories are unaffected."
fi

# --- Retire the old symlinks -------------------------------------------------
# core.hooksPath makes $GIT_COMMON_DIR/hooks inert, so stale links there are
# now merely confusing. Remove only links this installer provably created: a
# symlink whose target ends in <something>/scripts/hooks/<same name>. Anything
# else is someone else's and is left alone (and warned about below).
common_dir="$(git -C "$REPO_ROOT" rev-parse --git-common-dir)"
case "$common_dir" in
  /*) ;;
  *) common_dir="$top_level/$common_dir" ;;
esac
legacy_dir="$common_dir/hooks"

if [ -d "$legacy_dir" ]; then
  for hook in $HOOK_NAMES; do
    link="$legacy_dir/$hook"
    [ -L "$link" ] || continue
    target="$(readlink "$link")"
    case "$target" in
      */$HOOKS_REL/"$hook")
        rm -f "$link"
        echo "install-git-hooks: removed superseded symlink $link"
        ;;
    esac
  done

  # Warn about foreign hooks core.hooksPath now bypasses — silence here would
  # be the same class of defect this script exists to fix.
  for entry in "$legacy_dir"/*; do
    [ -e "$entry" ] || continue
    name="$(basename "$entry")"
    case "$name" in *.sample) continue ;; esac
    [ -x "$entry" ] || continue
    echo "install-git-hooks: warning — $entry is no longer run (core.hooksPath bypasses" >&2
    echo "  $legacy_dir entirely)." >&2
    echo "  Remedy: move it into $HOOKS_REL/ so it is tracked and runs again, or drop it." >&2
  done
fi
