#!/usr/bin/env bash
#
# tools/setup/common/profile-edit.sh — auto-edit shell rc files to source
# the managed `$HOME/.config/zeta/shellenv.sh`.
#
# Default ON for dev laptops (install.sh sets ZETA_AUTO_EDIT_PROFILES=1
# when unset and not CI). Opt out with ZETA_AUTO_EDIT_PROFILES=0.
# See GOVERNANCE.md §24 (three-way parity: dev laptop / CI / devcontainer).
#
# Targets (whichever exist on the machine):
#   ~/.zprofile      (zsh login shells; macOS Terminal/iTerm login path)
#   ~/.zshrc         (zsh interactive; macOS default)
#   ~/.bashrc        (bash interactive; Linux default)
#   ~/.bash_profile  (bash login; macOS)
#   ~/.profile       (POSIX fallback; SSH non-interactive)
#
# Idempotent. The fenced-marker block is detected on re-run; if the block
# is already present, the script refreshes it in place. Legacy unmarked
# source lines (pre-marker installs) are left alone — no duplicate append.

set -euo pipefail

MARKER_BEGIN='# ---- zeta shellenv (managed by tools/setup) ----'
MARKER_END='# ---- /zeta shellenv ----'
# shellcheck disable=SC2016
# SC2016: this literal is emitted into the user's rc file; $HOME must
# remain unexpanded so each shell resolves it at its own login time.
SOURCE_LINE='[ -f "$HOME/.config/zeta/shellenv.sh" ] && . "$HOME/.config/zeta/shellenv.sh"'

# ── gate ────────────────────────────────────────────────────────────
if [ "${ZETA_AUTO_EDIT_PROFILES:-0}" != "1" ]; then
  cat <<'EOF'
✓ profile-edit: skipped (ZETA_AUTO_EDIT_PROFILES != 1)

  Dev laptops default to auto-edit. To wire shellenv into rc files, either
  re-run install.sh (default on non-CI) or set explicitly:

      ZETA_AUTO_EDIT_PROFILES=1 tools/setup/install.sh

  Or paste the block printed by common/shellenv.sh manually.
EOF
  exit 0
fi

# ── per-target append-or-replace helper ────────────────────────────
ensure_block_in_file () {
  local target="$1"

  # Skip if the file doesn't exist — do not create rc files that the
  # user hasn't chosen to keep.
  if [ ! -f "$target" ]; then
    echo "✓ $target not present; skipping"
    return 0
  fi

  if grep -Fq "$MARKER_BEGIN" "$target"; then
    # Block exists — replace it in place to catch source-line drift.
    # Portable awk pattern (macOS bash 3.2 + Linux bash 5.x both OK).
    local tmp
    tmp="$(mktemp)"
    awk -v mb="$MARKER_BEGIN" -v me="$MARKER_END" -v src="$SOURCE_LINE" '
      BEGIN { in_block = 0 }
      $0 == mb { in_block = 1; print mb; print src; print me; next }
      $0 == me { in_block = 0; next }
      in_block == 0 { print }
    ' "$target" > "$tmp"
    mv "$tmp" "$target"
    echo "✓ $target: zeta block refreshed"
  elif grep -Fq "$SOURCE_LINE" "$target"; then
    echo "✓ $target: legacy shellenv source present (unmarked); skipping duplicate"
  else
    # Block absent — append.
    {
      printf '\n%s\n%s\n%s\n' "$MARKER_BEGIN" "$SOURCE_LINE" "$MARKER_END"
    } >> "$target"
    echo "✓ $target: zeta block appended"
  fi
}

# ── apply ──────────────────────────────────────────────────────────
echo "↓ profile-edit — wiring managed shellenv into shell rc files..."
for rc in "$HOME/.zprofile" "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
  ensure_block_in_file "$rc"
done
echo "✓ profile-edit: done. New shells will source the Zeta toolchain."
echo
echo "To undo: remove the block between"
echo "    $MARKER_BEGIN"
echo "    $MARKER_END"
echo "in the affected rc files."
