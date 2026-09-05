# Host-seal profile — NixOS-side of the emulator-vs-metal distinction.
#
# Default `zeta.hostSeal.boxRole = "undeclared"` is a no-op: no pcscd, no
# udev, no packages, no assertions. Flip the role on a real host after
# measuring hardware (`frost-hardware-probe.ts` / `tpm2-linux-probe.ts`).
# Do not infer the role from a Kubernetes label.
#
# Developer boxes get FIDO + biometric *userspace* (libfido2, fprintd) so
# a YubiKey / Touch ID / fingerprint reader can participate in rotation.
# This module does *not* enable `security.pam.u2f` or fingerprint PAM
# on sudo — that would lock sudo to a token the operator may not have
# bound yet. Bind PAM in the host's own configuration.
#
# Prod boxes require automatic rotation (YubiHSM / smartcard HSM / TPM
# PKCS#11). FIDO and biometric userspace stay off so a forgotten YubiKey
# cannot become the rotator. pcscd + YubiHSM udev still land so the
# automatic device can talk.
#
# Compose with `zeta.tpm2Seal` — this module never flips `mode`.
{
  config,
  lib,
  pkgs,
  ...
}:
let
  inherit (lib) mkOption mkIf types;
  model = import ./host-seal-model.nix;
  cfg = config.zeta.hostSeal;
  plan = model.derivePlan cfg.boxRole;
in
{
  options.zeta.hostSeal = {
    boxRole = mkOption {
      type = types.enum model.boxRoles;
      default = "undeclared";
      description = ''
        Host role for seal / rotation. `undeclared` is a no-op (same
        discipline as `zeta.tpm2Seal.mode = "off"`). `developer` allows
        FIDO and biometric rotation. `prod-metal` requires automatic
        HSM or TPM PKCS#11 rotation and refuses FIDO / biometric as
        the rotation gate. CI is not a NixOS host role.
      '';
    };

    plan = mkOption {
      type = types.attrsOf types.bool;
      readOnly = true;
      description = "Derived host-seal plan (enable flags + rotation policy).";
    };
  };

  config = lib.mkMerge [
    { zeta.hostSeal.plan = plan; }

    (mkIf (cfg.boxRole != "undeclared") {
      services.pcscd.enable = mkIf plan.enablePcscd true;

      services.udev.extraRules = mkIf plan.enableYubiHsmUdev ''
        # YubiHSM 2 (USB VID 1050 PID 0030). Group `tss` so the same
        # account that talks to the firmware TPM can talk to the USB HSM.
        # MODE 0660 — connector talks; world cannot.
        SUBSYSTEM=="usb", ATTR{idVendor}=="1050", ATTR{idProduct}=="0030", GROUP="tss", MODE="0660"
      '';

      # Fingerprint *daemon*, not sudo PAM. Developer only.
      services.fprintd.enable = mkIf plan.enableBiometricUserspace true;

      environment.systemPackages =
        lib.optionals plan.enablePcscd [
          pkgs.opensc
          pkgs.pcsclite
        ]
        ++ lib.optionals plan.enableFidoUserspace [
          pkgs.libfido2
        ]
        ++ lib.optionals plan.enableBiometricUserspace [
          pkgs.fprintd
        ];
    })
  ];
}
