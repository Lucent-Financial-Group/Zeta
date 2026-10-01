# full-ai-cluster/nixos/modules/zeta-postgres-instances.nix
#
# SERVER ROLE ONLY (imported by k3s-server.nix). Keeps the shared PostgreSQL's CloudNativePG
# instance count equal to min(schedulable nodes, 3): one instance on one node, a replicated
# cluster once nodes join. The owner's goal is "clusters of pods", and a replica count in git
# cannot follow a node count -- see zeta-postgres-instances.sh for the whole argument, the
# never-scale-down rule, and why ArgoCD is told to ignore exactly three Cluster fields.
#
# A long-running loop rather than a timer: one pass is a node list and one Cluster read, a
# minute apart, and a loop prints a VERDICT line only when something changed. The unit is
# NOT required by anything and never fails k3s: every error inside a pass is a `waiting`
# verdict, and the process only exits if systemd stops it.

{ config, pkgs, ... }:

{
  systemd.services.zeta-postgres-instances = {
    description = "Scale the shared PostgreSQL's CloudNativePG instances up as schedulable nodes join";
    after = [ "k3s.service" ];
    wantedBy = [ "multi-user.target" ];
    # NOT `requires`/`bindsTo` k3s: it must keep looping while k3s restarts.
    path = [ pkgs.coreutils config.services.k3s.package ];
    serviceConfig = {
      Type = "simple";
      ExecStart = "${pkgs.bash}/bin/bash ${./zeta-postgres-instances.sh}";
      Restart = "always";
      RestartSec = "30s";
      StandardOutput = "journal+console";
      StandardError = "journal+console";
    };
  };
}
