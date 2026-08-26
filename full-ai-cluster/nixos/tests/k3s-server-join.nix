# full-ai-cluster/nixos/tests/k3s-server-join.nix
#
# TWO CONTROL PLANES, ONE CLUSTER — the boot-path proof for
# `nixos/modules/injected-server-join.nix`.
#
# WHY THIS IS NOT `k3s-agent-join.nix`
# ------------------------------------
# The sibling test boots a SERVER and an AGENT. An agent has no datastore, no
# etcd, and no CA of its own; it presents a token and becomes a kubelet. That
# test proves the agent path and says nothing about the one that actually broke.
#
# The defect `injected-server-join.nix` exists for is a CONTROL PLANE that was
# told to join and founded instead — `clusterInit = mkDefault true` with no
# `serverAddr`, so a machine flashed as a control plane came up with a brand-new
# CA whatever the medium said. Two such machines are sitting on the maintainer's
# LAN with CA founding epochs twelve days apart. `--server` on a role=server node
# is a genuinely different code path from `--server` on a role=agent node: it
# joins an ETCD cluster, not just an API server.
#
# So this test boots TWO role=server nodes and asserts the thing that
# distinguishes the good outcome from the bad one, which is NOT "both nodes are
# up" — both nodes were up on the LAN too, and there were two clusters.
#
# THE ASSERTION THAT MATTERS: ONE CA, NOT TWO
# -------------------------------------------
# Membership can be faked by coincidence; a shared cluster CA cannot. Two nodes
# that founded separately have different `server-ca.crt`; two nodes in one
# cluster have the same bytes. That is precisely the check that identified the
# two LAN machines as two foundings rather than one cluster, and it is the
# check this test makes mechanical. Node count alone would pass on a tree where
# the join silently no-ops and each node reports itself.
#
# HERMETIC SCOPE — MEMBERSHIP, NOT READINESS
# ------------------------------------------
# Same line the two sibling tests draw. No internet in the nix build sandbox,
# so no Cilium image, so neither node reaches `Ready`. We assert MEMBERSHIP and
# CA IDENTITY, never readiness; `k3s-cluster-online.nix` is the lane that owns
# readiness, and conflating them would widen the claim silently.
#
# WHAT THIS TEST CANNOT SEE (stated so nobody reads it as broader than it is)
# --------------------------------------------------------------------------
# `injected-server-join.nix` reads its inputs at NIX EVALUATION time. On
# hardware that evaluation happens ON THE TARGET, inside `zeta-install.sh`'s
# `nixos-install --impure`, against `/etc/zeta/*` symlinks the installer just
# staged. In a nixosTest, evaluation happens on the BUILD MACHINE, where
# `/etc/zeta` does not exist and never will. So this test drives the module
# through its `joinServerUrlFile` / `tokenFile` OPTIONS pointed at committed
# fixtures — which is exactly why #15668 made them options rather than
# hardcoded paths.
#
# The consequence is honest and worth naming: this test proves the JOIN
# BEHAVIOUR (a role=server node given an endpoint and a token joins an existing
# cluster instead of founding one). It does NOT prove that `/etc/zeta` is
# visible to Nix evaluation during `nixos-install` — that is a property of the
# INSTALLER ENVIRONMENT, it belongs to the installer lanes, and no booted-guest
# test can speak to it. See the "irreducible" doc for where that one lives.
#
# Run:
#   cd full-ai-cluster
#   nix build .#checks.x86_64-linux.k3s-server-join -L
#
# Per `.claude/rules/automated-tests-are-the-shield-assert-dont-skip.md` this
# test asserts and fails; there is no skip path.

{ pkgs }:

