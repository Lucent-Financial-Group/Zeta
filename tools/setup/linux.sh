#!/usr/bin/env bash
#
# tools/setup/linux.sh — Linux bootstrap path (Debian/Ubuntu for now).
#
# Order matters:
#   1. apt packages from manifests/apt.txt (openjdk, build-essential, curl)
#   2. mise (via official installer; no apt package yet)
#   3. common/mise.sh     — pins python (dotnet moved out in round 32)
#   4. common/dotnet.sh   — installs .NET SDK per global.json
#   5. common/elan.sh     — Lean toolchain
#   6. common/dotnet-tools.sh — dotnet global tools
#   7. common/verifiers.sh    — TLA+ + Alloy jars
#   8. common/shellenv.sh     — managed PATH file
#
# Non-Debian Linuxes (RHEL/Fedora/Arch/Alpine) are deferred — the
# install-script layering supports adding them alongside apt.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETUP_DIR="$REPO_ROOT/tools/setup"

# ── Detect apt availability (Debian/Ubuntu) ─────────────────────────
if ! command -v apt-get >/dev/null 2>&1; then
  echo "error: this script currently supports Debian/Ubuntu only"
  echo "  RHEL/Fedora/Arch/Alpine support is backlogged — see"
  echo "  docs/research/build-machine-setup.md"
  exit 1
fi

# ── 1. apt packages (from manifest) ─────────────────────────────────
APT_MANIFEST="$SETUP_DIR/manifests/apt.txt"
if [ -f "$APT_MANIFEST" ]; then
  # Extract non-comment non-empty lines via awk (doesn't fail
  # under pipefail when manifest is all comments — unlike
  # `grep -vE` which exits 1 on no-match).
  PKGS="$(awk '!/^[[:space:]]*#/ && NF > 0 { print }' "$APT_MANIFEST" | tr '\n' ' ')"
  if [ -n "$PKGS" ]; then
    echo "↓ installing apt packages from $(basename "$APT_MANIFEST")..."
    # Use sudo only when not already root (CI containers often run as root).
    SUDO=""
    if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi
    $SUDO apt-get update -y
    # shellcheck disable=SC2086
    $SUDO apt-get install -y --no-install-recommends $PKGS
  else
    echo "✓ apt manifest empty; skipping"
  fi
fi
echo "✓ apt packages up to date"

# ── 2. mise ─────────────────────────────────────────────────────────
if ! command -v mise >/dev/null 2>&1; then
  echo "↓ installing mise via the official installer..."
  curl -fsSL https://mise.run | sh
  # The installer puts mise at $HOME/.local/bin/mise; ensure we can
  # invoke it for the remainder of this script run.
  export PATH="$HOME/.local/bin:$PATH"
fi
echo "✓ mise: $(mise --version)"

# ── 3-8. Common steps ───────────────────────────────────────────────
# mise.sh runs `mise install` from .mise.toml, which now includes
# dotnet (round-34 flip). No separate dotnet install step needed;
# mise shims handle PATH. `~/.dotnet/tools` still needs PATH for
# `dotnet tool install -g` globals — that's dotnet's own convention
# independent of where the SDK lives. shellenv.sh wires it.
"$SETUP_DIR/common/mise.sh"
"$SETUP_DIR/common/python-tools.sh"

# Make ~/.dotnet/tools available for the remainder of this install.sh
# process so dotnet-tools.sh can install globals (semgrep / stryker)
# into $HOME/.dotnet/tools and find them on PATH in the same run.
export PATH="$HOME/.dotnet/tools:$PATH"

"$SETUP_DIR/common/elan.sh"
"$SETUP_DIR/common/dotnet-tools.sh"
"$SETUP_DIR/common/verifiers.sh"
"$SETUP_DIR/common/shellenv.sh"
