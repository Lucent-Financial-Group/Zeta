# Pure host-seal model. No module system, no pkgs. Eval-checkable.
#
# NixOS is the host OS. Kubernetes labels cannot see a USB YubiHSM or a
# laptop fingerprint reader. This module answers two questions the cluster
# Application cannot:
#
#   1. What *role* is this box? (`undeclared` / `developer` / `prod-metal`)
#      CI is not a NixOS host role — CI jobs declare the emulator oracle
#      in TypeScript (`classifyHostSeal("ci-emulator", …)`), never from
#      `/dev/tpmrm0` on the runner.
#   2. Given a hardware *capture* (userspace probe, not Nix eval — Nix
#      cannot see a hot-plugged USB device), does the capture agree with
#      the role, or is that a check-did-not-run / drift?
#
# Rotation split (Aaron 2026-09-05):
#   developer  — FIDO and biometrics *supported* as rotation methods.
#                An attached YubiHSM / smartcard HSM / TPM still wins.
#                Assess is `no-claim`: allowed, not required.
#   prod-metal — key rotation must be automatic (HSM or TPM PKCS#11).
#                FIDO / biometric may exist on the box (break-glass) but
#                are refused as the rotation gate.
#
# Compose with `zeta.tpm2Seal` — this model does not flip `mode`.
# Default `undeclared` is a no-op, same discipline as `tpm2Seal.mode = "off"`.
#
# Honesty (same as tpm2-seal-model.nix):
#   Nix eval is not a live USB / TPM / biometric probe. `hardware-configuration.nix`
#   in this repo is the placeholder `not-detected.nix`. Presence is a
#   measurement (`frost-hardware-probe.ts` / `tpm2-linux-probe.ts`);
#   the NixOS role is a declaration.
#
# `builtins` only — no lib, no packages, no I/O — so it evaluates under
# any nixpkgs (`nixos/tests/host-seal-profile-eval-test.nix`).

let
  inherit (builtins) elem;

  boxRoles = [
    "undeclared"
    "developer"
    "prod-metal"
  ];

  derivePlan =
    boxRole:
    if boxRole == "undeclared" then
      {
        automaticRotationRequired = false;
        fidoRotationAllowed = false;
        biometricRotationAllowed = false;
        enablePcscd = false;
        enableYubiHsmUdev = false;
        enableFidoUserspace = false;
        enableBiometricUserspace = false;
      }
    else if boxRole == "developer" then
      {
        automaticRotationRequired = false;
        fidoRotationAllowed = true;
        biometricRotationAllowed = true;
        enablePcscd = true;
        enableYubiHsmUdev = true;
        enableFidoUserspace = true;
        enableBiometricUserspace = true;
      }
    else if boxRole == "prod-metal" then
      {
        automaticRotationRequired = true;
        fidoRotationAllowed = false;
        biometricRotationAllowed = false;
        enablePcscd = true;
        enableYubiHsmUdev = true;
        enableFidoUserspace = false;
        enableBiometricUserspace = false;
      }
    else
      throw "host-seal-model: unknown boxRole ${boxRole}";

  assess =
    {
      boxRole,
      capture,
    }:
    let
      yubiHsm = capture.yubiHsm or "absent";
      smartcard = capture.smartcardHsm or "absent";
      tpm = capture.tpm or "absent";
      fido = capture.fido or "absent";
      biometric = capture.biometric or "absent";
      anyIndeterminate =
        elem "indeterminate" [
          yubiHsm
          smartcard
          tpm
          fido
          biometric
        ]
        || elem "unavailable" [
          yubiHsm
          tpm
        ];
      automaticAttached =
        yubiHsm == "attached" || smartcard == "attached" || tpm == "present";
    in
    # Role first — developer/undeclared never claim silicon, even if a
    # probe is missing or stuck (matches host-seal-profile.ts).
    if boxRole == "undeclared" || boxRole == "developer" then
      { outcome = "no-claim"; }
    else if boxRole != "prod-metal" then
      throw "host-seal-model: unknown boxRole ${boxRole}"
    else if capture == null then
      { outcome = "unprobed"; }
    else if anyIndeterminate then
      { outcome = "check-did-not-run"; }
    else if automaticAttached then
      { outcome = "agree"; }
    else if fido == "attached" then
      {
        outcome = "drift";
        reason = "prod-refuses-fido-rotation";
      }
    else if biometric == "present" then
      {
        outcome = "drift";
        reason = "prod-refuses-biometric-rotation";
      }
    else
      {
        outcome = "drift";
        reason = "prod-needs-automatic-rotator";
      };
in
{
  inherit
    boxRoles
    derivePlan
    assess
    ;
}
