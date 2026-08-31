# Trajectory - USB / zflash Installer

Status: active — shipped + iterating; first surfaced as a trajectory 2026-05-29 from substrate inventory (the flashing mechanism works on `origin/main`; this surface was missing, so the workstream lived head-only)
Last refreshed: 2026-08-28
Type: workstream (current-focus) — a trajectory the operator is _actively powering_. Many trajectories can be tracked; only a few are workstreams at once (finite-focus / WIP-bounded — a workstream is a trajectory under sustained thrust, and thrust budget is finite, so most trajectories coast). (Genus = "trajectory"; "workstream" is the species: a trajectory under sustained thrust toward a deliverable, vs. emergent-posture trajectories like `anti-infection`. See [`factory-trajectory-surface`](../factory-trajectory-surface/RESUME.md) for the genus/species taxonomy.) One of the operator's three current cluster workstreams (encryption / usb-zflash / ts-workflow-engine).
Eventual encoding (design-stage — the human maintainer 2026-05-23 genetic-ID substrate + Clifford/HKT): this trajectory's state is trackable as a 128-bit genetic-ID seed (discrete, reversible via parser-combinator ↔ generator-function) → Clifford-space path (continuous, eventual). Mirrors the three-lane I8-lattice / I9-manifold split.
Current blocker: hardware — metal S6 first-login + WiFi radio / Touch ID / TPM
(human-gated). Software restore is **proven**: `main` workflow_dispatch
[33126215487](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33126215487)
on SHA `034544150` serial `zeta-creds-restore: wrote 1 creds` after picker
`--bake-cred x1` ([#15912](https://github.com/Lucent-Financial-Group/Zeta/pull/15912)).
Sibling dispatch QEMU steps already use
`if: always() && github.event_name == 'workflow_dispatch'` — they do **not**
skip when restore is red. Do not re-litigate that P1 or re-dispatch restore
as if `--defer-all` were still the live hang.
2026-08-18: `zflash` ISO acquisition is now architecture-aware (`--iso-arch`,
default x86_64). Before this a run carrying both the x86_64 and aarch64 ISOs
was resolved by `readdirSync` order — a coin flip whose only symptom was "no
bootable device" after a full flash-and-walk-to-the-box cycle, and whose
untagged cache name made a wrong pick win every later auto-discovery. Closes
known-unknown #2 of the first-metal preflight; that runbook no longer asks the
operator to hand-download and hand-rename an ISO.
**2026-08-31 — THE LANE ITSELF WAS RED FOR 38 HOURS, and "restore is proven"
did not notice.** `build-ai-cluster-iso` failed on every `main` push from
`f4c1f5dca` (2026-08-30T02:48) to `7c1857530` (2026-08-31T17:12) — scenario 2,
first-boot provisioning. Cause: **`mise --version` SEGFAULTED on NixOS first
boot** (mise 2026.8.14, from "run mise 2026.8.14 everywhere" #16186). Under
`set -e` the failed command substitution killed `install.sh` with **rc=139**,
three attempts, and the node came up partially provisioned — `bun: command not
found` downstream, so nothing needing a runtime could run.

Reverted to the last-known-good **2026.6.12** across all five declarations in
[#16200](https://github.com/Lucent-Financial-Group/Zeta/pull/16200). Two
hypotheses were refuted by measurement first, not argument: both release tarballs
have **identical** `PT_INTERP`, `DT_NEEDED` and max `GLIBC_2.18`, so it is
neither a missing library nor a glibc floor. The runtime cause is unidentified
and 2026.8.14 works fine on macOS — **re-attempting the bump is welcome**, and
now it will produce a diagnosis in one run.

WHY IT TOOK 38 HOURS, which is the reusable part: the probe read
`mise --version 2>/dev/null`. A SIGSEGV prints nothing to stdout, the redirect
ate stderr, and the serial log recorded **not one character** of explanation —
"apt packages up to date", then the retry. The harness's own `081KZETP6AT` diag
block prints _"install.sh error lines"_, and a signal death produces none, so it
emitted an empty block between its two markers. #16200 makes `rc >= 128` report
the signal by name; a version probe that cannot say _"the binary crashed"_
reports a crash as an empty version string.

**Read the old claims with that in mind.** "Software restore is proven" was true
of the restore step and simultaneously the lane could not boot a node. A green
claim about one step is not a claim about the lane.

**Session handoff (2026-08-28):** restore is closed on software. Do not
re-open [#14852](https://github.com/Lucent-Financial-Group/Zeta/pull/14852)
`--defer-all` as the live hang — that hang was pre-`--defer-all` on
[run 32724820159](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/32724820159).
After `--defer-all` + bake-cred (#15912), restore wrote 1 cred on
[run 33126215487](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33126215487).
The 2026-08-24 handoff
([`docs/handoffs/2026-08-24-riven-usb-zflash-qemu-restore-next.md`](../../handoffs/2026-08-24-riven-usb-zflash-qemu-restore-next.md))
is historical. Next software slice is in-guest wrong-passphrase (phase 2b
on the same installed disk) + hexagonal passphrase port so metal tty1 is
unit-testable; then a human hardware run of the metal-path runbook.
Not a Cloud VM metal proof.

Next concrete action: **minimize metal** — S6 physical first-login +
WiFi radio / Touch ID / TPM (human-gated). Software deepen landed:
per-federation threat-model stub + optional QEMU UEFI menu-boot smoke
(`qemu-uefi-menu-smoke.ts`) + UEFI keyfile ESP persist planner
(`uefi-keyfile-esp.ts`) + USB iSerial sysfs probe (`usb-iserial-probe.ts`;
not default `usbUuid` binding). Persist picker now forwards
`--usb-iserial` / `--uefi-keyfile` the same way persist/restore already
did. QEMU USB boot argv now carries `serial=ZETA-QEMU-001` (guest
sysfs; host probe stays injectable). Guest installer 6.95d prints the
sysfs probe report to the serial log and writes `--serial-file` on
success. Default persist remains FAT UUID. `ZETA_BIND_USB_ISERIAL=1`
forwards `--usb-iserial` to the picker only when the probe succeeded.
Persist writes `zeta-creds.factor` next to the blob; restore reads it
and `/etc/zeta/usb-iserial` with no UUID fallback. `ZETA_BIND_UEFI_KEYFILE=1`
writes `/mnt/boot/EFI/ZETA/keyfile` and restores from `/boot/EFI/ZETA/keyfile`
(fail closed; no UUID fallback; not copied to `/etc`). The two opt-ins
are mutually exclusive. Opt-in
`QEMU_USB_ISERIAL_PHASE1=1` asserts probe markers **and**
persist-default UUID; ISO/cdrom does not. Opt-in
`QEMU_UEFI_KEYFILE_PHASE1=1` (dedicated; not implied by wifi/iSerial)
bakes `/zeta-bind-uefi-keyfile` and asserts the **install-time** keyfile
write. It does **not** prove picker bind. Opt-in
`QEMU_UEFI_KEYFILE_PICKER=1` (dedicated; not implied by PHASE1) also
bakes `/zeta-qemu-creds-passphrase` so 6.95-picker binds the blob to the
keyfile (restore-decrypt precondition; not phase-2 decrypt). Opt-in
`QEMU_UEFI_KEYFILE_RESTORE=1` (dedicated; not implied by PICKER) injects
the QEMU test passphrase via `-fw_cfg file=` on disk boot and asserts
restore decrypt against the keyfile. The secret is not copied onto the
installed ESP. Default
wifi/iSerial phase-1 must not bake that marker or the passphrase file.
Not on `gate (required)`.
See `docs/security/USB-IDENTITY-THREAT-MODEL.md` <!-- STALE-REF: ../../security/USB-IDENTITY-THREAT-MODEL.md -->:
traveler → cluster → federation → ISociety/CTM, self-similar.
Cluster/federation glossary promoted (`docs/SEED-VOCABULARY.md` +
`docs/GLOSSARY.md` §Society identity). Credential binding model tests
landed (`credential-binding-model.ts`). Multiboot scaffold + hermetic
planner + FAT assemble + EFI embed path landed
(`src/Core.TypeScript/installer/multiboot/` — `--plan` / `--assemble`
/`--grub-efi`). Real GRUB EFI binary comes from nix/`grub-mkimage` (not
vendored). QEMU UEFI menu-boot smoke is optional CI
(`qemu-uefi-menu-smoke.ts`).
**Physical boot** only when ready
for residual hardware (S6 feel, radio associate, Touch ID / TPM). Paper/mock
S6 flow accepted 2026-07-08 (GitHub → local → done; skip-gh continue
later via local/SSH). Longer-term (not blocking S6): desktop app UI
over NixOS, then microkernel UI; `gh` is temporary foothold — successor
is Zeta IdP and ZetaDB/DagFs as git backend/client. See
[S6-UX-PLACEHOLDER.md](./S6-UX-PLACEHOLDER.md). Slice 5 CODEOWNERS when
teams confirmed; system mise pinned via Nix overlay (same release as
`tools/setup/linux.sh`).

## Why This Exists

The "usb/zflash" workstream is the **flashing mechanism** for getting NixOS
onto cluster hardware: the USB NixOS installer + the `zflash` tool (Touch ID +
random nonce + SSH-key auto-inject + control-plane/worker role-picker). It is
the sibling of `cluster-encryption-credential-substrate` (which owns _what_
secrets get injected); this trajectory owns _how the bits get onto the metal
and boot into a joinable node_.

**Deeper purpose — self-healing hardware (the human maintainer 2026-05-29):**
the USB is not only first-install; it is the _self-healing repair_ mechanism for
the local accelerator cluster. A human's only job is to plug in the USB — any
failed node in the K8s / GPU-accelerator cluster re-images, re-joins, and
re-credentials itself. This gives Zeta **local + free-cloud both**: the
self-healing local accelerator cluster (owned metal, GPU compute, sovereignty)
composing with the free GitHub-Actions cloud swarm (081KSNY2Z0008QG0R003X1QWYG, zero-marginal-cost
because open-source). The workflow engine
(`ts-workflow-engine-du-state-machine` trajectory) is portable across both
substrates; usb/zflash keeps the local one alive with minimal human-in-the-loop
(physical-only — plug in the USB, everything else automated).

## Grounding (on `origin/main`)

Shipped artifacts:

- `src/Core.TypeScript/zflash/cli.ts` <!-- STALE-REF: ../../../src/Core.TypeScript/zflash/cli.ts --> — the flashing tool (Touch ID + nonce + SSH auto-inject)
- `full-ai-cluster/usb-nixos-installer/` <!-- STALE-REF: ../../../full-ai-cluster/usb-nixos-installer/ --> — the installer ISO substrate + first-boot role-picker
- `.claude/skills/flash-cluster-iso/SKILL.md` <!-- STALE-REF: ../../../.claude/skills/flash-cluster-iso/SKILL.md --> — operator + agent-driven (expect) flashing skill

Grounding backlog:

- `081KSGS9H0008QG0R001EZKNCB` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R001EZKNCB-zflash-agent-mode-native-implementation-close-doc-vs-impleme.md --> — zflash agent-mode native implementation (**closed** — `--agent` in `cli.ts`)
- Workitem `081KV1PY2H308QG0R00347547K` — `zeta flash` MCP router (**done** #8104)
- `081KSGS9H0008QG0R0011BC7T2` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R0011BC7T2-ci-cascade-6-full-install-plus-cluster-auto-join-eliminate-r.md --> — CI cascade-6: slices 1–3 landed (#8126, #8129, #8139); scenarios 1 + 2 hard gate (scenario 2 green run 27602908527 after #8478 initrd virtio)
- `081KSGS9H0008QG0R00120EEHM` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R00120EEHM-installer-config-bugs-cluster-hostname-not-unique-gh-auth-not-respected-banner-password-disclosure-empirical-aaron-2026-05-26.md --> — installer config bugs (hostname-not-unique, gh-auth, banner)
- `081KSGS9H0008QG0R003V23XNZ` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R003V23XNZ-iter5-wifi-credentials-injection-via-usb-esp-for-zero-typing-cluster-bringup-without-ethernet-load-bearing-for-homelab-persona-aaron-2026-05-26.md --> — iter-5 WiFi-credentials injection via USB ESP (zero-typing bringup without ethernet)
- `081KSGS9H0008QG0R002T3BJ2R` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R002T3BJ2R-iter4-ssh-key-and-hashedpassword-substrate-for-cluster-bringup-2026-05-26.md --> — iter-4 SSH-key + hashedPassword substrate (shared seam with encryption)

## Composes with

- `cluster-encryption-credential-substrate` trajectory — shares the 081KSGS9H0008QG0R002T3BJ2R / 081KSKBP80008QG0R003AX2A69 creds-on-USB seam
- 081KSGS9H0008QG0R003X5Y2A5 (installer WiFi reproducibility / nixos.org timeouts / cachix mirror) + 081KSGS9H0008QG0R001Q2DH2H (installer nmtui WiFi rescan) — physical-hardware-tested WiFi hardening (verify on-disk; cite once row paths confirmed)

## Current Rule

The happy path is zero-typing: flash with zflash, boot, pick role, join. Every
manual step at the physical machine is debt — drive it toward the 081KSGS9H0008QG0R0011BC7T2 CI
full-install path so a human never has to babysit a USB stick for a routine
bringup.

## Current Next Action

**Software (closed, do not re-litigate):** non-interactive 6.95-picker
(`--defer-all` #14852) and restore non-zero write (#15912, dispatch
33126215487). Sibling dispatch steps already `if: always()`.
**Next software:** in-guest wrong-passphrase phase 2b + passphrase
hexagonal port (`passphrase-source.ts`) so a human can run the metal
tty1 runbook without the software door being untested. Dispatch restore
on idle `main` after that lands. **Post-login:**
[FIRST-SESSION.md](./FIRST-SESSION.md) slices 1–4 landed; S6 paper/mock
accepted (physical boot still human-gated). Slice 5 CODEOWNERS when teams
are confirmed.

- ESP hostname + credential injection now has QEMU-testable planning/serial-marker assertions; WiFi radio association remains physical-gated, but a future ESP WiFi blob can reuse the same write-plan + serial-marker pattern.

## Society validation (not PR-centric)

Per `docs/BUILD-GATES.md` <!-- STALE-REF: ../../BUILD-GATES.md -->: local `preflight` before push; peer replay; CI is signal. Tiers S0–S6 in FIRST-SESSION.md. Full QEMU cascade = society cadence, not per-edit tax.
