# full-ai-cluster/nixos/modules/disko-shapes/2nvme.nix
#
# Cookie-cutter disko shape: 2 NVMes, equal capacity, K3S + Longhorn
# node. Works on 1TB / 2TB / 8TB / whatever — root max-fills nvme0
# (no fixed OS cap); longhorn1 keeps a fixed tail slice. Matches the
# USB installer's zeta-install layout (ESP + root max + longhorn tail).
#
# Layout:
#
#   nvme0n1
#     p1   1 GiB   FAT32   /boot               EFI
#     p2   max     ext4    /                   OS + /nix/store + image cache
#     p3   tail    ext4    /var/lib/longhorn-disk1
#
#   nvme1n1
#     p1   rest    ext4    /var/lib/longhorn-disk2
#
# Root grows with disk size; only longhorn1 tail is fixed (default 1G).
# Per-disk failure isolates cleanly (OS survives a Longhorn-disk
# failure; one Longhorn data path going away triggers cluster-level
# re-replication from peer nodes).
#
# Per-host override: set `zeta.disko.nvme0` and `zeta.disko.nvme1`
# to the actual /dev/disk/by-id symlinks for the target's drives.
# Using by-id (vs /dev/nvme0n1) makes the spec portable across
# motherboard PCIe-slot re-enumeration.
#
# Install path:
#   nix run github:nix-community/disko -- \
#     --mode disko \
#     --flake /mnt/etc/zeta/full-ai-cluster#<host>
#   nixos-install --flake /mnt/etc/zeta/full-ai-cluster#<host> --no-root-password

{ config, lib, ... }:

let
  cfg = config.zeta.disko;
in
{
  options.zeta.disko = {
    nvme0 = lib.mkOption {
      type = lib.types.str;
      description = ''
        /dev/disk/by-id symlink for the boot disk (gets OS + first
        Longhorn data path). Find it on the live system with
        `ls -l /dev/disk/by-id/ | grep nvme`.
      '';
      example = "/dev/disk/by-id/nvme-Samsung_SSD_990_PRO_1TB_S6Z2NS0WB12345";
    };

    nvme1 = lib.mkOption {
      type = lib.types.str;
      description = ''
        /dev/disk/by-id symlink for the second NVMe (full disk
        becomes the second Longhorn data path).
      '';
      example = "/dev/disk/by-id/nvme-WD_BLACK_SN850X_1000GB_25092A800123";
    };

    longhorn1Tail = lib.mkOption {
      type = lib.types.str;
      default = "1G";
      description = ''
        Fixed tail slice on nvme0 for longhorn1. Root max-fills the
        space between the 1 GiB ESP and this tail (same geometry as
        zeta-install on the USB installer).
      '';
    };
  };

  config = {
    disko.devices = {
      disk = {
        nvme0 = {
          type = "disk";
          device = cfg.nvme0;
          content = {
            type = "gpt";
            partitions = {
              ESP = {
                priority = 1;
                size = "1G";
                type = "EF00";   # EFI System Partition
                content = {
                  type = "filesystem";
                  format = "vfat";
                  mountpoint = "/boot";
                  mountOptions = [ "umask=0077" ];
                };
              };

              root = {
                priority = 2;
                start = "0";
                # sgdisk end code: root fills from after ESP to the longhorn1 tail.
                end = "-${cfg.longhorn1Tail}";
                content = {
                  type = "filesystem";
                  format = "ext4";
                  mountpoint = "/";
                  mountOptions = [ "noatime" ];
                };
              };

              longhorn1 = {
                # "100%" = remaining tail after root (default 1G; actual bytes follow disk).
                size = "100%";
                content = {
                  type = "filesystem";
                  format = "ext4";
                  mountpoint = "/var/lib/longhorn-disk1";
                  mountOptions = [ "noatime" "nofail" ];
                };
              };
            };
          };
        };

        nvme1 = {
          type = "disk";
          device = cfg.nvme1;
          content = {
            type = "gpt";
            partitions = {
              longhorn2 = {
                size = "100%";
                content = {
                  type = "filesystem";
                  format = "ext4";
                  mountpoint = "/var/lib/longhorn-disk2";
                  mountOptions = [ "noatime" "nofail" ];
                };
              };
            };
          };
        };
      };
    };

    # Wire the Longhorn module to both mount points by default. A
    # host that wants different / additional paths can override
    # `zeta.longhorn.dataDisks` directly.
    zeta.longhorn.dataDisks = lib.mkDefault [
      "/var/lib/longhorn-disk1"
      "/var/lib/longhorn-disk2"
    ];
  };
}
