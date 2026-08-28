// Falsifiers for the Paragon leftover remover's selection rule.
//
// The dangerous direction here is OVER-selection: this script runs as root and unlinks
// from /Library/LaunchAgents, so a predicate that matches one plist too many deletes
// somebody else's daemon. Every test below that asserts a match is paired with a NEGATIVE
// case, because "it selected the file I expected" is satisfied just as well by a predicate
// that selects everything.

import { describe, expect, test } from "bun:test";
import { paragonPlistsIn } from "./remove-paragon-leftovers.ts";

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
