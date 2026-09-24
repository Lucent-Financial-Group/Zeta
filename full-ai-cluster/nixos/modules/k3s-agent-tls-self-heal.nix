# full-ai-cluster/nixos/modules/k3s-agent-tls-self-heal.nix
#
# WP25 (081M38G8NGC087G0R001GEGEDK). Root-cause work for run 35927439681
# (workflow build-ai-cluster-iso.yml, step "WP11 — installed-disk first-boot
# k3s verify"): on the real USB-installed disk, k3s.service never finishes
# starting, so Kubernetes never comes up and no app ever starts.
#
# MEASURED. `systemctl status k3s` sat `activating` forever (NRestarts=0,
# network-online.target ACTIVE, no ordering cycle). k3s's own log, every ~8s
# for 70+ minutes: "Waiting to retrieve agent configuration; server is not
# ready: /var/lib/rancher/k3s/agent/serving-kubelet.crt: failed to create
# certificate request ... error loading key from
# /var/lib/rancher/k3s/agent/serving-kubelet.key: <nil>". `ls -l` on that box
# showed EVERY file under /var/lib/rancher/k3s/agent at 0 bytes, timestamped
# from the PREVIOUS boot -- client-kubelet.{crt,key},
# client-k3s-controller.{crt,key}, client-kube-proxy.{crt,key},
# serving-kubelet.{crt,key}, k3scontroller.kubeconfig, kubelet.kubeconfig,
# kubeproxy.kubeconfig. Meanwhile /var/lib/rancher/k3s/server/tls/* held real
# content. The files were created but their contents never reached disk
# before the machine stopped -- the QEMU harness kills the VM at the end of
# its install phase; on real hardware this is a power cut during first boot.
# A zero-length key or certificate is never valid, so this state is
# unambiguous.
#
# ROOT CAUSE, CITED (checked against the upstream source, not guessed).
# k3s's agent certs are loaded and regenerated through
# rancher/dynamiclistener's `cert.LoadOrGenerateKeyFile`
# (github.com/rancher/dynamiclistener, cert/io.go):
#
#   loadedData, err := os.ReadFile(keyPath)
#   if err == nil && verifyKeyData(loadedData) {
#       return loadedData, false, err
#   }
#   if !os.IsNotExist(err) {
#       return nil, false, fmt.Errorf("error loading key from %s: %v", keyPath, err)
#   }
#   // ... only past this point does it generate + write a fresh key
#
# `verifyKeyData` correctly rejects a 0-byte file (`len(data) == 0` ->
# false). But a file that EXISTS with no content makes `os.ReadFile` return
# `err == nil` -- so `os.IsNotExist(err)` is false, `!false` is true, and the
# function takes the "real read error" branch instead of falling through to
# regeneration, formatting the nil `err` with `%v` as the literal string
# `<nil>`. That is the exact text in the measured log line above, character
# for character. k3s's agent bootstrap loop retries this same read forever
# (the "Waiting to retrieve agent configuration" message), which matches the
# 70-minute measured hang exactly. Corroborated independently: k3s users have
# hit the identical shape for a different file under the same tree
# (/var/lib/rancher/k3s/agent/containerd/peer.key generated empty by an
# unclean stop, same dynamiclistener code path, same fix reported by
# operators -- delete the empty file and let k3s recreate it on restart).
#
# Deleting the zero-length file turns the NEXT read into a genuine
# `os.IsNotExist(err) == true`, which the SAME function already handles by
# generating a fresh key -- no k3s code change, no behaviour invented, just
# removing the on-disk state that trips its own conditional.
#
# SCOPE: /var/lib/rancher/k3s/agent ONLY. server/tls AND server/cred ARE
# DELIBERATELY LEFT ALONE, WITH THE RESIDUAL RISK STATED RATHER THAN PAPERED
# OVER.
#
# Every file under the agent directory is a per-node LEAF certificate or
# kubeconfig: k3s's agent bootstrap is "ask the server for my certs again",
# so the control plane re-issues all of it to a rejoining node on request --
# nothing under this directory is a trust root, and this is true on BOTH
# roles (a server node also runs its own embedded agent/kubelet, writing the
# identical files under the same path -- nixpkgs' rancher module names the
# systemd unit "k3s" on both roles, which is why this module is imported by
# BOTH k3s-server.nix and k3s-agent.nix, same as its sibling
# k3s-wait-for-address.nix).
#
# `/var/lib/rancher/k3s/server/tls` holds this cluster's CA material --
# server-ca, client-ca, request-header-ca, the service-account signing key.
# Deleting a truncated CA key and letting dynamiclistener regenerate a FRESH
# one would silently issue a NEW certificate authority that no
# previously-issued certificate chains to: every other node's agent certs,
# every already-minted kubeconfig, anything a human copied off the box --
# all invalidated at once, with no error message pointing at the cause. That
# is a self-inflicted, cluster-wide, hard-to-diagnose trust break, strictly
# worse than the hang this module fixes.
#
# `/var/lib/rancher/k3s/server/cred` (encryption config, ipsec PSK, the
# admin passwd file) is the same shape one step further downstream:
# regenerating an encryption key can leave already-etcd-stored secrets
# permanently unreadable, which is destruction, not repair.
#
# So the residual risk, stated plainly: a power cut that truncates a file
# under server/tls or server/cred is NOT self-healed by this module and
# would still require manual, deliberate recovery (accept the trust break
# and delete, or restore from an out-of-band backup — neither of which this
# module performs). Automating only the agent directory is the boundary
# between a case that is safe to repair unattended and one that is not; it
# narrows this module's blast radius to the half of the bug that is provably
# safe, rather than reaching for the whole directory tree the underlying
# defect could in principle touch. The datastore (server/db) is outside
# this module's scope entirely -- it is never read, because it is not under
# /var/lib/rancher/k3s/agent.
#
# PREVENTION, CONSIDERED AND DEFERRED. A power cut can land at any instant,
# so no amount of "sync before the install phase ends" makes this
# unreachable in general -- self-heal is the durable fix because it covers
# every timing, not just the one the installer happens to guard. Syncing
# more aggressively during the install's shutdown phase would still be a
# nice-to-have (it narrows the WINDOW in which a crash produces truncated
# files at all), but claiming it as a fix would be a claim this module does
# not make and a real power cut can defeat regardless of where the sync
# points sit. Not implemented here; the durable fix is this module.
#
# WIRING: an ExecStartPre on systemd.services.k3s, following
# k3s-wait-for-address.nix's shape exactly -- same unit, same append-only
# list (NixOS merges `serviceConfig.ExecStartPre` list definitions across
# modules; neither file uses `mkForce`, so both run). ExecStartPre failures
# normally fail the unit; this script is written to ALWAYS exit 0 (see its
# own header), so a self-heal step can never itself become a new way for k3s
# to fail to start.
#
# THE SCRIPT is `k3s-agent-tls-self-heal.sh`, a standalone file (not an
# inline Nix string) for the same reason `k3s-datastore-preflight.sh` is:
# `src/Core.TypeScript/hygiene/k3s-agent-tls-self-heal.test.ts` EXECUTES it
# over fixture directories and asserts exactly which files disappear and
# which never do, rather than only reading Nix source that nothing runs. End
# to end on a real boot: `nixos/tests/k3s-agent-tls-self-heal.nix` boots the
# shipped k3s-server.nix module, lets it write real cert material, truncates
# every file under the agent directory to 0 bytes (reproducing the measured
# defect), restarts k3s, and asserts it reaches `active` and `/readyz`
# again -- UNRUN locally (no nix on this box; validated in CI, same
# disposition as this repo's other NixOS VM tests).

{ config, lib, pkgs, ... }:

{
  systemd.services.k3s.serviceConfig.ExecStartPre = [
    "${pkgs.bash}/bin/bash ${./k3s-agent-tls-self-heal.sh}"
  ];
}
