# full-ai-cluster/nixos/modules/zeta-self-register.nix
#
# B-0855.1: NixOS service surface for post-install self-registration.
# The service is intentionally disabled by default until B-0855.2 ships
# the TypeScript implementation at tools/installer/zeta-self-register.ts.
# Once enabled by a host config, it fires on first boot of the installed
# OS, after network-online and credential-restore ordering, instead of
# running inside the live-USB installer environment.

{ config, lib, ... }:

let
  cfg = config.zeta.selfRegister;
in
{
  options.zeta.selfRegister = {
    enable = lib.mkEnableOption "Zeta post-install first-boot self-registration service";

    user = lib.mkOption {
      type = lib.types.str;
      default = "zeta";
      description = "User that runs zeta-self-register.service.";
    };

    group = lib.mkOption {
      type = lib.types.str;
      default = "users";
      description = "Primary group for the self-registration service user.";
    };

    home = lib.mkOption {
      type = lib.types.str;
      default = "/home/zeta";
      description = "Home directory used for credentials and local marker state.";
    };

    repoRoot = lib.mkOption {
      type = lib.types.str;
      default = "${cfg.home}/Zeta";
      description = "Path to the checked-out Zeta repository on the installed node.";
    };

    scriptPath = lib.mkOption {
      type = lib.types.str;
      default = "${cfg.repoRoot}/tools/installer/zeta-self-register.ts";
      description = "Bun TypeScript entrypoint for composing self-registration intent.";
    };

    markerPath = lib.mkOption {
      type = lib.types.str;
      default = "${cfg.home}/.config/zeta/self-registered.marker";
      description = "Fast-path local marker written after registration intent exists.";
    };

    intentDir = lib.mkOption {
      type = lib.types.str;
      default = "${cfg.home}/.config/zeta/self-registration-intent";
      description = "Directory where the service writes registration intent for the local agent steward.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.zeta-self-register = {
      description = "Zeta node self-registration intent writer (B-0855.1)";
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      after = [
        "network-online.target"
        "zeta-creds-restore.service"
      ];

      unitConfig = {
        ConditionFirstBoot = "yes";
      };

      serviceConfig = {
        Type = "oneshot";
        User = cfg.user;
        Group = cfg.group;
        WorkingDirectory = cfg.repoRoot;
        Environment = [
          "HOME=${cfg.home}"
          "PATH=${cfg.home}/.local/share/mise/shims:${cfg.home}/.bun/bin:/run/current-system/sw/bin:/usr/bin:/bin"
          "BUN_INSTALL=${cfg.home}/.bun"
          "ZETA_SELF_REGISTER_MARKER=${cfg.markerPath}"
          "ZETA_SELF_REGISTER_INTENT_DIR=${cfg.intentDir}"
          "ZETA_SELF_REGISTER_REPO=${cfg.repoRoot}"
        ];
        ExecStart = "${cfg.home}/.local/share/mise/shims/bun ${cfg.scriptPath}";
      };
    };
  };
}
