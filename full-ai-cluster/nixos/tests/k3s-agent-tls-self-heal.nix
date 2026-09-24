# full-ai-cluster/nixos/tests/k3s-agent-tls-self-heal.nix
#
# WP25 (081M38G8NGC087G0R001GEGEDK). END-TO-END proof that the self-heal in
# `nixos/modules/k3s-agent-tls-self-heal.nix` actually recovers a node from
# the MEASURED defect (run 35927439681): k3s.service stuck `activating`
# forever because every file under /var/lib/rancher/k3s/agent was present
# but zero bytes (a truncated write from an unclean stop -- this harness's
# own VM kill; on real hardware a power cut during first boot).
#
# `lint-k3s-datastore-preflight.test.ts`'s sibling,
# `src/Core.TypeScript/hygiene/k3s-agent-tls-self-heal.test.ts`, already
# EXECUTES the repair SCRIPT over fixture directories and proves the pure
# "which files get removed" logic. What no fixture-directory test can reach
# is whether systemd actually runs the ExecStartPre before k3s, and whether
# a REAL k3s -- not a fixture -- actually regenerates the files and reaches
# `active` once they're gone. That is this test's whole job.
#
# WHY A REBOOT-INTO-BROKEN-STATE SCRIPT, NOT A FRESH BOOT WITH PRE-SEEDED
# EMPTY FILES: k3s's cert material does not exist before k3s has run once,
# so there is nothing to truncate before a first boot. The measured defect
# is specifically a SECOND start (after an unclean stop) finding files a
# FIRST start already created. This test reproduces that shape directly:
# boot once for real, stop k3s, truncate every agent file to 0 bytes (the
# measured state, exactly), and start k3s again. Without the self-heal,
# k3s would retry the same "error loading key ...: <nil>" forever (measured:
# 70+ minutes and counting on the real box) and this test would time out on
# the second `wait_for_unit`; with it, the zero-length files are gone before
# k3s's first read, dynamiclistener's LoadOrGenerateKeyFile sees a genuine
# IsNotExist, and k3s reaches active again.
#
# HERMETIC SCOPE, same line as the sibling tests: no internet in the nix
# build sandbox, so no Cilium image and the node never reaches k8s Ready.
# This test asserts k3s.service itself (`active` + the API `/readyz`
# endpoint), which is exactly the layer the measured defect broke --
# `k3s-cluster-online.nix` (non-hermetic, needs `--option sandbox false`)
# is the readiness/CNI layer above this one.
#
# Run:
#   cd full-ai-cluster
#   nix build .#checks.x86_64-linux.k3s-agent-tls-self-heal -L

{ pkgs }:

pkgs.testers.nixosTest {
  name = "k3s-agent-tls-self-heal";

  nodes.machine = { config, pkgs, lib, ... }: {
    # The REAL control-plane module, unmodified -- a server also runs its
    # own embedded agent under /var/lib/rancher/k3s/agent (see the .nix
    # module's header), so a single server node exercises the same code
    # path a worker would.
    imports = [ ../modules/k3s-server.nix ];

    # Hermetic: no image-pull bootstrap manifests in the sandbox.
    services.k3s.manifests = lib.mkForce { };

    virtualisation.memorySize = 2560; # MB
    virtualisation.cores = 2;
    virtualisation.diskSize = 6144; # MB
  };

  testScript = ''
    start_all()

    # ── First boot: let k3s write REAL cert material ─────────────────────
    machine.wait_for_unit("k3s.service", timeout=300)
    machine.wait_until_succeeds(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get --raw='/readyz'",
        timeout=240,
    )
    machine.succeed("test -s /var/lib/rancher/k3s/agent/serving-kubelet.key")
    machine.succeed("test -s /var/lib/rancher/k3s/agent/client-kubelet.crt")

    # ── Reproduce the MEASURED defect: stop k3s, truncate every agent file
    #    to 0 bytes -- exactly what run 35927439681's `ls -l` found on the
    #    real installed disk (every file present, every file 0 bytes,
    #    timestamped from the previous boot). ─────────────────────────────
    machine.systemctl("stop k3s.service")
    machine.succeed(
        "find /var/lib/rancher/k3s/agent -type f -exec truncate -s 0 {} \\;"
    )
    # Confirm the fixture actually reproduces the defect before trusting the
    # recovery assertion below -- a no-op truncate would make this test pass
    # for the wrong reason.
    machine.succeed(
        "test \"$(find /var/lib/rancher/k3s/agent -type f -size +0 | wc -l)\" -eq 0"
    )
    machine.succeed(
        "test \"$(find /var/lib/rancher/k3s/agent -type f | wc -l)\" -gt 0"
    )

    # ── Second start, into the broken state. Without the self-heal this is
    #    where the test times out -- k3s retries "error loading key ...:
    #    <nil>" every ~8s forever (measured on the real box), never reaching
    #    active. With the ExecStartPre in place, the zero-length files are
    #    gone before k3s's first read, and k3s regenerates them itself. ────
    machine.systemctl("start k3s.service")
    machine.wait_for_unit("k3s.service", timeout=300)
    machine.wait_until_succeeds(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get --raw='/readyz'",
        timeout=240,
    )

    # ── The regenerated files are real again, not still-empty stragglers. ─
    machine.succeed("test -s /var/lib/rancher/k3s/agent/serving-kubelet.key")
    machine.succeed("test -s /var/lib/rancher/k3s/agent/client-kubelet.crt")

    # ── The self-heal's own log line proves it ran (not that k3s merely
    #    recovered by some other means) -- named in
    #    k3s-agent-tls-self-heal.sh, unchanged here. Count deliberately NOT
    #    pinned: this asserts the ExecStartPre fired and found something to
    #    remove, not the exact file count a real k3s agent directory holds
    #    (unverified here -- see the module's own header on what is and is
    #    not locally checkable without a booted node). ────────────────────
    machine.succeed(
        "journalctl -u k3s.service -o cat | grep -q "
        "'zeta-k3s-agent-tls-self-heal.*removed [1-9][0-9]* zero-length file'"
    )
  '';
}
