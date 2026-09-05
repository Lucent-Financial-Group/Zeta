# Eval-only: host-seal-model.nix + host-seal-profile.nix.
#
# NOT a NixOS VM test. Throws on failure, so forcing its value IS running
# it. `flake.nix` forces it inside `checks.<system>.host-seal-profile-model`.
#
# Falsifies:
#   1. undeclared is a no-op (no pcscd, no udev, no packages, no PAM).
#   2. developer allows FIDO + biometric userspace; does not enable PAM u2f.
#   3. prod-metal requires automatic rotation and refuses FIDO / biometric.
#   4. assess: unprobed ≠ drift; indeterminate → check-did-not-run;
#      prod + FIDO-only → drift; developer never claims silicon.
#   5. CI is not a NixOS boxRole (unknown role throws).
#
# WHAT IT CANNOT TELL YOU. Nothing here contacts a YubiHSM, a fingerprint
# reader, a YubiKey, or a TPM. Presence is a measurement; this test is
# about the declared role and the derived plan.
#
# Run it directly:
#   nix eval --impure --expr '
#     import ./full-ai-cluster/nixos/tests/host-seal-profile-eval-test.nix {
#       lib = (builtins.getFlake "nixpkgs").lib;
#     }'

{ lib }:

let
  model = import ../modules/host-seal-model.nix;

  check = name: cond: { inherit name; ok = cond; };

  throws = f: !(builtins.tryEval (builtins.deepSeq (f null) true)).success;

  fakePkgs = {
    opensc = "PKG:opensc";
    pcsclite = "PKG:pcsclite";
    libfido2 = "PKG:libfido2";
    fprintd = "PKG:fprintd";
  };

  evalModule =
    boxRole:
    (lib.evalModules {
      modules = [
        ../modules/host-seal-profile.nix
        {
          options.services = lib.mkOption {
            type = lib.types.attrsOf lib.types.unspecified;
            default = { };
          };
          options.environment = lib.mkOption {
            type = lib.types.attrsOf lib.types.unspecified;
            default = { };
          };
          options.security = lib.mkOption {
            type = lib.types.attrsOf lib.types.unspecified;
            default = { };
          };
          config._module.args.pkgs = fakePkgs;
          config.zeta.hostSeal.boxRole = boxRole;
        }
      ];
    }).config;

  undeclared = evalModule "undeclared";
  developer = evalModule "developer";
  prod = evalModule "prod-metal";

  emptyCapture = {
    yubiHsm = "absent";
    smartcardHsm = "absent";
    tpm = "absent";
    fido = "absent";
    biometric = "absent";
  };

  properties = [
    (check "boxRoles are undeclared/developer/prod-metal" (
      model.boxRoles == [
        "undeclared"
        "developer"
        "prod-metal"
      ]
    ))
    (check "CI is not a NixOS host role" (!(builtins.elem "ci-emulator" model.boxRoles)))
    (check "an unknown role throws rather than defaulting to prod" (
      throws (_: model.derivePlan "ci-emulator")
    ))

    (check "undeclared provisions nothing" (
      let p = model.derivePlan "undeclared"; in
      !p.enablePcscd && !p.enableYubiHsmUdev && !p.enableFidoUserspace
      && !p.enableBiometricUserspace && !p.fidoRotationAllowed
      && !p.biometricRotationAllowed && !p.automaticRotationRequired
    ))
    (check "undeclared sets no service" (undeclared.services == { }))
    (check "undeclared sets no system package" (undeclared.environment == { }))
    (check "undeclared sets no PAM" (undeclared.security == { }))

    (check "developer allows FIDO and biometric rotation" (
      let p = model.derivePlan "developer"; in
      p.fidoRotationAllowed && p.biometricRotationAllowed && !p.automaticRotationRequired
    ))
    (check "developer ships libfido2" (
      builtins.elem "PKG:libfido2" developer.environment.systemPackages
    ))
    (check "developer ships fprintd" (
      builtins.elem "PKG:fprintd" developer.environment.systemPackages
    ))
    (check "developer enables pcscd" (developer.services.pcscd.enable == true))
    (check "developer enables fprintd service, not sudo PAM" (
      developer.services.fprintd.enable == true && developer.security == { }
    ))
    (check "developer YubiHSM udev names VID 1050 PID 0030" (
      lib.hasInfix "1050" developer.services.udev.extraRules
      && lib.hasInfix "0030" developer.services.udev.extraRules
    ))

    (check "prod-metal requires automatic rotation" (
      let p = model.derivePlan "prod-metal"; in
      p.automaticRotationRequired && !p.fidoRotationAllowed && !p.biometricRotationAllowed
    ))
    (check "prod-metal enables pcscd so the HSM can talk" (prod.services.pcscd.enable == true))
    (check "prod-metal does not ship FIDO userspace" (
      !(builtins.elem "PKG:libfido2" prod.environment.systemPackages)
    ))
    (check "prod-metal does not ship fprintd" (
      !(builtins.elem "PKG:fprintd" prod.environment.systemPackages)
    ))
    (check "prod-metal does not enable fprintd" (
      !(prod.services ? fprintd)
    ))
    (check "prod-metal still ships opensc" (
      builtins.elem "PKG:opensc" prod.environment.systemPackages
    ))
    (check "prod-metal sets no PAM" (prod.security == { }))

    (check "undeclared never claims, even with a device attached" (
      (model.assess {
        boxRole = "undeclared";
        capture = emptyCapture // { yubiHsm = "attached"; };
      }).outcome == "no-claim"
    ))
    (check "developer never claims silicon" (
      (model.assess {
        boxRole = "developer";
        capture = emptyCapture // { fido = "attached"; };
      }).outcome == "no-claim"
    ))
    (check "prod without a capture is unprobed, not drift" (
      (model.assess {
        boxRole = "prod-metal";
        capture = null;
      }).outcome == "unprobed"
    ))
    (check "unavailable TPM is check-did-not-run, not absent" (
      (model.assess {
        boxRole = "prod-metal";
        capture = emptyCapture // { tpm = "unavailable"; };
      }).outcome == "check-did-not-run"
    ))
    (check "prod + FIDO-only is drift" (
      (model.assess {
        boxRole = "prod-metal";
        capture = emptyCapture // { fido = "attached"; };
      }).reason or "" == "prod-refuses-fido-rotation"
    ))
    (check "prod + biometric-only is drift" (
      (model.assess {
        boxRole = "prod-metal";
        capture = emptyCapture // { biometric = "present"; };
      }).reason or "" == "prod-refuses-biometric-rotation"
    ))
    (check "prod + attached YubiHSM is agree" (
      (model.assess {
        boxRole = "prod-metal";
        capture = emptyCapture // { yubiHsm = "attached"; };
      }).outcome == "agree"
    ))
    (check "prod + TPM present is agree" (
      (model.assess {
        boxRole = "prod-metal";
        capture = emptyCapture // { tpm = "present"; };
      }).outcome == "agree"
    ))
    (check "prod + looked-and-empty is automatic-rotator drift" (
      (model.assess {
        boxRole = "prod-metal";
        capture = emptyCapture;
      }).reason or "" == "prod-needs-automatic-rotator"
    ))
  ];

  failures = builtins.filter (p: !p.ok) properties;
  names = builtins.concatStringsSep ", " (map (p: p.name) failures);
in
if failures == [ ] then
  {
    status = "host-seal-profile-model: ${toString (builtins.length properties)} properties hold";
  }
else
  throw "host-seal-profile-model: ${toString (builtins.length failures)} properties FAILED: ${names}"
