#!/usr/bin/env bash
#
# nvidia-open-preflight.sh — decide whether ONE node may set
# `hardware.nvidia.open = true`.
#
# Run this ON the candidate GPU node, while it is still running the CLOSED
# kernel module (that is the point: the closed module binds every generation
# from Maxwell through Blackwell-minus-one, so the driver is up and can be
# asked what the cards actually are). Exit 0 = every NVIDIA GPU in this box is
# Turing or newer, so the open kernel module can bind them. Exit 1 = at least
# one card cannot, and flipping the flag would leave this node without a
# working driver.
#
# WHY COMPUTE CAPABILITY AND NOT A PCI-ID TABLE
# ---------------------------------------------
# The open kernel modules depend on the GPU System Processor (GSP), which was
# first introduced in Turing; pre-Turing silicon has no GSP, so the open
# modules cannot support Maxwell, Pascal or Volta at all. NVIDIA's own
# architecture boundary is therefore Turing, and CUDA compute capability is a
# monotone, driver-reported encoding of exactly that boundary:
#
#     Maxwell 5.x · Pascal 6.x · Volta 7.0 / 7.2   -> NO GSP, open cannot bind
#     Turing  7.5 · Ampere 8.0-8.7 · Ada 8.9
#     Hopper  9.0 · Blackwell 10.x / 12.x          -> GSP, open binds
#
# so `compute_cap >= 7.5` is the test. It is read from the driver rather than
# from a hand-maintained device-ID list, which is the whole reason to prefer
# it — NVIDIA PCI device IDs are not ordered by architecture, so any local
# table is a guess that silently rots. Volta at 7.0/7.2 is the case a
# "7 or above" shortcut would get wrong; the threshold is 7.5, not 7.
#
# THE OTHER DIRECTION, WHICH IS NOT SYMMETRIC
# -------------------------------------------
# From the R560 driver series the open modules are the default for Turing and
# newer, and for Blackwell (RTX 50-series, compute capability 10.x/12.x) the
# proprietary module is not offered at all — those cards REQUIRE open. So a
# node holding a Blackwell card cannot run `open = false`, and on such a node
# this script passing is not merely permission to flip, it is notice that the
# flag is already wrong.
#
# Anchors (checked, not merely cited):
#   NVIDIA, "Open Linux Kernel Modules", README ch. 44/45 (515.43.04, 580.105.08)
#     — GSP dependency; Turing-and-later support statement.
#   NVIDIA, "NVIDIA Transitions Fully Towards Open-Source GPU Kernel Modules"
#     (developer blog, R560) — open becomes the default for Turing and newer.
#   NVIDIA Driver Installation Guide, "Kernel Modules" — proprietary flavour
#     spans Maxwell..Turing and later "until Blackwell"; Blackwell/Grace Hopper
#     require the open flavour.
#   NVIDIA CUDA C Programming Guide, compute-capability table — the
#     architecture-to-capability mapping used for the 7.5 threshold.
#
# Usage:
#   ./tools/nvidia-open-preflight.sh            # human-readable
#   ./tools/nvidia-open-preflight.sh --quiet    # exit code only
#
# On pass, record the result in the host's NixOS config:
#   zeta.gpu.openModulePreflight.passed = true;   # + the date and this output
#   hardware.nvidia.open = lib.mkForce true;
#
# This script establishes what the SILICON can do. It does not benchmark, and
# it does not verify that CUDA, the container toolkit, or a GPU pod still work
# after the flip — those are separate, and they are still unexercised.

set -euo pipefail

QUIET=0
if [ "${1:-}" = "--quiet" ]; then
  QUIET=1
fi

say() {
  if [ "$QUIET" -eq 0 ]; then
    printf '%s\n' "$*"
  fi
}

# Minimum compute capability whose silicon carries a GSP. Turing == 7.5.
MIN_MAJOR=7
MIN_MINOR=5

if ! command -v nvidia-smi >/dev/null 2>&1; then
  say "FAIL: nvidia-smi not found."
  say "      Run this on the GPU node itself, with the CURRENT driver loaded."
  say "      A node whose driver is already broken cannot be preflighted; fix"
  say "      that first — an unanswerable question is not a pass."
  exit 1
fi

# index, name, compute_cap — one line per physical GPU.
if ! GPUS=$(nvidia-smi --query-gpu=index,name,compute_cap --format=csv,noheader 2>/dev/null); then
  say "FAIL: nvidia-smi ran but could not enumerate GPUs."
  say "      Same conclusion as above: unknown is not a pass."
  exit 1
fi

if [ -z "$GPUS" ]; then
  say "FAIL: no NVIDIA GPUs reported on this node."
  say "      Nothing to attest. Do not set hardware.nvidia.open on a node whose"
  say "      GPUs this script never saw."
  exit 1
fi

TOTAL=0
BLOCKERS=0
BLACKWELL=0

say "NVIDIA open-kernel-module preflight — threshold: compute capability >= ${MIN_MAJOR}.${MIN_MINOR} (Turing)"
say ""

while IFS= read -r line; do
  [ -n "$line" ] || continue
  TOTAL=$((TOTAL + 1))

  idx=$(printf '%s' "$line" | cut -d, -f1 | tr -d ' ')
  name=$(printf '%s' "$line" | cut -d, -f2 | sed 's/^ *//; s/ *$//')
  cap=$(printf '%s' "$line" | cut -d, -f3 | tr -d ' ')

  major=${cap%%.*}
  minor=${cap##*.}

  # Non-numeric capability means the driver did not answer the question.
  case "$major$minor" in
    *[!0-9]* | "")
      say "  [${idx}] ${name}: UNREADABLE compute capability (${cap}) — treated as BLOCKING"
      BLOCKERS=$((BLOCKERS + 1))
      continue
      ;;
  esac

  if [ "$major" -gt "$MIN_MAJOR" ] || { [ "$major" -eq "$MIN_MAJOR" ] && [ "$minor" -ge "$MIN_MINOR" ]; }; then
    if [ "$major" -ge 10 ]; then
      BLACKWELL=$((BLACKWELL + 1))
      say "  [${idx}] ${name}: cc ${cap} — OK, and REQUIRES the open module (Blackwell or newer)"
    else
      say "  [${idx}] ${name}: cc ${cap} — OK (GSP present)"
    fi
  else
    BLOCKERS=$((BLOCKERS + 1))
    say "  [${idx}] ${name}: cc ${cap} — BLOCKING (pre-Turing, no GSP; open module cannot bind)"
  fi
done <<EOF
$GPUS
EOF

say ""
say "GPUs seen: ${TOTAL}   blocking: ${BLOCKERS}"

if [ "$BLOCKERS" -gt 0 ]; then
  say ""
  say "RESULT: DO NOT set hardware.nvidia.open = true on this node."
  say "        ${BLOCKERS} of ${TOTAL} card(s) would lose their driver."
  exit 1
fi

say ""
say "RESULT: this node's silicon can run the open kernel modules."
if [ "$BLACKWELL" -gt 0 ]; then
  say "        NOTE: ${BLACKWELL} card(s) are Blackwell or newer and have NO"
  say "        proprietary kernel module available. For those, open = false is"
  say "        not the conservative option — it is the broken one."
fi
say ""
say "        Still unexercised by this script: CUDA, the container toolkit, GPU"
say "        pod scheduling, and any performance comparison. Bench before you"
say "        call the flip verified."
exit 0
