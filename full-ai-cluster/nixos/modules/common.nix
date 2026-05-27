# full-ai-cluster/nixos/modules/common.nix
#
# Shared baseline every cluster host imports.

{ config, pkgs, lib, stateVersion ? "25.11", ... }:

{
  # iter-5.2 (B-0792): per-node hostname injection lives in its own
  # module so every host (control-plane, worker-gpu, worker-template,
  # future configs) inherits the override capability automatically.
  # iter-5.2.2 adds login-banner.nix — shows hostname + ssh hint at
  # console pre-login per the maintainer 2026-05-26 photo-friendly
  # diagnostic discipline.
  imports = [
    ./injected-hostname.nix
    ./login-banner.nix
    # iter-5.4.0 (B-0794 homelab-mode): operator SSH pubkeys captured
    # via `gh ssh-key list` during zeta-install.sh Step 6.8. Composes
    # additively with iter-4.2 static maintainer keys.
    ./operator-authorized-keys.nix
  ];

  nix.settings = {
    experimental-features = [ "nix-command" "flakes" ];
    auto-optimise-store = true;
    trusted-users = [ "root" "@wheel" ];
    substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 30d";
  };

  time.timeZone = lib.mkDefault "America/New_York";
  i18n.defaultLocale = "en_US.UTF-8";

  networking.networkmanager.enable = true;
  networking.firewall.enable = true;

  # iter-5.1 (B-0792): Avahi mDNS publishing so cluster nodes resolve
  # via `<hostname>.local` from operator Mac (Bonjour) + Linux peers
  # (nss-mdns) on the LAN without IP-discovery step. Without this,
  # `ssh zeta@control-plane.local` fails to resolve even though the
  # node is up. Empirical anchor: 2026-05-26 iter-4.2 PC1 test
  # surfaced the gap.
  services.avahi = {
    enable = true;
    nssmdns4 = true;
    openFirewall = true;  # firewall hole for mDNS (5353/udp)
    publish = {
      enable = true;
      addresses = true;
      workstation = true;
      domain = true;
    };
  };

  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = lib.mkDefault "prohibit-password";
      PasswordAuthentication = lib.mkDefault false;
      KbdInteractiveAuthentication = lib.mkDefault false;
    };
  };

  users.users.zeta = {
    isNormalUser = true;
    extraGroups = [ "wheel" "networkmanager" ];
  };
  security.sudo.wheelNeedsPassword = lib.mkDefault true;

  environment.systemPackages = with pkgs; [
    git vim htop btop tmux ripgrep jq yq-go curl wget rsync tree
    file unzip iproute2 iputils dnsutils nmap tcpdump mtr
    pciutils usbutils lshw nvme-cli smartmontools lm_sensors
    hwloc           # lstopo — NUMA/PCI/cache hierarchy diagrams;
                    # composes with Node Feature Discovery for
                    # precise per-node hardware inventory.
    dmidecode
    skopeo
    kubectl kubernetes-helm k9s argocd
    cilium-cli hubble

    # B-0835 fix (Aaron 2026-05-27 control-plane install): gh CLI was
    # available in the installer ISO's PATH (iter-5.4.0 used it for
    # `gh auth login` during install) but NOT in the installed system's
    # PATH after reboot. Operator empirically hit "gh: command not found"
    # on first login. The gh-auth tokens stored in ~/.config/gh during
    # install are useless without the binary. gh stays in systemPackages
    # for ongoing operator workflows (re-auth, ssh-key sync, future
    # node-register tooling).
    gh

    # iter-5.5.0 (B-0848 Phase 2, Aaron 2026-05-27): bun for the
    # node-local Claude Code agent (per .claude/rules/rule-0-no-sh-files.md
    # — bun is Zeta's canonical TS/JS runtime, NOT nodejs). claude-code
    # is published as an npm package but bun has high Node-compat AND
    # bun's `bun install --global` + `bun x` work as npm/npx replacements.
    # bun installs to /home/zeta/.bun/bin/ (per-user writable; NixOS
    # /nix/store is RO). zeta-install.sh Step 6.95 does the bun install
    # + interactive `claude login` + credential persistence + repo pre-clone.
    bun

    # iter-5.5 NetBIOS client tools — `samba` package brings
    # nmblookup/smbclient binaries so operator can query NetBIOS name
    # service from any node. The CORRESPONDING SERVER-SIDE config
    # (services.samba with nmbd-only) lands in PR #5387 (multi-protocol
    # name resolution); the two PRs compose at merge time. Until #5387
    # merges this package provides client-side tooling only — useful
    # for diagnosing OTHER nodes (or the operator's own Mac if it runs
    # nmbd) by NetBIOS name when mDNS multicast is filtered.
    # P2 fix (PR #5388 Copilot review): comment now correctly notes
    # services.samba is NOT configured in this PR; lives in #5387.
    samba
  ];

  # iter-5.5.0 (B-0848 Phase 2, Aaron 2026-05-27): user-local bun prefix
  # on PATH for all login shells so `claude` (installed via
  # `bun install --global` to /home/zeta/.bun/bin in zeta-install.sh
  # Step 6.95) is reachable without manual PATH munging on first login.
  # Per .claude/rules/rule-0-no-sh-files.md: bun is canonical TS/JS
  # runtime in Zeta (NOT nodejs).
  environment.sessionVariables = {
    BUN_INSTALL = "$HOME/.bun";
  };

  # /etc/profile.d/ snippet so $HOME-relative PATH extension happens
  # at shell-init time (NixOS sessionVariables stores literal `$HOME`
  # which wouldn't expand correctly without per-shell init).
  environment.etc."profile.d/zeta-user-paths.sh".text = ''
    # iter-5.5.0 (B-0848): include user's bun-global bin on PATH so
    # claude-code (and any other `bun install --global` user-scope
    # binaries) are reachable without manual setup.
    if [ -d "$HOME/.bun/bin" ]; then
      export PATH="$HOME/.bun/bin:$PATH"
    fi
  '';

  boot.loader = {
    systemd-boot.enable = lib.mkDefault true;
    efi.canTouchEfiVariables = lib.mkDefault true;
  };

  powerManagement.cpuFreqGovernor = lib.mkDefault "performance";

  system.stateVersion = lib.mkDefault stateVersion;
}
