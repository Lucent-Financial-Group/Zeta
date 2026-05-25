# full-ai-cluster/nixos/modules/k3s-agent.nix
#
# K3S worker. Matches the server's CNI takeover (no flannel,
# no kube-proxy, Cilium owns the network).

{ config, pkgs, lib, ... }:

{
  services.k3s = {
    enable = true;
    role = "agent";
    serverAddr = lib.mkDefault "https://control-plane.zeta.local:6443";
    tokenFile = lib.mkDefault "/var/lib/rancher/k3s/agent/token";

    extraFlags = [
      "--node-label=zeta.io/role=worker"

      # Same CNI takeover settings as the server. The agent must
      # NOT bring up flannel or kube-proxy — Cilium handles both.
      "--flannel-backend=none"
      "--disable-network-policy"
      "--disable-kube-proxy"
    ];
  };

  networking.firewall = {
    allowedTCPPorts = [
      10250   # kubelet
      4244    # Hubble server
      8472    # legacy VXLAN
    ];
    allowedUDPPorts = [
      8472
    ];
    trustedInterfaces = [ "cilium_host" "cilium_net" "cni0" "lxc+" ];
  };

  systemd.tmpfiles.rules = [
    "d /var/lib/rancher/k3s 0755 root root - -"
  ];
}
