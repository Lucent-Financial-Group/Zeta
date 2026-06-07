# full-ai-cluster/nixos/tests/netbios-control-plane-resolution.nix
#
# NixOS VM test: a worker node can RESOLVE the control-plane by the stable
# single-label NetBIOS name `control-plane`, over the wire, via broadcast.
#
# This validates the resolution mechanism the cluster's CNI + worker-join
# now depend on (after dropping the dangling `control-plane.zeta.local`):
#
#   - control-plane runs nmbd with `netbios aliases = control-plane`
#     (k3s-server.nix), so it answers broadcast NetBIOS name queries for
#     `control-plane` regardless of its per-install hostname.
#   - every node has `services.samba.nsswins = true` (common.nix), which
#     wires `wins` into nsswitch so glibc getaddrinfo() — and therefore
#     k3s's serverAddr and Cilium's k8sServiceHost — can RESOLVE NetBIOS
#     names, not just publish them.
#
# Pre-fix, the prior config published NetBIOS names but had no `wins` in
# nsswitch, so glibc could not resolve them at all — and `control-plane`
# wasn't published by anyone. Either gap makes this test fail.
#
# Hermetic: NetBIOS is UDP broadcast on the shared test VLAN, so this runs
# fully offline in CI (no internet, no real router). It does NOT test
# Cilium coming up (that needs to pull images) — that is an online
# cluster-integration concern, not this resolution test.
#
# Run:
#   cd full-ai-cluster
#   nix build .#checks.x86_64-linux.netbios-control-plane-resolution -L

{ pkgs }:

let
  # The NetBIOS name-resolution bits, mirroring common.nix. Kept minimal
  # so the test isolates the resolution mechanism (not all of common.nix).
  netbiosBase = {
    services.samba = {
      enable = true;
      smbd.enable = false; # name resolution only — no SMB file sharing
      nmbd.enable = true;
      nsswins = true; # add `wins` to nsswitch so glibc resolves NetBIOS names
      settings.global = {
        "workgroup" = "ZETA";
        "disable netbios" = "no";
        "name resolve order" = "bcast host";
      };
    };
    networking.firewall.allowedUDPPorts = [ 137 138 ];
  };
in

pkgs.testers.nixosTest {
  name = "netbios-control-plane-resolution";

  nodes.server = { lib, ... }: lib.mkMerge [
    netbiosBase
    {
      # The control-plane publishes the fixed `control-plane` alias
      # (mirrors k3s-server.nix). nmbd registers it on the broadcast net.
      services.samba.settings.global."netbios aliases" = "control-plane";
    }
  ];

  nodes.client = { ... }: netbiosBase;

  testScript = ''
    start_all()

    # nmbd has to claim + register the `control-plane` NetBIOS name on the
    # broadcast network before the client can resolve it. This whole line
    # fails (times out) if nss-wins isn't wired or the alias isn't published
    # — i.e. it's the regression gate for the resolution fix.
    client.wait_until_succeeds("getent hosts control-plane", timeout=120)

    resolved = client.succeed(
        "getent ahostsv4 control-plane | head -n1 | awk '{print $1}'"
    ).strip()
    server_ip = server.succeed(
        "ip -4 -o addr show | awk '$2 != \"lo\" {print $4}' | cut -d/ -f1 | head -n1"
    ).strip()
    print(f"client resolved 'control-plane' -> {resolved}; server IP -> {server_ip}")
    assert resolved == server_ip, (
        f"NetBIOS resolved control-plane to {resolved!r}, expected server {server_ip!r}"
    )

    # And it's actually reachable by that name from the worker.
    client.succeed("ping -c1 -W5 control-plane")
  '';
}
