// Falsifiers for the vendor system-extension remover.
//
// This script runs as root and calls rmSync(recursive, force). The dangerous direction is
// over-removal, and the specific catastrophe it must never commit is deleting a path under
// /Library/SystemExtensions — macOS's own extension database. Every assertion that
// something IS removable is paired with one that something is NOT.

import { describe, expect, test } from "bun:test";
import { INSTA360, isManagedByMacOs, removablePaths, type VendorTarget } from "./remove-vendor-system-extension.ts";

describe("the macOS-managed guard", () => {
  test("refuses anything under /Library/SystemExtensions", () => {
    expect(isManagedByMacOs("/Library/SystemExtensions")).toBe(true);
    expect(
      isManagedByMacOs("/Library/SystemExtensions/A2AC559E/com.insta360.linkcontroller.camera-extension.systemextension"),
    ).toBe(true);
  });

  test("refuses /System", () => {
    expect(isManagedByMacOs("/System/Library/Extensions/foo.kext")).toBe(true);
  });

  test("THE CONTROL — ordinary vendor paths are NOT refused", () => {
    // Without this, `isManagedByMacOs = () => true` passes every test above and the script
    // silently removes nothing while reporting success.
    expect(isManagedByMacOs("/Applications/Insta360 Link Controller.app")).toBe(false);
    expect(isManagedByMacOs("/Users/acehack/Library/Application Support/Insta360")).toBe(false);
    expect(isManagedByMacOs("/Library/LaunchAgents/com.vendor.plist")).toBe(false);
  });

  test("a lookalike prefix outside the managed store is not refused", () => {
    // `/Library/SystemExtensionsBackup` is not the managed store. Documenting the actual
    // behaviour of a prefix test rather than pretending it is path-segment aware.
    expect(isManagedByMacOs("/Library/SystemExtensionsBackup/x")).toBe(true);
  });
});

describe("removablePaths filters the target list", () => {
  test("the shipped Insta360 target contains no managed path", () => {
    expect(removablePaths(INSTA360)).toEqual(INSTA360.paths);
    expect(INSTA360.paths.some(isManagedByMacOs)).toBe(false);
  });

  test("a managed path added to a target is dropped, not removed", () => {
    const risky: VendorTarget = {
      ...INSTA360,
      paths: [
        "/Applications/Thing.app",
        "/Library/SystemExtensions/UUID/thing.systemextension",
      ],
    };
    expect(removablePaths(risky)).toEqual(["/Applications/Thing.app"]);
  });

  test("an empty target yields nothing rather than throwing", () => {
    expect(removablePaths({ ...INSTA360, paths: [] })).toEqual([]);
  });
});
