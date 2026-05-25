---
name: flash-cluster-iso-dev-path
description: Flash the Zeta AI-cluster installer ISO to a USB stick using the DEV path — build the ISO LOCALLY from the Nix flake at full-ai-cluster/flake.nix + flash via zflash. Requires Determinate Systems Nix locally. Use when the operator wants to test WIP cluster substrate changes (not yet pushed/CI-built) OR validate determinism (compare local-build SHA vs CI-build SHA). For the consumer path (CI-artifact download; no local Nix) see flash-cluster-iso-consumer-path.
record_source: "skill-creator, B-0737 + B-0740 + B-0742 substrate"
load_datetime: "2026-05-25"
last_updated: "2026-05-25"
status: active
bp_rules_cited: [BP-NN — see .claude/rules/desktop-admin-consent-via-biometric-plus-small-challenge-i-execute-you-fingerprint.md]
---

# Flash Zeta AI-cluster installer ISO — DEV path (local Nix build)

Capability skill. Procedure for the operator (or agent acting on operator's
behalf) who wants to BUILD the cluster installer ISO LOCALLY from the
Nix flake + flash. Composes with B-0737 zflash + B-0740 (DeterminateSystems
Nix as the build-time-deps anchor) + B-0742 reference stack PoC +
B-0728 destructive-tool authoring contract.

## When to use this skill

- Operator is iterating on cluster substrate (`full-ai-cluster/`
  files) + wants to test WIP changes before pushing
