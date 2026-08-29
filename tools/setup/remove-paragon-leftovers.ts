#!/usr/bin/env bun
/**
 * remove-paragon-leftovers.ts — delete the LaunchAgent plists Paragon's own
 * uninstallers leave behind.
 *
 * WHY THIS IS A COMMITTED SCRIPT AND NOT A SUDO ONE-LINER. Privileged operations here are
 * reviewable, testable, open-source-readable code — never an ad-hoc `sudo rm` typed into a
 * shell where nobody can audit what ran. Same discipline and same shape as
 * `defender-exclusions.ts` and `touchid-sudo.ts`.
 *
 * WHAT IT IS FOR. Paragon NTFS/ExtFS for Mac were uninstalled with the vendor uninstallers
 * (operator, 2026-08-28). Those uninstallers left two LaunchAgents behind:
 *
 *   /Library/LaunchAgents/com.paragon-software.ntfs.notification-agent.plist
 *   /Library/LaunchAgents/com.paragon-software.extfs.notification-agent.plist
 *
 * Both were observed in `launchctl list` with exit status 78 — the exit code for a job
 * whose executable is gone. They are inert leftovers, but they are also noise in exactly
 * the surface being examined for the machine's crash investigation, so they should go.
 *
 * SCOPE. LaunchAgent/LaunchDaemon plists matching the Paragon bundle-id prefix, the
 * `/Library/PreferencePanes/Paragon*.prefPane` panes, and the `/Applications` bundles whose
 * CFBundleIdentifier is Paragon's (all widened 2026-08-28 — see below).
 *
 * WHAT IT STILL DOES NOT COVER, and cannot. After a reboot on 2026-08-28 the
 * `FSMenuAppLoginItemHelper` jobs came back, and `launchctl print` showed them as
 * "submitted by smd" — they are SMAppService / Background Task Management registrations,
 * not plists, and `sfltool dumpbtm` confirms they point at `/Applications/NTFS for Mac.app`
 * which no longer exists. Stale BTM entries for a deleted app are removed through
 * System Settings > General > Login Items & Extensions, or they age out; the only CLI lever
 * is `sfltool resetbtm`, which wipes EVERY application's background items and is far too
 * broad to run for one vendor. Deliberately not attempted here. It does NOT touch kexts, `/Library/Filesystems`, or applications — at the
 * time of writing there are none (`kmutil showloaded --no-kernel-components` reports zero
 * non-Apple kexts). If that changes, widening this is a reviewed diff, not a surprise.
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. It prints what it would remove and exits 0. `--apply` is the
 *     operator's explicit decision.
 *   - It does NOT invoke `sudo` itself. Under `--apply` it REFUSES unless already root, so
 *     the privilege boundary is crossed by the operator, visibly, not by this file.
 *   - It BOOTS OUT each agent before unlinking, so a running job does not outlive its plist.
 *   - It READS BACK afterwards and reports what is actually gone. The read-back is a
 *     measurement, not an assertion: if a file survives, that is printed and the exit is
 *     non-zero.
 *   - An empty match set is reported as "nothing to do" and exits 0 — but it prints the
 *     directories it searched, so a zero result can be told apart from a search that never
 *     ran.
 */

import { existsSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const AGENT_DIRS = ["/Library/LaunchAgents", "/Library/LaunchDaemons"] as const;
const PREFIX = "com.paragon-software.";

/**
 * WIDENED 2026-08-28 after a reboot showed the plists were not the whole story.
 * `/Library/PreferencePanes/Paragon*.prefPane` survived the vendor uninstaller too. The
 * original scope note said widening this "is a reviewed diff, not a surprise" — this is
 * that diff.
 */
const PREFPANE_DIR = "/Library/PreferencePanes";
const PREFPANE_PREFIX = "Paragon";

/**
 * THE APPS THEMSELVES — added 2026-08-28, and the reason is a mistake worth recording.
 *
 * The vendor uninstaller removed the kexts and helpers but LEFT THE APPLICATIONS. They were
 * missed for hours because a search for `/Applications/*aragon*` returned nothing: the
 * products are named by FUNCTION, not by vendor — `NTFS for Mac.app`, `extFS for Mac.app`.
 * Absence of the vendor's NAME is not absence of the vendor's SOFTWARE.
 *
 * So these are matched by BUNDLE IDENTIFIER, never by filename. A name is a label anyone may
 * choose; `CFBundleIdentifier` is what the system itself uses to decide a login item belongs
 * to this app. Matching on it is both stricter (a third-party app that happens to be called
 * "NTFS for Mac" is untouched) and more complete (a Paragon app under any name is found).
 *
 * This is also what makes the login items stop returning. They are SMAppService
 * registrations owned BY THE APPS — unchecking them in System Settings disables them, but
 * while the apps exist they can re-register. Removing the app is the durable fix.
 */
const APP_DIR = "/Applications";
const APP_BUNDLE_PREFIX = "com.paragon-software.";

export function paragonPlistsIn(dir: string, entries: readonly string[]): readonly string[] {
  return entries.filter((e) => e.startsWith(PREFIX) && e.endsWith(".plist")).map((e) => join(dir, e));
}

/**
 * Select application bundles by CFBundleIdentifier.
 *
 * `readBundleId` is injected so the rule is a pure function testable without a filesystem.
 * Shelling out to `defaults` inside the filter would make the one security-relevant decision
 * in this file untestable — and this decision runs as root against `rmSync(recursive)`.
 */
export function paragonAppsIn(
  dir: string,
  entries: readonly string[],
  readBundleId: (path: string) => string | null,
): readonly string[] {
  return entries
    .filter((e) => e.endsWith(".app"))
    .map((e) => join(dir, e))
    .filter((p) => (readBundleId(p) ?? "").startsWith(APP_BUNDLE_PREFIX));
}

/** Preference panes are named by product (`ParagonNTFS.prefPane`), not by bundle id. */
export function paragonPrefPanesIn(dir: string, entries: readonly string[]): readonly string[] {
  return entries.filter((e) => e.startsWith(PREFPANE_PREFIX) && e.endsWith(".prefPane")).map((e) => join(dir, e));
}

/** Read an app bundle's CFBundleIdentifier; `null` when it cannot be determined. */
function bundleIdOf(appPath: string): string | null {
  const r = Bun.spawnSync(["defaults", "read", join(appPath, "Contents", "Info"), "CFBundleIdentifier"]);
  if (r.exitCode !== 0) return null;
  const id = r.stdout.toString().trim();
  return id === "" ? null : id;
}

function findTargets(): { readonly searched: string[]; readonly found: string[] } {
  const searched: string[] = [];
  const found: string[] = [];
  for (const dir of AGENT_DIRS) {
    if (!existsSync(dir)) continue;
    searched.push(dir);
    try {
      found.push(...paragonPlistsIn(dir, readdirSync(dir)));
    } catch {
      console.log(`  ! could not read ${dir}`);
    }
  }
  if (existsSync(APP_DIR)) {
    searched.push(APP_DIR);
    try {
      found.push(...paragonAppsIn(APP_DIR, readdirSync(APP_DIR), bundleIdOf));
    } catch {
      console.log(`  ! could not read ${APP_DIR}`);
    }
  }
  if (existsSync(PREFPANE_DIR)) {
    searched.push(PREFPANE_DIR);
    try {
      found.push(...paragonPrefPanesIn(PREFPANE_DIR, readdirSync(PREFPANE_DIR)));
    } catch {
      // Unreadable directory is reported, never silently treated as empty — an absent
      // result and an unreadable one are different answers.
      console.log(`  ! could not read ${PREFPANE_DIR}`);
    }
  }
  return { searched, found };
}

if (import.meta.main) {
  const apply = process.argv.includes("--apply");
  const { searched, found } = findTargets();

  console.log(`searched: ${searched.join(", ") || "(none present)"}`);
  if (found.length === 0) {
    console.log("nothing to do — no Paragon plists or preference panes found.");
    process.exit(0);
  }
  console.log(`found ${String(found.length)} Paragon leftover(s):`);
  for (const f of found) console.log(`  ${f}`);

  if (!apply) {
    console.log("\nDRY RUN. Re-run as root with --apply to remove them:");
    console.log("  sudo bun tools/setup/remove-paragon-leftovers.ts --apply");
    process.exit(0);
  }

  if (process.getuid?.() !== 0) {
    console.log("\n--apply requires root. This script deliberately does NOT call sudo itself;");
    console.log("run it under sudo so the privilege boundary is crossed by you, visibly:");
    console.log("  sudo bun tools/setup/remove-paragon-leftovers.ts --apply");
    process.exit(2);
  }

  for (const f of found) {
    if (f.endsWith(".app")) {
      // Quit anything running FROM this bundle first — an app deleted out from under a live
      // helper leaves the helper running against a path that no longer exists.
      Bun.spawnSync(["pkill", "-f", f], { stdout: "ignore", stderr: "ignore" });
      try {
        rmSync(f, { recursive: true, force: true });
        console.log(`  removed ${f}`);
      } catch (err) {
        console.log(`  FAILED to remove ${f}: ${err instanceof Error ? err.message : String(err)}`);
      }
      continue;
    }
    if (f.endsWith(".prefPane")) {
      try {
        rmSync(f, { recursive: true, force: true });
        console.log(`  removed ${f}`);
      } catch (err) {
        console.log(`  FAILED to remove ${f}: ${err instanceof Error ? err.message : String(err)}`);
      }
      continue;
    }
    const label = f.split("/").pop()?.replace(/\.plist$/, "") ?? f;
    // Boot out first: a plist unlinked under a running job leaves the job loaded.
    Bun.spawnSync(["launchctl", "bootout", `system/${label}`], { stdout: "ignore", stderr: "ignore" });
    try {
      unlinkSync(f);
      // Printed on SUCCESS too, not only on failure. Without this the run reported
      // "found 6" and then four `removed` lines, which reads as two silent failures — the
      // read-back was the only thing saying otherwise. A per-item log that is silent on the
      // common path makes its own summary look wrong.
      console.log(`  removed ${f}`);
    } catch (err) {
      console.log(`  FAILED to unlink ${f}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // READ BACK — a measurement, not a claim.
  const after = findTargets().found;
  if (after.length === 0) {
    console.log("\nverified: no Paragon plists, preference panes, or applications remain.");
    process.exit(0);
  }
  console.log(`\nSTILL PRESENT (${String(after.length)}):`);
  for (const f of after) console.log(`  ${f}`);
  process.exit(1);
}
