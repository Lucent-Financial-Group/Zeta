// Falsifiers for the Paragon leftover remover's selection rule.
//
// The dangerous direction here is OVER-selection: this script runs as root and unlinks
// from /Library/LaunchAgents, so a predicate that matches one plist too many deletes
// somebody else's daemon. Every test below that asserts a match is paired with a NEGATIVE
// case, because "it selected the file I expected" is satisfied just as well by a predicate
// that selects everything.

import { describe, expect, test } from "bun:test";
import { paragonAppsIn, paragonPlistsIn, paragonPrefPanesIn } from "./remove-paragon-leftovers.ts";

const DIR = "/Library/LaunchAgents";

describe("selection is exactly the Paragon plists", () => {
  test("picks the two real leftovers", () => {
    const got = paragonPlistsIn(DIR, [
      "com.paragon-software.ntfs.notification-agent.plist",
      "com.paragon-software.extfs.notification-agent.plist",
    ]);
    expect(got).toEqual([
      `${DIR}/com.paragon-software.ntfs.notification-agent.plist`,
      `${DIR}/com.paragon-software.extfs.notification-agent.plist`,
    ]);
  });

  test("THE CONTROL — it does not select anything else in that directory", () => {
    // Without this, a predicate of `() => true` passes the test above. These are real
    // neighbours of the target files on this machine.
    const got = paragonPlistsIn(DIR, [
      "com.apple.something.plist",
      "com.microsoft.wdav.plist",
      "com.zeta.forensics.snapshot.plist",
      "com.openssh.ssh-agent.plist",
    ]);
    expect(got).toEqual([]);
  });

  test("a lookalike vendor prefix is NOT matched — the dot boundary is load-bearing", () => {
    // `com.paragon-softwareX.` must not match; without the trailing dot in the prefix it would.
    expect(paragonPlistsIn(DIR, ["com.paragon-softwareX.agent.plist"])).toEqual([]);
    expect(paragonPlistsIn(DIR, ["paragon-software.agent.plist"])).toEqual([]);
    expect(paragonPlistsIn(DIR, ["not-com.paragon-software.agent.plist"])).toEqual([]);
  });

  test("non-plist Paragon files are left alone", () => {
    // The script's remit is launchd jobs. A stray receipt or log is not its business.
    expect(paragonPlistsIn(DIR, ["com.paragon-software.ntfs.log"])).toEqual([]);
    expect(paragonPlistsIn(DIR, ["com.paragon-software.plist.bak"])).toEqual([]);
  });

  test("an empty directory yields nothing rather than throwing", () => {
    expect(paragonPlistsIn(DIR, [])).toEqual([]);
  });
});

describe("preference panes — the surface the reboot revealed", () => {
  const PP = "/Library/PreferencePanes";

  test("picks the two Paragon panes", () => {
    expect(paragonPrefPanesIn(PP, ["ParagonNTFS.prefPane", "ParagonExtFS.prefPane"])).toEqual([
      `${PP}/ParagonNTFS.prefPane`,
      `${PP}/ParagonExtFS.prefPane`,
    ]);
  });

  test("THE CONTROL — other vendors' panes are untouched", () => {
    // This directory is shared by every vendor on the machine, and the script runs as root
    // with rmSync(recursive). Over-selection here deletes someone else's preference pane.
    expect(
      paragonPrefPanesIn(PP, ["Flash Player.prefPane", "MySQL.prefPane", "Tuxera NTFS.prefPane"]),
    ).toEqual([]);
  });

  test("non-prefPane files starting with Paragon are left alone", () => {
    expect(paragonPrefPanesIn(PP, ["ParagonNTFS.txt", "Paragon.log", "ParagonNTFS"])).toEqual([]);
  });

  test("the plist matcher does NOT pick up prefPanes, and vice versa", () => {
    // The two selectors use different rules (bundle-id prefix vs product-name prefix).
    // Crossing them would either miss the panes or double-count them.
    expect(paragonPlistsIn(PP, ["ParagonNTFS.prefPane"])).toEqual([]);
    expect(paragonPrefPanesIn("/Library/LaunchAgents", ["com.paragon-software.ntfs.notification-agent.plist"])).toEqual([]);
  });
});

describe("application bundles — matched by bundle id, never by name", () => {
  const APPS = "/Applications";
  // The real machine: neither product carries the vendor's name. A filename-based selector
  // reports them absent, which is exactly what happened for hours on 2026-08-28.
  const realIds: Record<string, string> = {
    "/Applications/NTFS for Mac.app": "com.paragon-software.ntfs.fsapp",
    "/Applications/extFS for Mac.app": "com.paragon-software.extfs.fsapp",
    "/Applications/Safari.app": "com.apple.Safari",
    "/Applications/Docker.app": "com.docker.docker",
  };
  const reader = (p: string): string | null => realIds[p] ?? null;

  test("finds Paragon apps whose NAME contains no vendor string", () => {
    const got = paragonAppsIn(APPS, ["NTFS for Mac.app", "extFS for Mac.app", "Safari.app"], reader);
    expect(got).toEqual(["/Applications/NTFS for Mac.app", "/Applications/extFS for Mac.app"]);
  });

  test("THE CONTROL — other vendors' apps are never selected", () => {
    // Runs as root with rmSync(recursive) against /Applications. Over-selection here deletes
    // someone's software. Without this, a match-everything filter passes the test above.
    expect(paragonAppsIn(APPS, ["Safari.app", "Docker.app"], reader)).toEqual([]);
  });

  test("a NON-Paragon app merely NAMED like one is not selected", () => {
    // The inverse of the bug that hid the real apps: trusting the name in either direction.
    const impostor = (p: string): string | null =>
      p.endsWith("NTFS for Mac.app") ? "com.tuxera.ntfs" : null;
    expect(paragonAppsIn(APPS, ["NTFS for Mac.app"], impostor)).toEqual([]);
  });

  test("an unreadable Info.plist yields no match rather than a guess", () => {
    // `null` means "could not determine". Treating unknown as a match would delete on a
    // failed read, which is the worst possible direction for a root-level rmSync.
    expect(paragonAppsIn(APPS, ["Mystery.app"], () => null)).toEqual([]);
  });

  test("non-.app entries in /Applications are ignored", () => {
    expect(paragonAppsIn(APPS, ["Utilities", "readme.txt"], reader)).toEqual([]);
  });
});
