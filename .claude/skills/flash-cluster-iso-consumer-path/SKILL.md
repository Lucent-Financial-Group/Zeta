---
name: flash-cluster-iso-consumer-path
description: Flash the Zeta AI-cluster installer ISO to a USB stick using the CONSUMER path — download a pre-built ISO from a CI workflow artifact + flash via zflash. No local Nix toolchain required. Use when the operator wants minimal local-toolchain dependency (just gh + bun + zflash) and is OK with the latest-CI-build version. For the dev path (local Nix build from source) see flash-cluster-iso-dev-path.
record_source: "skill-creator, B-0737 + B-0742 substrate"
load_datetime: "2026-05-25"
last_updated: "2026-05-25"
status: active
bp_rules_cited: [BP-NN — see .claude/rules/desktop-admin-consent-via-biometric-plus-small-challenge-i-execute-you-fingerprint.md]
---

# Flash Zeta AI-cluster installer ISO — CONSUMER path (CI-artifact download)

Capability skill. Procedure for the operator (or agent acting on operator's
behalf) who wants to flash the cluster installer ISO to a USB stick
WITHOUT building locally. Composes with B-0737 zflash + B-0742 reference
stack PoC + B-0728 destructive-tool authoring contract.

## When to use this skill

- Operator needs a fresh installer USB stick for a new cluster node
- Operator does NOT want to install the Determinate Systems Nix
  toolchain locally (or already has it but doesn't need to build)
- Operator is OK with the LATEST CI-built ISO version (vs a custom
  local build with WIP changes)
- Operator has a Mac with Touch ID-capable hardware + the zflash +
  zflash-setup substrate from B-0737

## When NOT to use this skill

- Operator wants to test WIP cluster substrate changes that haven't
  been pushed + CI-built yet → use flash-cluster-iso-dev-path
- Operator wants to verify determinism (build locally + compare SHA
  vs CI artifact) → use flash-cluster-iso-dev-path AND consumer-path
  both + compare
- Operator is on Linux or Windows → B-0738 (Linux variant scope) or
  B-0739 (Windows variant scope) — not yet shipped
- Operator does NOT have biometric hardware → zflash-setup falls
  back to password gate (still better than NOPASSWD); proceed but
  expect password prompt instead of Touch ID

## Prerequisites

- macOS (Touch ID-capable Mac recommended; substrate-honestly works
  on older Macs without biometric — falls back to password)
- `bun` installed (per `tools/setup/macos.sh`)
- `gh` (GitHub CLI) authenticated against the Zeta repo
- `zflash` + `zflash-setup` substrate from B-0737 merged on origin/main
- One-time setup already done: `bun full-ai-cluster/tools/zflash-setup.ts
  --install-alias` ran successfully + Touch ID PAM is installed
- USB stick (115 GiB - 256 GiB recommended; 124 GiB tested per the
  zflash sanity range)

## Procedure

### Step 1 — Find the latest successful build-ai-cluster-iso run

```bash
gh run list --workflow build-ai-cluster-iso.yml \
  --limit 5 \
  --json databaseId,conclusion,status,createdAt,headSha,headBranch
```

Pick the most-recent `"conclusion":"success"` on `"headBranch":"main"`.
Note its `databaseId`.

### Step 2 — Get artifact metadata

```bash
gh api repos/Lucent-Financial-Group/Zeta/actions/runs/<RUN_ID>/artifacts \
  --jq '.artifacts[] | {name, size_in_bytes, expires_at}'
```

Note the artifact `name` (e.g., `zeta-installer-24.11.iso`).

### Step 3 — Download to ~/Downloads/

```bash
gh run download <RUN_ID> --name "<ARTIFACT_NAME>" --dir ~/Downloads
ls -lh ~/Downloads/<ARTIFACT_NAME>
```

Should be ~1.7 GiB; matches the `size_in_bytes` from Step 2.

### Step 4 — Flash via zflash

Plug in the USB stick. Then:

```bash
zflash
```

(Or, if shell alias not installed: `bun full-ai-cluster/tools/zflash.ts`)

zflash auto-discovers the newest `~/Downloads/zeta-installer-*.iso`
(your just-downloaded one wins by mtime), runs all hardware sanity
rails, prints a per-run nonce, waits for `yes <4-hex>` consent token,
then unmounts + `sudo dd` triggers Touch ID PAM prompt + flashes.

**Operator effort**: ~5 chars (`zflash`) + ~8 chars (`yes <4-hex>`)
+ 1 fingerprint on the trackpad.

### Step 5 — Verify + boot

After "Flash complete":

- Unplug + replug the USB stick (zflash ejects automatically; re-mount
  to verify the EFI partition is present)
- `diskutil list external` should show a new partitioned + bootable
  device
- Move USB to the target machine + boot from it (BIOS/firmware
  setting: boot from USB first)
- On boot: drops to NixOS installer shell; run `zeta-install <hostname>`
  per the disko + bootstrap order in Addison's STARTING-POINT.md

## Common failure modes

| Symptom | Diagnosis | Resolution |
|---|---|---|
| `gh run download` says "no artifacts" | Workflow run too old (>90 days; artifact expired) | Pick a more recent successful run |
| zflash bails: "no Zeta installer ISO found under ~/Downloads/" | ISO not named `zeta-installer-*.iso` OR wrong dir | Rename file OR pass explicit path: `zflash <path/to/iso>` |
| zflash bails: "multiple USB devices found" | Two USB sticks plugged in | Unplug all but the target |
| zflash bails: "device is internal" | Selected `/dev/diskN` is internal SSD | Check `diskutil list external` — USB stick may not have enumerated as external |
| Touch ID prompt doesn't appear | PAM Touch ID not installed | Run `bun full-ai-cluster/tools/zflash-setup.ts` |
| `sudo dd` exit 1 | dd error mid-flash | Check disk + USB controller; partial flash may be on device; re-flash |

## Composes with

- B-0737 (zflash Mac variant — the tool this skill invokes)
- B-0742 (reference k8s stack as Ace PoC — the ISO IS the reference stack)
- B-0728 (destructive-tool authoring contract — flash-usb safety substrate)
- B-0743 (desktop admin consent pattern — Touch ID gate is the consent floor)
- `.claude/skills/flash-cluster-iso-dev-path/SKILL.md` — sibling skill for local-build path
- `.claude/rules/desktop-admin-consent-via-biometric-plus-small-challenge-i-execute-you-fingerprint.md` — the design pattern this skill instantiates
