// Falsifiers for the preservation-namespace audit.
//
// The failure this guards is subtle: every offending path was created by an agent acting in
// good faith mid-rescue. So the tests are built from the REAL divergence found on
// 2026-08-28, plus the near-misses that must NOT trip it — a guard that fires on
// `.github/actions/apt-archive-cache` would be turned off within a day, and then the actual
// class returns unguarded.

import { describe, expect, test } from "bun:test";
import { auditPaths, GRANDFATHERED, offendingRoot, SANCTIONED } from "./audit-preservation-namespaces.ts";

describe("it refuses a NEW preservation root", () => {
  test("an invented root is caught", () => {
    expect(offendingRoot("docs/my-rescue-2026-09-01/thing.md")).toBe("docs/my-rescue-2026-09-01");
    expect(offendingRoot("docs/salvage/x.md")).toBe("docs/salvage");
    expect(offendingRoot("docs/backup-2026-09/x.md")).toBe("docs/backup-2026-09");
  });

  test("the divergence found in the wild would have been caught", () => {
    // These are the real ones; they are grandfathered now, but the predicate must be able
    // to see them or the grandfather list is doing all the work and the check is inert.
    expect(offendingRoot("docs/pr-preservation/x.md")).toBeNull(); // grandfathered
    const withoutGrandfather = "docs/pr-preservation-v2/x.md";
    expect(offendingRoot(withoutGrandfather)).toBe("docs/pr-preservation-v2");
  });
});

describe("THE CONTROLS — it must not fire on these", () => {
  test("the sanctioned root passes", () => {
    expect(offendingRoot("docs/recovered/2026-08-28-src-orphans/a/b.md")).toBeNull();
  });

  test("every grandfathered root passes", () => {
    for (const g of GRANDFATHERED) expect(offendingRoot(`${g}/x.md`)).toBeNull();
  });

  test("paths merely CONTAINING a preservation word are untouched", () => {
    // A guard that fires on these gets disabled, and then the real class returns unguarded.
    expect(offendingRoot(".github/actions/apt-archive-cache/action.yml")).toBeNull();
    expect(offendingRoot("memory/feedback_aaron_channel_verbatim_preservation_2026_04_29.md")).toBeNull();
    expect(offendingRoot("workitems/081M00GCA8P-heartbeat-archive-backfill.md")).toBeNull();
    expect(offendingRoot("src/Core.TypeScript/hygiene/audit-shard-name-integrity.ts")).toBeNull();
  });

  test("ordinary docs paths pass", () => {
    expect(offendingRoot("docs/research/2026-08-28-a-thing.md")).toBeNull();
    expect(offendingRoot("docs/design/x.md")).toBeNull();
  });

  test("a single-segment path does not crash", () => {
    expect(offendingRoot("README.md")).toBeNull();
    expect(offendingRoot("")).toBeNull();
  });
});

describe("the batch surface", () => {
  test("offending roots are deduped and sorted", () => {
    expect(
      auditPaths(["docs/salvage/a.md", "docs/salvage/b.md", "docs/rescue-x/c.md", "docs/recovered/ok.md"]),
    ).toEqual(["docs/rescue-x", "docs/salvage"]);
  });

  test("THE CONTROL — a clean corpus yields nothing", () => {
    // Without this, a predicate returning a root for EVERYTHING satisfies the tests above.
    expect(auditPaths(["docs/recovered/a.md", "src/x.ts", "README.md", ...GRANDFATHERED.map((g) => `${g}/y.md`)])).toEqual([]);
  });

  test("the sanctioned list is not empty — an empty one would make everything an offender", () => {
    expect(SANCTIONED.length).toBeGreaterThan(0);
  });
});
