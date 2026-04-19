#!/usr/bin/env bash
#
# tools/setup/macos.sh — macOS bootstrap path. Called by install.sh.
#
# Order matters:
#   1. Xcode Command Line Tools (prerequisite for everything else)
#   2. Homebrew (system-package source on macOS)
#   3. Brew packages from manifests/brew.txt (openjdk, curl, etc.)
#   4. mise (runtime manager)
#   5. common/mise.sh     — pins python (dotnet moved out in round 32)
#   6. common/dotnet.sh   — installs .NET SDK per global.json
#   7. common/elan.sh     — Lean toolchain (no mise plugin yet)
#   8. common/dotnet-tools.sh — dotnet global tools
#   9. common/verifiers.sh    — TLA+ + Alloy jars
#  10. common/shellenv.sh     — managed PATH file

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETUP_DIR="$REPO_ROOT/tools/setup"

# ── 1. Xcode Command Line Tools ─────────────────────────────────────
if ! xcode-select -p >/dev/null 2>&1; then
  echo "↓ installing Xcode Command Line Tools (non-interactive)..."
  # Apple still shows one confirmation prompt on this path; we accept
  # that rather than fail fast per Aaron's "just install everything"
  # round-29 call.
  xcode-select --install || true
  echo "  If a GUI prompt appeared, complete the install and re-run this script."
fi
echo "✓ Xcode CLT at $(xcode-select -p 2>/dev/null || echo 'pending user confirmation')"

# ── 2. Homebrew ─────────────────────────────────────────────────────
if ! command -v brew >/dev/null 2>&1; then
  echo "↓ installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Ensure brew is on PATH for the remainder of this script run.
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi
echo "✓ brew: $(brew --version | head -n1)"

# ── 3. Brew packages (from manifest) ────────────────────────────────
BREW_MANIFEST="$SETUP_DIR/manifests/brew.txt"
if [ -f "$BREW_MANIFEST" ]; then
  # Extract non-comment non-empty lines via awk (doesn't fail under
  # pipefail when the manifest is all comments — unlike `grep -vE`
  # which exits 1 on no-match). Round-34 brew.txt has no packages
  # after the JDK migration to mise.
  PKGS="$(awk '!/^[[:space:]]*#/ && NF > 0 { print }' "$BREW_MANIFEST")"
  if [ -n "$PKGS" ]; then
    echo "↓ installing brew packages from $(basename "$BREW_MANIFEST")..."
    # `brew install` is idempotent on already-installed formulae.
    printf '%s\n' "$PKGS" | while IFS= read -r pkg; do
      if brew list --formula "$pkg" >/dev/null 2>&1; then
        brew upgrade "$pkg" >/dev/null 2>&1 || true
      else
        brew install "$pkg"
      fi
    done
  else
    echo "✓ brew manifest empty; skipping"
  fi
fi
echo "✓ brew packages up to date"

# ── 4. mise ─────────────────────────────────────────────────────────
if ! command -v mise >/dev/null 2>&1; then
  echo "↓ installing mise via Homebrew..."
  brew install mise
fi
echo "✓ mise: $(mise --version)"

# ── 5-10. Common steps ──────────────────────────────────────────────
"$SETUP_DIR/common/mise.sh"
"$SETUP_DIR/common/python-tools.sh"
"$SETUP_DIR/common/dotnet.sh"

# Make ~/.dotnet available for the remainder of this install.sh
# process so dotnet-tools.sh can find the SDK we just installed.
# shellenv.sh handles propagation to subsequent shells + CI env.
export DOTNET_ROOT="$HOME/.dotnet"
export PATH="$DOTNET_ROOT:$HOME/.dotnet/tools:$PATH"

"$SETUP_DIR/common/elan.sh"
"$SETUP_DIR/common/dotnet-tools.sh"
"$SETUP_DIR/common/verifiers.sh"
"$SETUP_DIR/common/shellenv.sh"
