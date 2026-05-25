# infra/nix-darwin/configuration.nix
#
# nix-darwin host configuration for maintainer Macs (Apple Silicon).
# Activates the Linux builder VM so `nix build .#installer-iso` works
# locally on Apple Silicon without manual cross-compile gymnastics.
#
# Apply on a Mac that already has Nix installed (Determinate macOS
# package recommended — see /etc/zeta-install.md or
# infra/README.md for the install command):
#
#   nix run nix-darwin/master#darwin-rebuild -- switch \
#     --flake /path/to/Zeta#zeta-mac
#
# After the first switch, `nix build .#installer-iso` from the Zeta
# repo root builds the x86_64-linux ISO via the Apple Virtualization
# .framework + Rosetta 2 — no Parallels, no Lima, no remote builder.

{ config, pkgs, lib, ... }:

{
  # ---------------------------------------------------------------------------
  # Nix daemon settings — flakes + nix-command, trusted caches
  # ---------------------------------------------------------------------------
  nix.settings = {
    experimental-features = [ "nix-command" "flakes" ];
    # The wheel group (admin users on macOS) can use trusted nix
    # operations without sudo. Linux-builder dispatches need this.
    trusted-users = [ "@admin" ];
    substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  # ---------------------------------------------------------------------------
  # THE linux-builder — the actual reason this config exists
  # ---------------------------------------------------------------------------
  # Spins up a tiny aarch64-linux NixOS VM via Apple Virtualization
  # .framework. Nix dispatches any *-linux build to it. With Rosetta
  # enabled (next block), it also handles x86_64-linux fast.
  nix.linux-builder = {
    enable = true;

    # Keep the VM warm so the first build of the day isn't slow.
    ephemeral = false;

    # Default 8GB RAM / 8 cores is enough for the installer ISO.
    # Bump for heavier closures (e.g. building Orleans images).
    maxJobs = 4;
    config = {
      virtualisation = {
        darwin-builder = {
          diskSize = 40 * 1024;   # 40 GB — big enough for ISO + caches
          memorySize = 8 * 1024;  # 8 GB
        };
        cores = 6;
      };
    };
  };

  # ---------------------------------------------------------------------------
  # Rosetta 2 inside the Linux builder VM
  # ---------------------------------------------------------------------------
  # Lets the aarch64-linux VM execute x86_64-linux binaries at near-
  # native speed (Apple's Linux Rosetta build, not just QEMU emulation).
  # Removes the need for a separate x86_64-linux remote builder.
  nix.settings.extra-platforms = [ "x86_64-linux" ];
  nix.linux-builder.supportedFeatures = [ "kvm" "benchmark" "big-parallel" ];

  # ---------------------------------------------------------------------------
  # Standard nix-darwin housekeeping
  # ---------------------------------------------------------------------------

  # Use the determinate-nixd daemon if Determinate was the installer
  # path. Harmless if vanilla Nix is installed instead.
  nix.useDaemon = true;

  # nixpkgs the system uses for its own modules. Stays separate from
  # whatever individual flakes pull in.
  nixpkgs.hostPlatform = "aarch64-darwin";

  # System packages every maintainer Mac wants. Mirrors a subset of
  # what's on the installer USB so the workflow is consistent across
  # workstation and cluster.
  environment.systemPackages = with pkgs; [
    git
    gh
    jq
    yq-go
    ripgrep
    fd
    htop
    kubectl
    kubernetes-helm
    k9s
    argocd
    age
    sops
    nix-output-monitor
    nvd
    nh
  ];

  # Required nix-darwin module hygiene — version of the module API.
  system.stateVersion = 5;
}
