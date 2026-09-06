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

## 2026-09-06, same day — THIS IS A DUPLICATE, and the original had the answer

`docs/backlog/P2/081KSGS9H0008QG0R00033DT02-investigate-isoname-mkforce-not-sticking-on-nixpkgs-25-11-aa.md`
was filed **2026-05-26**, at Aaron's ask, with the same finding and a better diagnosis. I
wrote *"the warning has been printed on every run and read by nobody"* — someone read it,
diagnosed it, filed it, and fix-forwarded the workflow to accept both names. That is the
second time today I have called something undiscovered that was already on file.

**And the original was right where I was wrong.** It predicted *"the unified `image.baseName`
option likely now drives the ISO filename via a new code path that bypasses ... the legacy
`isoImage.isoName`"*, and named `image.baseName` as candidate fix #1.

I had started fixing this as `image.fileName` — the option the rename warning names. Measured
before shipping:

```
image.fileName             = zeta-installer-25.11.iso        <- the option reads back correct
system.build.isoImage.name = nixos-minimal-25.11...-x86_64-linux.iso   <- the artifact does not
```

**`isoImage.isoName` and `image.fileName` BOTH evaluate to our value** — nixpkgs aliases the
old spelling — while only `image.baseName` reaches the derivation. That alias is the whole
reason this hid: reading the option back says "fixed". A fix validated by evaluating the
option rather than the artifact would have shipped, silenced the warning, and changed nothing.

**Superseded by the fix under `081KSGS9H0008QG0R00033DT02`.** This entry is kept, rather than
deleted, as the record of the near-miss: the check that closes it asserts the ARTIFACT, and
this is why.

