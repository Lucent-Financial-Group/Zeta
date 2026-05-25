# full-ai-cluster/nixos/modules/docker.nix
#
# Docker daemon for non-K8s container workloads (local builds,
# devcontainers, the Hermes image build with SOPS-baked secrets,
# any tooling that needs a real Docker socket).
#
# K3S uses containerd under the hood — this is separate.

{ config, pkgs, lib, ... }:

{
  virtualisation.docker = {
    enable = true;

    # rootless-by-default avoids accidental privileged-container
    # surprises. Maintainers can still use `sudo docker` for cases
    # that need the system daemon.
    rootless = {
      enable = true;
      setSocketVariable = true;
    };

    # Enable on-host BuildKit so the SOPS-baking Hermes image build
    # uses build-secrets and cache-mounts.
    daemon.settings = {
      features = { buildkit = true; };
      "experimental" = false;
    };
  };

  # Tooling: docker CLI, compose, buildx.
  environment.systemPackages = with pkgs; [
    docker
    docker-compose
    docker-buildx
  ];

  users.users.zeta.extraGroups = [ "docker" ];
}
