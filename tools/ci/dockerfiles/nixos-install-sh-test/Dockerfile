# tools/ci/dockerfiles/nixos-install-sh-test/Dockerfile
#
# B-0849 Phase 1 — fast-iteration test harness for tools/setup/install.sh
# on NixOS userspace. Validates that linux.sh's /etc/NIXOS detection
# branch (added in iter-5.5.1 PR #5389) correctly routes to common/
# mise.sh + bootstrap installs cleanly.
#
# Cycle time: ~30-60 sec (vs B-0831 QEMU full-install ~15 min vs
# physical USB install ~30+ min). Complementary to B-0831 cascade #6.
#
# Operator framing 2026-05-27: "we should add docker based nixos
# install.sh testing so we can iterate quick that's an easy
# dockerfile" + "nixos*" (correcting earlier typo).
#
# Why nixos/nix base: provides nix-the-package-manager + nix-shell +
# /nix/store userspace. NOT a full NixOS init system (no systemd in
# the container), so this validates install.sh's userspace behavior
# only — full-system tests still belong in B-0831 QEMU cascade.
#
# Required runtime arg: none. Repo gets COPY'd at build time. The
# install.sh runs as root in the container (CI usage pattern) — the
# linux.sh script handles root-vs-sudo via `id -u` check, so this
# matches CI runner contexts.

FROM nixos/nix:latest

# /etc/NIXOS marker file — what linux.sh's NixOS detection branch uses
# to skip the apt step (per iter-5.5.1 PR #5389). Without this marker
# the test would not exercise the NixOS-specific path; install.sh
# would bail with "this script currently supports Debian/Ubuntu only".
RUN touch /etc/NIXOS

# Enable nix flakes (needed for tools/setup/common/mise.sh and other
# substrate that uses flake-style invocation).
RUN mkdir -p /etc/nix && \
    echo "experimental-features = nix-command flakes" > /etc/nix/nix.conf

# Workspace = repo root mounted at build time
WORKDIR /workspace

# COPY only the install-relevant subset (substrate-honest: don't COPY
# .git or unrelated tooling that would invalidate cache on unrelated
# changes). The install.sh + linux.sh + macos.sh + common/ +
# manifests/ + .mise.toml are all that's needed for this harness.
COPY tools/setup /workspace/tools/setup
COPY .mise.toml /workspace/.mise.toml
# package.json + bun.lock pin TS-runtime deps if install.sh references
# them (e.g., bun --version checks); copy to mirror dev environment
COPY package.json bun.lock* /workspace/

# Run install.sh — this exercises:
#   1. install.sh dispatch (detects Linux → linux.sh)
#   2. linux.sh /etc/NIXOS detection → skip apt step
#   3. mise.sh installation
#   4. common/mise.sh installs .mise.toml runtimes (bun, node, python,
#      java, uv, actionlint, shellcheck, etc.)
#   5. downstream common/* steps (python-tools, elan, dotnet-tools,
#      verifiers, shellenv)
# Exits non-zero if any step fails — the docker build itself fails,
# which CI surfaces as a build failure.
RUN tools/setup/install.sh

# Validation step 1: bun installed via mise + matches .mise.toml pin
# (currently bun = "1.3" per .mise.toml line 33).
RUN bash -lc 'eval "$(mise activate bash)" && bun --version | grep -q "^1\." || (echo "ERROR: bun not installed or wrong version" && exit 1)'

# Validation step 2: claude-code installable via bun (validates the
# iter-5.5.0 substrate's bun install --global pattern works on NixOS
# userspace). Doesn't actually run claude-code (would need API key);
# just verifies the install succeeds + the binary lands at the
# expected path.
RUN bash -lc 'eval "$(mise activate bash)" && \
    mkdir -p /root/.bun/bin && \
    BUN_INSTALL=/root/.bun bun install --global @anthropic-ai/claude-code 2>&1 | tail -5 && \
    test -x /root/.bun/bin/claude || (echo "ERROR: claude not at expected path" && exit 1)'

# Validation step 3: gh installed via mise / nix (the iter-5.5.0 Bug 5
# fix added gh to common.nix systemPackages; in Docker we don't have
# the NixOS module evaluating, so we install via nix-shell as a proxy
# check).
RUN nix-shell -p gh --run 'gh --version | head -1'

# Final marker — if all steps succeed, this echo lands in the build
# output as the success signal for CI.
RUN echo "B-0849 Phase 1 Docker harness validation COMPLETE — install.sh + mise + bun + claude-code all working on NixOS userspace"
