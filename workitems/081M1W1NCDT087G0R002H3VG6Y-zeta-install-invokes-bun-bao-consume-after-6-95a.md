---
id: 081M1W1NCDT087G0R002H3VG6Y
type: task
state: backlog
priority: P2
slug: zeta-install-invokes-bun-bao-consume-after-6-95a
title: "zeta-install invokes bun bao consume after 6.95a"
created: 2026-09-06T19:03:30.490Z
depends_on: ["081M1VZRST2087G0R001QEJDWG"]
composes_with: ["081M1VXAQEJ087G0R00325DJRS"]
---

# zeta-install invokes bun bao consume after 6.95a

Aaron 2026-09-06: continue after #16828. Names are exported
and sed-parsed. bun/mise are still not on PATH at first-boot
or at ESP pickup. After `zeta-install.sh` Step 6.95a,
`tools/setup/install.sh` has run. Invoke
`src/Core.TypeScript/zflash/firstboot-bao-env.ts` there,
the same way wifi/iserial helpers run. Do not invoke bun
from `full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`.
Do not expand `ZetaFirstbootRole`. Do not land the stanza.
Do not fill `NIXOS_HOST_BAO`. Do not open `/dev/tpmrm0`.

## Pre-start checklist

- Substrate-drift: #16828 (`081M1VZRST2087G0R001QEJDWG`)
  exports and sed-parses both names. #16820
  (`081M1VXAQEJ087G0R00325DJRS`) landed the bun consume.
  Step 6.95a clones `$ZETA_HOME/Zeta` and runs
  `tools/setup/install.sh`. Sibling bun helpers
  (wifi-esp-to-nm, usb-iserial-probe) already use mise
  shims after that point.
- Prior-art: those sibling helpers. `references/prior-art/`
  not searched recursively.
- Depends on #16828 pickup + #16820 consume.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Invoking bun from
  `full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`.
- Filling `NIXOS_HOST_BAO` when the consume returns null.
- Opening `/dev/tpmrm0` or a `.so`.
- Staging unused files under `/mnt/etc/zeta/`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