pkgs.testers.nixosTest {
  name = "k3s-server-join";

  nodes = {
    # ── THE FOUNDER ────────────────────────────────────────────────────────
    # No join files, so `injected-server-join.nix` sets nothing and
    # `k3s-server.nix`'s `clusterInit = mkDefault true` stands. This is the
    # "endpoint absent -> byte-identical to today's founding behaviour" branch
    # of that module, exercised by being left alone rather than by assertion.
    founder = { lib, ... }: {
      imports = [ ../modules/k3s-server.nix ];

      services.k3s.manifests = lib.mkForce { };

      # A PRE-SHARED cluster secret, so the joiner can present a token that is
      # known at evaluation time. This is k3s's documented HA setup (`--token`
      # shared across servers), and it is NOT the token-deadlock this module
      # family was born from: that bug set `tokenFile` to
      # `/var/lib/rancher/k3s/server/token`, the path k3s WRITES, so k3s waited
      # forever to read a file it was itself responsible for creating. This
      # points at a store path that already exists and is non-empty, which k3s
      # reads once at startup.
      services.k3s.tokenFile = "${./fixtures/server-join/vm-shared-cluster-token}";

      virtualisation.memorySize = 2560; # MB
      virtualisation.cores = 2;
      virtualisation.diskSize = 6144; # MB
    };

    # ── THE JOINER ─────────────────────────────────────────────────────────
    # role=server (from k3s-server.nix) PLUS an injected endpoint and token, so
    # `injected-server-join.nix` flips clusterInit to false and points
    # serverAddr at the founder. This is the branch that did not exist before
    # #15668 and the reason that PR was written.
    joiner = { lib, nodes, ... }: {
      # `injected-server-join.nix` is imported EXPLICITLY rather than picked up
      # via `common.nix`: it is the module under test, and importing it here
      # keeps this test's subject a single named file instead of whatever the
      # host aggregate happens to pull in.
      imports = [
        ../modules/k3s-server.nix
        ../modules/injected-server-join.nix
      ];

      services.k3s.manifests = lib.mkForce { };

      # Drive the shipped module over committed fixtures. `builtins.pathExists`
      # must be true for BOTH at evaluation time or the module's all-or-none
      # assertion fires — which is itself a property the eval test already pins.
      # Interpolated to STRINGS, not passed as bare paths: both options are
      # `lib.types.str` and a Nix path does not coerce. Interpolation also
      # copies each fixture into the store at evaluation time, which is what
      # makes `builtins.pathExists` inside the module return true for them.
      zeta.k3sServerJoin.joinServerUrlFile =
        "${./fixtures/server-join/cluster-join-server-url}";
      zeta.k3sServerJoin.tokenFile =
        "${./fixtures/server-join/vm-shared-cluster-token}";

      # The fixture endpoint is `https://control-plane:6443` — a NAME, because
      # that is what `--tls-san=control-plane` in k3s-server.nix makes the API
      # certificate valid for. Map it to the founder here, taken from
      # `nodes.founder` rather than hardcoded, so the test stays correct if the
      # driver renumbers the vlan.
      #
      # NOTE the collision this deliberately does not paper over:
      # `k3s-server.nix` unconditionally sets
      # `networking.hosts."127.0.0.1" = [ "control-plane" ]`, which on a
      # JOINING control plane points the join endpoint at the node itself. Both
      # entries land in /etc/hosts. If that resolution order sends the joiner to
      # loopback, this test is the thing that says so.
      networking.hosts = {
        "${nodes.founder.networking.primaryIPAddress}" = [ "control-plane" ];
      };

      # Hold k3s back so the test script performs the hand-off in a controlled
      # order: the founder's API must be up before the joiner dials it. Same
      # TEST-LOCAL sequencing override as k3s-agent-join.nix — the shipped unit
      # starts at boot as normal.
      systemd.services.k3s.wantedBy = lib.mkForce [ ];

      virtualisation.memorySize = 2560; # MB
      virtualisation.cores = 2;
      virtualisation.diskSize = 6144; # MB
    };
  };

  # A FUNCTION of `nodes`, not a bare string, so the founder's driver-assigned
  # address can be interpolated into the assertions instead of hardcoded.
  testScript = { nodes, ... }: ''
    FOUNDER_IP = "${nodes.founder.networking.primaryIPAddress}"

    start_all()

    # ── The founder must be a working cluster before anyone joins it ───────
    founder.wait_for_unit("k3s.service", timeout=300)
    founder.wait_for_file("/var/lib/rancher/k3s/server/node-token", timeout=180)
    founder.wait_until_succeeds(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get --raw='/readyz'",
        timeout=240,
    )

    # ── JOINBLOCKER 1: the preflight really is ordered before k3s ──────────
    # Asserted from the RUNNING SYSTEM, not by reading the unit file. The unit
    # file already has a reader (lint-k3s-datastore-preflight.test.ts); what had
    # no check at all was whether systemd HONOURS `before` + `requiredBy` on a
    # real boot. `systemd-analyze` and the monotonic timestamps are the boot's
    # own record of what happened.
    founder.succeed("systemctl is-active zeta-k3s-datastore-preflight.service")

    preflight_done = int(founder.succeed(
        "systemctl show -p ExecMainExitTimestampMonotonic --value "
        "zeta-k3s-datastore-preflight.service"
    ).strip())
    k3s_started = int(founder.succeed(
        "systemctl show -p ExecMainStartTimestampMonotonic --value k3s.service"
    ).strip())

    # Both must be real measurements. A unit that never ran reports 0, and
    # `0 < anything` would make this assertion pass while proving nothing —
    # the vacuity class in timestamp form.
    assert preflight_done > 0, (
        "preflight ExecMainExitTimestampMonotonic is 0: the unit never ran, so "
        "the ordering assertion below would be vacuous"
    )
    assert k3s_started > 0, (
        "k3s ExecMainStartTimestampMonotonic is 0: k3s never started, so there "
        "is nothing to be ordered against"
    )
    assert preflight_done < k3s_started, (
        f"ordering violated: preflight exited at {preflight_done}us but k3s "
        f"started at {k3s_started}us — `before = [k3s.service]` did not hold"
    )

    # The founder is NOT provisioned to join, so the preflight must take its
    # clear-and-do-nothing branch. Asserting the specific marker keeps this
    # from passing on a unit that succeeded for some other reason.
    founder.succeed(
        "journalctl -u zeta-k3s-datastore-preflight.service --no-pager "
        "| grep -q 'clear: no conflicting datastore'"
    )

    # ── JOINBLOCKER 3: the joiner reaches the founder and JOINS ────────────
    # Name resolution first, so a resolution failure reads as one rather than
    # as a mysterious join timeout.
    joiner.succeed("getent hosts control-plane")

    # The endpoint must resolve to the FOUNDER, not to this node. k3s-server.nix
    # maps control-plane -> 127.0.0.1 unconditionally; if that entry wins, the
    # joiner dials itself and "joins" nothing.
    resolved = joiner.succeed(
        "getent hosts control-plane | head -n1 | awk '{print $1}'"
    ).strip()
    assert resolved == FOUNDER_IP, (
        f"the join endpoint resolves to {resolved!r}, not to the founder "
        f"({FOUNDER_IP!r}). k3s-server.nix sets "
        "networking.hosts.\"127.0.0.1\" = [ \"control-plane\" ] unconditionally, "
        "so on a JOINING control plane the endpoint can point at the node "
        "itself — which joins nothing and founds a second cluster."
    )

    joiner.systemctl("start k3s.service")
    joiner.wait_for_unit("k3s.service", timeout=420)

    # ── ONE CLUSTER, NOT TWO: the founder's API must see BOTH nodes ────────
    # Asked of the FOUNDER's API on purpose. Asking each node about itself is
    # what two sovereign clusters also answer successfully.
    joiner.wait_until_succeeds(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get --raw='/readyz'",
        timeout=300,
    )
    founder.wait_until_succeeds(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get nodes "
        "-o jsonpath='{.items[*].metadata.name}' | grep -q joiner",
        timeout=300,
    )

    node_names = founder.succeed(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get nodes "
        "-o jsonpath='{.items[*].metadata.name}'"
    ).split()
    assert sorted(node_names) == ["founder", "joiner"], (
        f"expected exactly the two nodes in ONE cluster, got {node_names!r}"
    )

    # ── THE DISCRIMINATOR: one cluster CA, not two ─────────────────────────
    # Two nodes that each founded have different CAs and would still both be
    # "up". This is the check that identified the two LAN machines as two
    # foundings, made mechanical.
    founder_ca = founder.succeed(
        "sha256sum /var/lib/rancher/k3s/server/tls/server-ca.crt | cut -d' ' -f1"
    ).strip()
    joiner_ca = joiner.succeed(
        "sha256sum /var/lib/rancher/k3s/server/tls/server-ca.crt | cut -d' ' -f1"
    ).strip()

    assert len(founder_ca) == 64 and len(joiner_ca) == 64, (
        f"CA digests are not sha256 hex: {founder_ca!r} / {joiner_ca!r} — the "
        "comparison below would be comparing two error strings"
    )
    assert founder_ca == joiner_ca, (
        "SPLIT-BRAIN: the two control planes hold DIFFERENT cluster CAs "
        f"({founder_ca} vs {joiner_ca}). The joiner FOUNDED its own cluster "
        "instead of joining — this is the exact defect injected-server-join.nix "
        "was written to prevent, and the signature of the two machines on the "
        "maintainer's LAN."
    )

    # ── The joiner really is a MEMBER of the etcd cluster, not a bystander ──
    # A node can appear in `kubectl get nodes` as an agent. This asserts it is
    # a control-plane member, which is what `--server` on a role=server node is
    # supposed to produce.
    founder.succeed(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get node joiner "
        "-o jsonpath='{.metadata.labels}' "
        "| grep -q 'node-role.kubernetes.io/control-plane'"
    )

    # ── JOINBLOCKER 2 (the half a booted guest CAN see) ────────────────────
    # The install-eval visibility of /etc/zeta is an installer-environment
    # property and is out of scope here (see the header). What IS in scope: the
    # token the joining unit was pointed at must be READABLE by the k3s unit at
    # the moment it starts. A store path is not automatically the same thing as
    # a readable one under a hardened unit.
    joiner.succeed(
        "test -r ${./fixtures/server-join/vm-shared-cluster-token}"
    )

    # Post-mortem state into the build log.
    print(founder.succeed(
        "KUBECONFIG=/etc/rancher/k3s/k3s.yaml k3s kubectl get nodes -o wide || true"
    ))
    print(joiner.succeed("systemctl --no-pager status k3s.service | head -n 5 || true"))
  '';
}
