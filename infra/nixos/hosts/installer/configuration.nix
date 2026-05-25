# infra/nixos/hosts/installer/configuration.nix
#
# Single-file declarative desired state for the USB-stick (or netboot)
# NixOS installer image used to bootstrap every machine in the AI cluster.
#
# Built by the flake at the repo root:
#     nix build .#nixosConfigurations.installer.config.system.build.isoImage
# Then `dd` the produced ISO to a USB stick, boot the target machine,
# clone this repo, and run `nixos-install --flake .#<host>` against the
# desired host config (control-plane, worker-gpu-01, ...).
#
# Scope: ONLY packages needed ON THE STICK to reach the point where
# `nixos-install` can take over and pull everything else (K3S, ArgoCD,
# Orleans, GitLab, Argo Workflows, Argo Rollouts) from the flake.
# Do NOT add cluster runtime packages here — they belong in the
# per-host modules under infra/nixos/modules/.

{ config, pkgs, lib, modulesPath, ... }:

{
  imports = [
    # Use the upstream minimal installation CD as a base.
    # Gives us a working live system, getty, nix, and the installer plumbing.
    "${modulesPath}/installer/cd-dvd/installation-cd-minimal.nix"
    "${modulesPath}/installer/cd-dvd/channel.nix"
  ];

  # ---------------------------------------------------------------------------
  # Identity
  # ---------------------------------------------------------------------------
  networking.hostName = "zeta-installer";
  time.timeZone = "America/New_York";
  i18n.defaultLocale = "en_US.UTF-8";

  # ---------------------------------------------------------------------------
  # Nix / Flakes
  # ---------------------------------------------------------------------------
  nix.settings = {
    experimental-features = [ "nix-command" "flakes" ];
    auto-optimise-store = true;
    # Trust the live user so `nixos-install --flake` works without sudo dance
    trusted-users = [ "root" "nixos" ];
    # Big public caches so installs are fast even from the stick
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
  # Networking — wired + wireless so any machine can phone home to clone Zeta
  # ---------------------------------------------------------------------------
  networking.networkmanager.enable = true;
  networking.wireless.enable = lib.mkForce false; # NM handles wifi instead
  networking.firewall.enable = false;             # installer-only; live system

  # SSH so we can install headlessly from another laptop over Ethernet
  services.openssh = {
    enable = true;
    settings = {
      PermitRootLogin = "yes";
      PasswordAuthentication = true;
    };
  };

  # Default credentials for the live installer session (change before shipping)
  users.users.root.initialPassword = "zeta";
  users.users.nixos = {
    isNormalUser = true;
    initialPassword = "zeta";
    extraGroups = [ "wheel" "networkmanager" ];
  };
  security.sudo.wheelNeedsPassword = false;

  # ---------------------------------------------------------------------------
  # THE PACKAGE LIST — everything that must be on the USB stick
  # ---------------------------------------------------------------------------
  environment.systemPackages = with pkgs; [

    # --- Version control: pull the Zeta flake onto the target ---------------
    git
    git-lfs
    gnupg
    openssh

    # --- Editors (pick your poison; ship both, they're tiny) ----------------
    vim
    neovim
    nano

    # --- Shell quality of life ----------------------------------------------
    bash
    zsh
    tmux
    screen
    htop
    btop
    tree
    ripgrep
    fd
    fzf
    bat
    eza
    jq
    yq-go
    less
    file
    which
    unzip
    zip
    p7zip
    rsync

    # --- Network: reach the internet, GitHub, and the local LAN -------------
    curl
    wget
    iproute2          # ip(8)
    iputils           # ping
    inetutils         # traceroute, telnet
    dnsutils          # dig, nslookup
    nmap
    tcpdump
    mtr
    ethtool
    bind              # host
    networkmanager    # nmcli/nmtui
    iwd               # wifi backend for NM
    wpa_supplicant    # fallback wifi
    openvpn           # in case the install network needs VPN
    wireguard-tools

    # --- Disk / partitioning / filesystems ----------------------------------
    parted
    gptfdisk          # sgdisk
    util-linux        # fdisk, lsblk, blkid, wipefs
    cryptsetup        # LUKS for encrypted root
    dosfstools        # FAT32 for EFI
    e2fsprogs         # ext4
    xfsprogs
    btrfs-progs
    zfs               # ZFS root is common on NixOS AI rigs
    lvm2
    mdadm             # software RAID
    smartmontools     # disk health before committing

    # --- Hardware inspection (know your machine before installing) ----------
    pciutils          # lspci
    usbutils          # lsusb
    lshw
    dmidecode
    hwinfo
    inxi
    lm_sensors
    nvme-cli
    hdparm

    # --- GPU detection (NVIDIA + AMD; drivers come in per-host gpu.nix) -----
    glxinfo
    vulkan-tools
    clinfo

    # --- NixOS install tooling (already in the base image, listed for
    #     discoverability) ---------------------------------------------------
    nixos-install-tools
    nix-output-monitor    # `nom` — prettier nix build output
    nvd                   # nix version diff
    nh                    # friendly nixos rebuild wrapper

    # --- Kubernetes / GitOps clients on the stick so you can poke a
    #     just-installed control plane from the live USB before reboot ------
    kubectl
    kubernetes-helm
    k9s
    argocd                # ArgoCD CLI
    k3s                   # binary present so the installer can pre-seed if wanted

    # --- Container runtime tooling (debug only on the stick) ----------------
    skopeo
    crane

    # --- Secrets management (so encrypted secrets in the flake can be
    #     decrypted during install) -----------------------------------------
    age
    sops
    ssh-to-age

    # --- Build-time helpers you'll inevitably want -------------------------
    coreutils
    findutils
    gawk
    gnused
    gnugrep
    diffutils
    patch
    gcc                   # bootstrap compiler if a flake input needs it
    gnumake
    pkg-config

    # --- Observability of the install itself --------------------------------
    iotop
    iftop
    ncdu
    pv
    progress

    # --- Documentation on the stick (no internet? still readable) -----------
    man-pages
    man-pages-posix
    tldr
  ];

  # ---------------------------------------------------------------------------
  # ISO branding
  # ---------------------------------------------------------------------------
  isoImage = {
    isoName = lib.mkForce "zeta-installer-${config.system.nixos.release}.iso";
    volumeID = lib.mkForce "ZETA_INSTALL";
    makeEfiBootable = true;
    makeUsbBootable = true;
  };

  # Pre-stage this flake onto the stick at /etc/zeta so the installer can
  # immediately `nixos-install --flake /etc/zeta#<host>` without network.
  # (The flake.nix at repo root references this file via
  #  nixosConfigurations.installer.)
  environment.etc."zeta/README.md".text = ''
    Zeta cluster installer
    ======================

    1. Boot this USB on the target machine.
    2. Log in:  user `nixos` / password `zeta`  (or root / zeta)
    3. Identify the disk:        lsblk
    4. Partition + mount:        see ZFS or ext4 recipes in
                                  /etc/zeta/infra/nixos/hosts/<host>/README.md
    5. Generate hardware config: nixos-generate-config --root /mnt
    6. Install:                  nixos-install --flake /etc/zeta#<host>
    7. Reboot.  K3S, ArgoCD, Orleans land automatically from the flake.

    The flake itself is the tick source. Everything downstream reconciles
    toward the desired state declared in Git.
  '';

  # NixOS release that this installer targets.
  system.stateVersion = "24.11";
}