- Operator wants to validate determinism: build locally + compare
  SHA256 vs a CI-built artifact (consumer-path skill provides the
  CI side; this is the empirical anchor for the B-0742 "reliable
  AI control + determinism" claim)
- Operator wants substrate-honest reproducibility: same flake.lock
  input → same ISO output bytes; locally-verifiable
- Operator is doing substrate-engineering work that touches the
  `full-ai-cluster/` substrate + needs same-day feedback (vs waiting
  for CI)

## When NOT to use this skill

- Operator just wants the LATEST shipping ISO → flash-cluster-iso-consumer-path
- Operator does NOT have local Nix toolchain installed → install via
  the DeterminateSystems installer first (see B-0740 Gap 1 anchor),
  OR fall back to consumer-path
- Operator is on Linux/Windows → B-0738 / B-0739 (variant scopes; not
  yet shipped)
- Operator is on a low-resource Mac that can't handle a Nix build
  (~3-15 min cold; ~1-3 min warm; needs ~10 GB free disk for the
  Nix store) → use consumer-path

## Prerequisites

- macOS (per zflash; Touch ID-capable Mac recommended)
- `bun` installed (per `tools/setup/macos.sh`)
- **DeterminateSystems Nix installer** ran locally (per B-0740 Gap 1
  anchor — Determinate Systems' installer is the canonical Mac Nix
  install path; CI uses `DeterminateSystems/nix-installer-action`
  for parity); install URL: <https://determinate.systems/posts/determinate-nix-installer/>
- `zflash` + `zflash-setup` substrate from B-0737 merged on origin/main
- One-time zflash setup already done: `bun full-ai-cluster/tools/zflash-setup.ts
  --install-alias` ran successfully + Touch ID PAM installed
- USB stick (115 GiB - 256 GiB recommended)
- Working tree on a Zeta branch (typically `main` for stable builds;
  may be a feature branch for WIP testing)

## Procedure

### Step 1 — Verify Nix is available

```bash
nix --version  # should show recent Nix; Determinate Systems ships v2.x
nix flake metadata full-ai-cluster --json --no-write-lock-file \
  | jq '{description, lastModified, revision}'
```

If `nix` not found, install via the Determinate Systems installer FIRST
(see Prerequisites). If first-run, expect Nix to take a few minutes to
initialize substrate.

### Step 2 — Build the ISO locally

```bash
cd full-ai-cluster
nix build .#installer-iso --print-out-paths
```

(Adjust output name if the flake exposes `iso` or another attr instead
of `installer-iso`; check `nix flake show .` to inventory available
outputs.)

First build: ~10-15 min (cold Nix substrate; downloads base packages).
Subsequent builds with unchanged inputs: ~1-3 min (warm; cache hits).
Output ISO lands at `./result/iso/zeta-installer-<version>.iso` (or
similar; the exact path is in `nix build`'s `--print-out-paths`).

### Step 3 — Compute SHA256 + copy to ~/Downloads/

```bash
ISO_PATH="$(ls -t ./result/iso/zeta-installer-*.iso | head -1)"
shasum -a 256 "$ISO_PATH"
cp "$ISO_PATH" ~/Downloads/zeta-installer-dev-build-$(date +%Y%m%d%H%M%S).iso
```

The SHA256 is the empirical anchor for determinism testing. Compare
against the CI-built ISO's SHA256 (from consumer-path Step 4) — they
SHOULD match if the flake.lock + build environment are identical.
Substrate-honest expectation: small divergence is possible if Nix
substrate (e.g., installer scripts, timestamps) leak into the build;
exact-byte match validates the flake's reproducibility.

### Step 4 — Flash via zflash

Plug in the USB stick. Then:

```bash
zflash
```

(Or, if shell alias not installed: `bun full-ai-cluster/tools/zflash.ts`)

zflash auto-discovers the newest `~/Downloads/zeta-installer-*.iso`
— your local-build wins by mtime over any older CI download. All
hardware sanity rails fire; per-run nonce printed; `yes <4-hex>`
consent token + Touch ID PAM prompt; flash proceeds.

**Operator effort**: ~5 chars (`zflash`) plus ~8 chars (`yes <4-hex>`) plus 1 fingerprint on the trackpad.

### Step 5 (optional) — Determinism cross-check

If validating B-0742's "reliable AI control + determinism" claim:

```bash
# Local-build SHA (from Step 3):
shasum -a 256 ~/Downloads/zeta-installer-dev-build-*.iso

# CI-build SHA (download via consumer-path Step 3, then):
shasum -a 256 ~/Downloads/zeta-installer-24.11.iso

# Compare. Substrate-honest expectations:
# - EXACT match: flake is fully deterministic; ship it
# - Mismatch but functionally-equivalent (boots same; same OS state):
#   investigate which substrate-input leaks (timestamps, locale, etc.)
# - Functional mismatch: flake has nondeterminism bug; substrate-engineering
#   work required
```

Document findings in `docs/research/2026-XX-XX-reference-stack-determinism-poc.md`
per B-0742 Scope item 4.

### Step 6 — Verify + boot

Same as consumer-path Step 5.

## Common failure modes

| Symptom | Diagnosis | Resolution |
|---|---|---|
| `nix: command not found` | DeterminateSystems Nix not installed | Install via <https://determinate.systems/posts/determinate-nix-installer/> |
| `nix build` fails: "evaluating flake" error | Flake syntax issue OR missing input | `nix flake check full-ai-cluster --no-write-lock-file` to inventory issues |
| `nix build` fails: "out of disk space" | Nix store grew too large | `nix store gc` to garbage-collect; needs ~10 GB free |
| Build succeeds but `./result/iso/` is empty | Flake output name mismatch | `nix flake show .` to inventory available outputs |
| Local SHA ≠ CI SHA | Substrate input divergence (timestamp / locale / Nix substrate version) | Investigate; document in determinism-PoC research doc per B-0742 |
| zflash auto-discovery picks wrong ISO | Older CI ISO has newer mtime than local build (unlikely; possible if `cp -p` preserved old timestamps) | Pass explicit path: `zflash ~/Downloads/zeta-installer-dev-build-*.iso` |

## Composes with

- B-0737 (zflash Mac variant — the flash tool this skill invokes)
- B-0740 (Determinate Systems Nix anchor — the build-time-deps Gap 1 entry)
- B-0742 (reference k8s stack as Ace PoC — the ISO IS the reference stack;
  this skill enables the local-build leg of the determinism PoC)
- B-0728 (destructive-tool authoring contract — flash-usb safety substrate)
- B-0743 (desktop admin consent pattern — Touch ID gate is the consent floor)
- `.claude/skills/flash-cluster-iso-consumer-path/SKILL.md` — sibling skill for CI-artifact path
- `.github/workflows/build-ai-cluster-iso.yml` — the CI workflow that produces the comparison artifact

## Why both skills exist

Per the B-0742 reference-stack-as-Ace-PoC substrate: validating "reliable
AI control over all the package managers, deterministically + declaratively"
requires demonstrating BOTH paths produce equivalent results. The
consumer-path proves the CI substrate works for downstream operators;
the dev-path proves local reproducibility + the determinism floor.
Together they establish the empirical anchor for the broader Ace
distribution claim (B-0288 + B-0247 + the OPERATOR-SELF-CLAIMED
trajectory).

Per `.claude/rules/default-to-both.md`: consumer AND dev paths are
both first-class; not either-or; operator picks per scope.
