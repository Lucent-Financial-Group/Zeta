#!/usr/bin/env bun
// assert-iso-name.ts — the built ISO carries the name this repo chose.
//
// -- THE DEFECT THIS CLOSES (081M1VP8G1M087G0R001GYHWMA) -------------------
// `configuration.nix` set `isoImage.isoName = lib.mkForce "zeta-installer-<release>.iso"`.
// nixpkgs had renamed that option to `image.fileName`, so the strongest statement the
// module system offers -- `mkForce`, which exists to win arguments -- won an argument
// about an option nothing reads. Every ISO this repo published shipped as
// `nixos-minimal-<release>-<arch>.iso`, the nixpkgs default.
//
// The image was never wrong. `networking.hostName = "zeta-installer"` was live the whole
// time, and the x86_64 boot reaches `zeta-installer login:` in 24s. ONLY THE NAME was --
// which is the quiet kind of defect: an artifact whose filename cannot distinguish it from
// stock NixOS, and digest manifests keyed on that name.
//
// -- WHY A CHECK AND NOT JUST THE RENAME -----------------------------------
// The rename is one line and it restores today's name. It does nothing about the mechanism
// that lost it: an option moved upstream, the module kept the old spelling, and the only
// signal was three lines of `evaluation warning:` in a 3,500-line CI log that nobody read.
// That will happen again -- nixpkgs renames options every release -- and the next time it
// should FAIL rather than rot.
//
// Two things kept it invisible, and both are addressed:
//   1. no assertion on the name  -> this file
//   2. `qemu-boot-test`'s ISO discovery accepted `nixos-minimal-*.iso` as a FALLBACK, so
//      the lane stayed green over the wrong name. The finder had learned to accept the
//      wrong answer instead of anyone asking why the right one was not applied. That arm
//      is removed in the same change.
//
// -- WHAT IT CHECKS --------------------------------------------------------
//   1. Exactly one ISO under the directory (the ISO-locating steps already refuse on
//      "Multiple installer ISOs"; this makes the same refusal available earlier).
//   2. Its basename starts with `zeta-installer-`.
//   3. It does NOT start with `nixos-minimal-` -- named separately from (2) so the failure
//      message can say WHICH way it went wrong, since "the option is inert again" and
//      "somebody renamed the prefix" want different fixes.
//
// Run:  bun src/Core.TypeScript/ci/assert-iso-name.ts <dir>

import { readdirSync } from "node:fs";

export const REQUIRED_PREFIX = "zeta-installer-";
export const NIXPKGS_DEFAULT_PREFIX = "nixos-minimal-";

export interface Verdict {
  readonly ok: boolean;
  readonly message: string;
}

/**
 * Judge the ISO basenames found in a directory.
 *
 * PURE, so the falsifiers do not need a built ISO -- the whole point of this check is that
 * it runs where the expensive thing already ran, and its own tests must not.
 */
export function judgeIsoNames(names: readonly string[]): Verdict {
  const isos = names.filter((n) => n.endsWith(".iso")).slice().sort();
  if (isos.length === 0) {
    return { ok: false, message: "no .iso found — nothing to name-check, which is not a pass" };
  }
  if (isos.length > 1) {
    return { ok: false, message: `expected exactly one .iso, found ${String(isos.length)}: ${isos.join(", ")}` };
  }
  const iso = isos[0] ?? "";
  if (iso.startsWith(REQUIRED_PREFIX)) {
    return { ok: true, message: `${iso} carries the name this repo chose` };
  }
  if (iso.startsWith(NIXPKGS_DEFAULT_PREFIX)) {
    return {
      ok: false,
      message:
        `${iso} is the NIXPKGS DEFAULT name. The tree asks for \`${REQUIRED_PREFIX}*\` via ` +
        `\`image.fileName\` in usb-nixos-installer/nixos/installer/configuration.nix, so that ` +
        `setting is not reaching the build — most likely the option was renamed upstream again. ` +
        `Check the \`evaluation warning:\` lines in the flake output; that is where the last one said so.`,
    };
  }
  return {
    ok: false,
    message: `${iso} starts with neither \`${REQUIRED_PREFIX}\` nor \`${NIXPKGS_DEFAULT_PREFIX}\` — an unexpected third name`,
  };
}

function main(): void {
  const dir = Bun.argv[2];
  if (dir === undefined) {
    console.error("usage: bun src/Core.TypeScript/ci/assert-iso-name.ts <dir>");
    process.exit(2);
  }
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (error) {
    // REFUSES rather than passing over a directory it could not read. "No ISO here" and
    // "I could not look" are different answers and only one of them is about the ISO.
    console.error(`[assert-iso-name] ✗ cannot read ${dir}: ${String(error)}`);
    process.exit(1);
  }
  const verdict = judgeIsoNames(names);
  if (verdict.ok) {
    console.log(`[assert-iso-name] ${verdict.message}`);
    return;
  }
  console.error(`[assert-iso-name] ✗ ${verdict.message}`);
  process.exit(1);
}

if (import.meta.main) main();
