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
 * SCOPE. LaunchAgent/LaunchDaemon plists matching the Paragon bundle-id prefix, and
 * nothing else. It does NOT touch kexts, `/Library/Filesystems`, or applications — at the
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

import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const AGENT_DIRS = ["/Library/LaunchAgents", "/Library/LaunchDaemons"] as const;
const PREFIX = "com.paragon-software.";

export function paragonPlistsIn(dir: string, entries: readonly string[]): readonly string[] {
  return entries.filter((e) => e.startsWith(PREFIX) && e.endsWith(".plist")).map((e) => join(dir, e));
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
      // Unreadable directory is reported, never silently treated as empty — an absent
      // result and an unreadable one are different answers.
      console.log(`  ! could not read ${dir}`);
    }
  }
  return { searched, found };
}

if (import.meta.main) {
  const apply = process.argv.includes("--apply");
  const { searched, found } = findTargets();

  console.log(`searched: ${searched.join(", ") || "(none present)"}`);
  if (found.length === 0) {
    console.log("nothing to do — no Paragon LaunchAgent/LaunchDaemon plists found.");
    process.exit(0);
  }
  console.log(`found ${String(found.length)} Paragon plist(s):`);
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
    const label = f.split("/").pop()?.replace(/\.plist$/, "") ?? f;
    // Boot out first: a plist unlinked under a running job leaves the job loaded.
    Bun.spawnSync(["launchctl", "bootout", `system/${label}`], { stdout: "ignore", stderr: "ignore" });
    try {
      unlinkSync(f);
    } catch (err) {
      console.log(`  FAILED to unlink ${f}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // READ BACK — a measurement, not a claim.
  const after = findTargets().found;
  if (after.length === 0) {
    console.log("\nverified: no Paragon plists remain.");
    process.exit(0);
  }
  console.log(`\nSTILL PRESENT (${String(after.length)}):`);
  for (const f of after) console.log(`  ${f}`);
  process.exit(1);
}
