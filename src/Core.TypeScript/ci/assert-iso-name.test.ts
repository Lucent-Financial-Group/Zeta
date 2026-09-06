// assert-iso-name.test.ts — falsifiers for the ISO-name check.
//
// The check exists because a `lib.mkForce` forced nothing for an unknown number of releases
// and the only signal was an `evaluation warning:` in a 3,500-line log. So these cases lean
// on the two ways THIS check could repeat that: passing over an absence, and reporting a
// failure so vague nobody knows which fix it wants.

import { describe, expect, test } from "bun:test";

import { judgeIsoNames, NIXPKGS_DEFAULT_PREFIX, REQUIRED_PREFIX } from "./assert-iso-name.ts";

describe("assert-iso-name", () => {
  test("PASSES on the name the tree chose", () => {
    const v = judgeIsoNames(["zeta-installer-25.11.iso"]);
    expect(v.ok).toBe(true);
    expect(v.message).toContain("zeta-installer-25.11.iso");
  });

  test("RED on the nixpkgs default, and the message names the option that went inert", () => {
    // This is the actual state of `main` before this change: the build shipped
    // `nixos-minimal-25.11.20260522.b77b3de-x86_64-linux.iso`.
    const v = judgeIsoNames(["nixos-minimal-25.11.20260522.b77b3de-x86_64-linux.iso"]);
    expect(v.ok).toBe(false);
    // A failure that only says "wrong name" sends the reader to the wrong file. This one
    // has to point at `image.fileName` and at the warning line that already said so.
    expect(v.message).toContain("image.fileName");
    expect(v.message).toContain("evaluation warning");
  });

  test("NO ISO IS A FAILURE, never a pass", () => {
    // The whole family of defect this check belongs to is "a check that ran over nothing
    // and reported success". An empty directory is exactly that input.
    expect(judgeIsoNames([]).ok).toBe(false);
    expect(judgeIsoNames(["result", "iso", "some-notes.txt"]).ok).toBe(false);
    expect(judgeIsoNames([]).message).toContain("not a pass");
  });

  test("TWO ISOs is a failure, and both are named", () => {
    // The ISO-locating steps already refuse on this; the refusal is duplicated here so a
    // caller that only runs this check still cannot be handed an ambiguous directory.
    const v = judgeIsoNames(["zeta-installer-25.11.iso", "zeta-installer-25.05.iso"]);
    expect(v.ok).toBe(false);
    expect(v.message).toContain("zeta-installer-25.05.iso");
    expect(v.message).toContain("zeta-installer-25.11.iso");
  });

  test("a THIRD name is distinguished from the nixpkgs default", () => {
    // "the option went inert again" and "somebody renamed the prefix" want different
    // fixes, so they get different messages rather than one generic 'wrong name'.
    const other = judgeIsoNames(["zeta-usb-25.11.iso"]);
    expect(other.ok).toBe(false);
    expect(other.message).toContain("neither");
    const dflt = judgeIsoNames([`${NIXPKGS_DEFAULT_PREFIX}25.11.iso`]);
    expect(dflt.message).not.toContain("neither");
    expect(dflt.message).toContain("NIXPKGS DEFAULT");
  });

  test("non-.iso files are ignored, so a digest manifest beside the ISO does not confuse it", () => {
    // The publishing steps write `.sha256` and a digest manifest into the same directory.
    const v = judgeIsoNames([`${REQUIRED_PREFIX}25.11.iso`, `${REQUIRED_PREFIX}25.11.iso.sha256`, "manifest.json"]);
    expect(v.ok).toBe(true);
  });
});
