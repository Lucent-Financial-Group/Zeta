---
id: 081M1VP8G1M087G0R001GYHWMA
type: bug
state: backlog
priority: P2
slug: isoimage-isoname-is-a-renamed-option-so-the-installer-iso-sh
title: "isoImage.isoName is a renamed option, so the installer ISO ships as nixos-minimal-*.iso"
created: 2026-09-06T15:44:13.876Z
depends_on: []
composes_with: []
---

# isoImage.isoName is a renamed option, so the installer ISO ships as nixos-minimal-*.iso

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1VP8G1M087G0R001GYHWMA-*.md` glob. -->

Found 2026-09-06 while reading the QEMU boot logs Aaron asked to see, on run for PR #16798.

## The measurement

`full-ai-cluster/usb-nixos-installer/nixos/installer/configuration.nix:404`

```nix
isoName = lib.mkForce "zeta-installer-${config.system.nixos.release}.iso";
```

**nixpkgs renamed `isoImage.isoName` to `image.fileName`.** CI says so out loud, three times
per x86_64 run:

```
evaluation warning: The option `isoImage.isoName' defined in
`.../full-ai-cluster/usb-nixos-installer/nixos/installer/configuration.nix'
has been renamed to `image.fileName'
```

So the ISOs ship under the nixpkgs default name, on both arches:

```
nixos-minimal-25.11.20260522.b77b3de-x86_64-linux.iso
nixos-minimal-25.11.20260522.b77b3de-aarch64-linux.iso
```

**A `lib.mkForce` that forces nothing.** `mkForce` is the strongest statement the module
system offers — it exists to win arguments — and here it wins an argument about an option
nothing reads.

## What is NOT wrong, checked before filing

The image itself is correct. `networking.hostName = "zeta-installer"` (line 20) *is* live,
and the x86_64 boot proves it end to end: `Outcome: BOOTED`, `Furthest boot stage: login`,
`Elapsed: 24s (budget 300s)` — reaching the `zeta-installer login:` prompt the harness waits
for. **Only the filename is inert.**

## Why nothing caught it

`qemu-boot-test`'s ISO discovery accepts either name:

```sh
find result/iso -maxdepth 1 -type f \( -name 'zeta-installer-*.iso' -o -name 'nixos-minimal-*.iso' \)
```

That fallback is what keeps the lane green — and it is also what makes the defect invisible.
The `-o 'nixos-minimal-*'` arm was presumably added because the ISO *was* arriving under that
name, which is the fix-the-symptom move: the finder learned to accept the wrong name instead
of anyone asking why the right one was not applied.

## Why it matters, beyond tidiness

1. **Every artifact this repo publishes is named `nixos-minimal-*`** — uploaded ISO, digest
   manifest, `.sha256`. A downloader cannot tell a Zeta installer from a stock NixOS minimal
   image by its name, and the digest manifests are keyed on that name.
2. **It is a live example of the class this repo audits hardest**: configuration that is
   present, well-formed, passes every check, and is not in effect. The seaweedfs auth bug
   (`081M1FG1RCW087G0R000TAZWJX`) is the same sentence about a different option.
3. **The warning has been printed on every run and read by nobody.** It is not hidden; it is
   three lines of `evaluation warning:` in a 3,500-line log.

## The fix, and the falsifier it needs

Rename the option to `image.fileName`. That is one line.

**The falsifier is the part worth insisting on**, because renaming it back is exactly the
change that would silently rot again the next time nixpkgs moves an option: assert that the
built ISO's filename STARTS WITH `zeta-installer-`. The ISO-locating step already refuses on
"Multiple installer ISOs"; it should also refuse on a name the tree did not choose. Once that
exists, the `-o 'nixos-minimal-*'` fallback in the two `find` calls can go, and the finder
stops accepting the wrong answer.

## Done when

The published ISOs are named `zeta-installer-*.iso`, a check fails if they are not, and the
`nixos-minimal-*` fallback is gone from both `find` invocations.

