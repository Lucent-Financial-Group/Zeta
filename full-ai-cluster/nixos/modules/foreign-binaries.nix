# foreign-binaries.nix — FHS-compat loader for foreign dynamically-linked ELFs.
#
# WHY (081KZETP6AT, 2026-08-09). NixOS provides no `/lib64/ld-linux-x86-64.so.2`,
# so any prebuilt binary that is dynamically linked against the standard FHS
# loader cannot `execve()` — the kernel reports ENOENT and bash prints the
# famously misleading "cannot execute: required file not found" (the FILE is
# there; its INTERPRETER is not).
#
# That is exactly what broke first-boot provisioning: `mise` downloads prebuilt
# toolchains at runtime, and the dynamically-linked ones (bun, node, python,
# rust, java, dotnet) all failed to exec, while every statically-linked tool
# (go, zig, uv, shellcheck, k3d, kubectl, helm) installed fine. That split —
# by LINKAGE, not by network luck — is what proved the cause deterministic.
#
# The repo already knew this failure one level too shallow: `overlays/mise-pin.nix`
# runs `autoPatchelfHook` on the mise BINARY so it can run, but nothing patches
# what mise then FETCHES. The remedy was applied to the wrapper and not to what
# the wrapper fetches. This module closes that gap for the whole class — including
# the agent CLIs in `tools/setup/manifests/from-installer`, which are vendor
# prebuilt dynamic ELFs with the same problem.
#
# WHY nix-ld rather than nix-native toolchains: `.mise.toml` must stay the SINGLE
# version source across all four consumers (dev laptop, CI runner, devcontainer,
# cluster node) per GOVERNANCE §24. Sourcing toolchains from nixpkgs instead would
# fork version truth — measurably: the ISO closure already carries bun-1.3.3 while
# `.mise.toml` resolves 1.3.14. Byte-lock claims require the fleet to run the same
# compiler bytes as CI, so pin fidelity wins over hermeticity here. (The toolchain
# install is already imperative on laptops and CI; cluster nodes join that regime.)
#
# Analysis + recommendation: Dejan (devops-engineer), 2026-08-09.
{ pkgs, ... }:

{
  # nix-ld is arch-aware: it installs the stub at /lib64/ld-linux-x86-64.so.2 on
  # x86_64 and /lib/ld-linux-aarch64.so.1 on aarch64, so the Pi / installer-aarch64
  # path is covered by this same module.
  programs.nix-ld = {
    enable = true;
    libraries = with pkgs; [
      stdenv.cc.cc.lib # libstdc++ / libgcc_s — bun, node, dotnet
      zlib # node, java, dotnet, python
      openssl
      icu # .NET globalization. Do NOT substitute
      # DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 — that is a runtime
      # string-comparison behavior change and belongs to
      # .claude/rules/culture-invariant-by-default.md, not to a CI shortcut.
      krb5 # .NET networking (libgssapi_krb5)
      curl
      libxcrypt-legacy # libcrypt.so.1 — python-build-standalone
      libffi
      ncurses
      readline
      xz
      bzip2
      sqlite
      util-linux # libuuid
    ];
  };
}
