#!/usr/bin/env bash
#
# tools/setup/install.sh — the one install script consumed three ways
# (dev laptops, CI runners, devcontainer images) per GOVERNANCE.md §24,
# plus iter-B-0857.2: NixOS-aware routing for cluster nodes.
#
# Safe to run repeatedly — detect-first-install-else-update. Safe to
# run daily to keep tools fresh.
#
# Usage:
#   tools/setup/install.sh
#
# Exit 0 on success. Any failure is a dev-experience bug; the CI
# `gate.yml` workflow asserts this script completes twice in sequence.
#
# B-0857.2 routing (added 2026-05-27):
#   - macOS (uname -s = Darwin)              -> setup/macos.sh
#   - Linux non-NixOS (no /etc/NIXOS)        -> setup/linux.sh
#   - NixOS installed (/etc/NIXOS, real /)   -> setup/linux.sh
#     (NixOS-installed nodes get the same mise + bun + claude runtime
#     setup as any Linux build machine; nixos-rebuild handles the
#     NixOS-side declarative config)
#   - NixOS live-USB (/etc/NIXOS, overlayfs) -> message pointing to
#     zeta-install.sh (B-0857.3 will factor that body into a callable
#     nixos-install-from-usb.sh; this routing stub lands first)
#
# Per B-0857 operator framing (Aaron 2026-05-27): install.sh is the
# universal Unix-like-OS install + self-update entry — "there is no
# distinction between build machines and prod when prod can update
# itself." This row's substrate scope is environment-routing dispatch.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SETUP_DIR="$REPO_ROOT/tools/setup"

echo "=== Zeta install — universal Unix-like-OS entry (GOVERNANCE.md §24 + B-0857.2) ==="
echo "Repo root: $REPO_ROOT"

# Detect-NixOS-and-mode helper (B-0857.2).
#
# Outputs one of: "nixos-live", "nixos-installed", "linux-non-nixos".
# Caller decides routing.
detect_linux_flavor() {
  if [ ! -f /etc/NIXOS ]; then
    echo "linux-non-nixos"
    return 0
  fi
  # /etc/NIXOS is present -> NixOS. Distinguish live-USB-mode from
  # installed-mode by checking whether root is an overlay filesystem.
  # Live NixOS installer ISO mounts root as overlayfs (read-only
  # squashfs base + writable tmpfs upper); installed NixOS mounts
  # root from a real filesystem (ext4 / btrfs / zfs / xfs / etc.).
  local root_fstype=""
  if command -v findmnt >/dev/null 2>&1; then
    root_fstype="$(findmnt -no FSTYPE / 2>/dev/null || true)"
  fi
  # Fallback: /proc/mounts parse if findmnt not available.
  if [ -z "$root_fstype" ] && [ -r /proc/mounts ]; then
    root_fstype="$(awk '$2 == "/" { print $3; exit }' /proc/mounts 2>/dev/null || true)"
  fi
  case "$root_fstype" in
    overlay|overlayfs|tmpfs|aufs)
      echo "nixos-live"
      ;;
    "")
      # Detection itself failed; assume installed (safer default — live
      # USB hands a clear overlay signal; missing signal more likely
      # means an unusual installed config than a live boot)
      echo "nixos-installed"
      ;;
    *)
      echo "nixos-installed"
      ;;
  esac
}

os="$(uname -s)"
case "$os" in
  Darwin)
    echo "OS: macOS"
    "$SETUP_DIR/macos.sh"
    ;;
  Linux)
    flavor="$(detect_linux_flavor)"
    case "$flavor" in
      linux-non-nixos)
        echo "OS: Linux (non-NixOS)"
        "$SETUP_DIR/linux.sh"
        ;;
      nixos-installed)
        echo "OS: NixOS (installed; runtime setup via mise + bun + claude)"
        echo "Note: NixOS-side declarative config managed via nixos-rebuild;"
        echo "      this step only sets up the operator runtime tooling."
        "$SETUP_DIR/linux.sh"
        ;;
      nixos-live)
        cat >&2 <<'EOF'
OS: NixOS live-USB

This is a NixOS live-USB environment. To install Zeta onto a target
disk, run the NixOS USB-disk installer:

  sudo bash full-ai-cluster/usb-nixos-installer/zeta-install.sh

That script handles disk partitioning, nixos-install, and the
operator-injection points (SSH pubkey, hostname, password) per
full-ai-cluster/INJECTION-POINTS.md.

After the target machine reboots into installed-NixOS, run this
install.sh script again on the installed system to set up the
runtime tooling (mise + bun + claude). The same script entry —
different routing.

B-0857.3 (follow-up sub-row) will factor zeta-install.sh into a
callable nixos-install-from-usb.sh that this script can dispatch
to directly. Until then, this stub points operators to the
existing entry.
EOF
        exit 2
        ;;
      *)
        echo "error: unrecognized Linux flavor '$flavor'" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "error: unsupported OS '$os' (macOS + Linux only this round; Windows backlogged)"
    exit 1
    ;;
esac

echo
echo "=== Install complete ==="
echo "If this is your first run, open a new shell or source"
echo "\$HOME/.config/zeta/shellenv.sh to pick up PATH changes."
