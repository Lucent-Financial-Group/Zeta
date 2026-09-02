---
id: 081M12178AR087G0R0014Z5JGE
type: task
state: in-progress
priority: P2
slug: uefi-keyfile-restore-exercise-non-zero-cred-write-metal-tty1
title: "UEFI keyfile restore: exercise non-zero cred write + metal tty1 path"
created: 2026-08-27T16:35:32.312Z
depends_on: []
composes_with: []
---

# UEFI keyfile restore: exercise non-zero cred write + metal tty1 path

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M12178AR087G0R0014Z5JGE-*.md` glob. -->

## Context

The UEFI keyfile restore lane is green in CI (081M0WTB5MN), but the green has two
named boundaries recorded in `docs/uefi-keyfile-restore-metal-path.md`:

1. **Non-zero write is vacuous in-guest.** The QEMU picker bakes 0 creds, so
   restore reports `wrote 0 creds`. Decrypt + bind are proven; the write/chown
   path is not exercised. `restoreExercisedWritePath()` in
   `src/Core.TypeScript/ci/qemu-full-install-test.ts` returns `false` on the lane
   today, by design, to keep the vacuity legible.
2. **Metal `tty1` path is unverified.** `fw_cfg` does not exist on hardware; the
   `systemd-ask-password` path has never run in CI.

## Progress (2026-08-27, Riven)

Non-zero write path is in tree: `QEMU_UEFI_KEYFILE_RESTORE=1` bakes
`/zeta-qemu-bake-test-cred`, picker `--bake-cred gh-cli=env:ZETA_QEMU_PROBE_GH_CLI`,
and `assertUefiKeyfileRestoreWritePath()` requires `wrote >= 1` (or
`already-present`). Still needs a green `main` dispatch of
`build-ai-cluster-iso.yml` before the CI-verifiable acceptance bullet is proven.
Metal `tty1` remains hardware-gated.

## Progress (2026-08-28, Riven)

QEMU non-zero write is proven on `main` dispatch run
[33126215487](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33126215487)
(`workflow_dispatch`, SHA `034544150`). Serial:
`zeta-creds-restore: wrote 1 creds (target-root: /)` after picker
`--bake-cred x1` (not `--defer-all`). First acceptance bullet is closed.
Metal `tty1` and in-guest wrong-passphrase refusal remain open — do not
complete this item.

## Progress (2026-08-28, Riven — hex port + in-guest refusal harness)

Passphrase acquisition is a pure plan + injected IO
(`src/Core.TypeScript/installer/passphrase-source.ts`). Metal tty1 is
unit-tested via a mock ask-password adapter (empty refuse writes nothing;
typed passphrase → `metal-capable=yes`). Nix `ExecStart` calls that script
(`--stage`); no second shell implementation. In-guest wrong-passphrase is
phase 2b in `qemu-full-install-test.ts`
(`assertUefiKeyfileRestoreWrongPassphraseContract`) — same installed disk,
wrong fw_cfg, decrypt refusal, no write. Still hypervisor transport.
Harness-only until a `main` dispatch.

## Progress (2026-09-01, Riven — phase 2b ran)

In-guest refusal is proven on `main` dispatch
[33462406161](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33462406161)
(SHA `ed765bbed`, #15983 is an ancestor). Serial:
`UEFI keyfile restore wrong-passphrase contract ok (decrypt refused; no write; still fw_cfg / not metal)`
plus happy-path `wrote 1 creds`. Metal hardware runbook remains open — this
does not claim the hardware run happened.

## Plan

- **Non-zero write (CI-verifiable):** DONE 2026-08-28. Bake path + write-path
  contract landed in #15912; `main` dispatch run 33126215487 serial
  `wrote 1 creds`.
- **Wrong-passphrase / wrong-device refusal in-guest:** DONE 2026-09-01.
  Phase 2b harness in tree (#15983). Proven on `main` dispatch 33462406161
  serial `wrong-passphrase contract ok`. Still fw_cfg — not metal.
- **Metal `tty1`:** execute the hardware runbook in
  `docs/uefi-keyfile-restore-metal-path.md` §1 and land the captured evidence
  under `docs/hygiene-history/`. Software door is mock-tested and Nix-wired.

## Acceptance

- QEMU restore scenario asserts `wrote >= 1` on the bake path (green on a `main`
  dispatch). **Proven 2026-08-28** — run 33126215487, serial `wrote 1 creds`.
- In-guest wrong-passphrase refusal on a `main` restore dispatch (decrypt
  refused, no write, still fw_cfg). **Proven 2026-09-01** — run 33462406161.
- Metal runbook executed once with captured serial + wrong-passphrase refusal;
  evidence linked from the metal-path doc. **Open** (hardware-gated).
