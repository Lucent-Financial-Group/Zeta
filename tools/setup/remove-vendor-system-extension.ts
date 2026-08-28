#!/usr/bin/env bun
/**
 * remove-vendor-system-extension.ts — remove a third-party app whose only removal path is
 * manual, and let macOS retire its system extension the supported way.
 *
 * WRITTEN FOR: Insta360 Link Controller, which ships a CMIO camera system extension and
 * provides no vendor uninstaller (operator, 2026-08-28). Parameterised so the next
 * uninstaller-less vendor does not need a second script.
 *
 * THE ONE THING THIS DELIBERATELY WILL NOT DO
 * -------------------------------------------
 * It does NOT `rm` anything under `/Library/SystemExtensions/`. That directory is a
 * macOS-managed database keyed by UUID; deleting a payload by hand leaves the extension
 * registered but broken, which is strictly worse than leaving it installed — a removal
 * that makes the system less consistent, not more.
 *
 * The SUPPORTED retirement is: remove the owning application, then reboot. macOS notices
 * the owner is gone and deactivates the extension. This was observed working on this very
 * machine the same day: after Microsoft Defender was removed, `systemextensionsctl list`
 * showed its endpoint-security extension as `[terminated waiting to uninstall on reboot]`.
 *
 * `systemextensionsctl uninstall <teamID> <bundleID>` is attempted first because it is the
 * documented direct route, but for a third-party extension it requires SIP to be disabled.
 * When it fails, that is REPORTED, not worked around — the app-removal path is what
 * actually does the job.
 *
 * SAFETY — same shape as `remove-paragon-leftovers.ts`:
 *   - dry run by default; `--apply` is the operator's explicit decision
 *   - `--apply` refuses unless already root and never invokes `sudo` itself
 *   - reads back afterwards and reports what actually remains; the read-back is a
 *     measurement, not an assertion
 *   - prints every path it searched, so "nothing found" is distinguishable from a search
 *     that never ran
 */

import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface VendorTarget {
  readonly label: string;
  readonly teamId: string;
  readonly bundleId: string;
  /** Paths safe to remove outright. NEVER include /Library/SystemExtensions. */
  readonly paths: readonly string[];
}

export const INSTA360: VendorTarget = {
  label: "Insta360 Link Controller",
  teamId: "847R5ZLN8S",
  bundleId: "com.insta360.linkcontroller.camera-extension",
  paths: [
    "/Applications/Insta360 Link Controller.app",
    join(homedir(), "Library/Application Support/Insta360"),
  ],
};

/** Guard: a path under the macOS-managed extension store must never be removed by hand. */
export function isManagedByMacOs(path: string): boolean {
  return path.startsWith("/Library/SystemExtensions") || path.startsWith("/System/");
}

export function removablePaths(t: VendorTarget): readonly string[] {
  return t.paths.filter((p) => !isManagedByMacOs(p));
}

if (import.meta.main) {
  const apply = process.argv.includes("--apply");
  const t = INSTA360;

  console.log(`target: ${t.label}  (${t.bundleId})`);
  const candidates = removablePaths(t);
  const refused = t.paths.filter(isManagedByMacOs);
  for (const r of refused) console.log(`  REFUSED (macOS-managed, hand-deleting corrupts the DB): ${r}`);

  const present = candidates.filter((p) => existsSync(p));
  console.log(`searched ${String(candidates.length)} path(s); ${String(present.length)} present:`);
  for (const p of present) console.log(`  ${p}`);

  if (present.length === 0) {
    console.log("nothing to remove.");
  }

  if (!apply) {
    console.log("\nDRY RUN. To apply:");
    console.log("  sudo bun tools/setup/remove-vendor-system-extension.ts --apply");
    console.log("\nThen REBOOT. The camera extension retires on reboot once its app is gone;");
    console.log("that is the supported path, and it is the only one that leaves the");
    console.log("extension database consistent.");
    process.exit(0);
  }

  if (process.getuid?.() !== 0) {
    console.log("\n--apply requires root. This script does NOT call sudo itself; run:");
    console.log("  sudo bun tools/setup/remove-vendor-system-extension.ts --apply");
    process.exit(2);
  }

  // Documented direct route first. Expected to fail without SIP disabled — reported, not hidden.
  const un = Bun.spawnSync(["systemextensionsctl", "uninstall", t.teamId, t.bundleId]);
  const unOut = `${un.stdout.toString()}${un.stderr.toString()}`.trim();
  console.log(`\nsystemextensionsctl uninstall -> exit ${String(un.exitCode)}`);
  if (unOut) console.log(`  ${unOut.split("\n")[0]}`);
  if (un.exitCode !== 0) {
    console.log("  (expected without SIP disabled; the app-removal path below is what retires it)");
  }

  for (const p of present) {
    try {
      rmSync(p, { recursive: true, force: true });
      console.log(`  removed ${p}`);
    } catch (err) {
      console.log(`  FAILED ${p}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const after = candidates.filter((p) => existsSync(p));
  if (after.length > 0) {
    console.log(`\nSTILL PRESENT (${String(after.length)}):`);
    for (const p of after) console.log(`  ${p}`);
    process.exit(1);
  }
  console.log("\nverified: all removable paths are gone.");
  console.log("REBOOT to let macOS retire the system extension.");
}
