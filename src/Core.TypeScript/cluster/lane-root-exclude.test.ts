/**
 * lane-root-exclude.test.ts — a lane's ArgoCD exclude glob must ALSO carry the
 * standing deferrals.
 *
 * WHY THIS FILE EXISTS.
 *
 * `laneRootExclude` emits the `directory.exclude` glob that would scope a root
 * Application to one lane. It listed a lane's NON-MEMBERS and nothing else,
 * which is the obvious half and silently wrong: the nine directories in
 * `DEFAULT_ROOT_DEV_CATALOG.excludeGlob` are deferred from EVERY CI cluster for
 * named reasons, and they are not lane-scoped.
 *
 * Measured on the current partition: `platform` is a member of lane-1. On the
 * non-member glob, a lane-1 bring-up would sync the one Application whose
 * images live in ghcr.io behind a token CI may not hold — failing for a reason
 * that has nothing to do with the lane, in a job whose whole purpose is to
 * attribute failures to lanes.
 *
 * Nothing could have caught it: the function had no consumer, so no run ever
 * exercised the glob it produced. These assertions are the consumer until the
 * bring-up is wired.
 */

import { describe, expect, test } from "bun:test";
import { buildModel, laneRootExclude, packLanes } from "./lane-partition.ts";
import { DEFAULT_ROOT_DEV_CATALOG, excludeGlobDirs } from "./ports.ts";

function globEntries(glob: string): readonly string[] {
  return glob
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const model = buildModel({ rung: "dev" });
const partition = packLanes(model);

describe("a lane's exclude glob unions the standing deferrals", () => {
  test("the partition produced lanes at all — an empty one would make every assertion vacuous", () => {
    expect(partition.lanes.length).toBeGreaterThan(0);
  });

  for (const lane of partition.lanes) {
    test(`${lane.id}: every standing deferral is excluded`, () => {
      const entries = new Set(globEntries(laneRootExclude(model, lane)));
      for (const dir of excludeGlobDirs(DEFAULT_ROOT_DEV_CATALOG.excludeGlob)) {
        expect(entries.has(`${dir}/Application.yaml`)).toBe(true);
      }
    });

    test(`${lane.id}: every non-member is excluded`, () => {
      const entries = new Set(globEntries(laneRootExclude(model, lane)));
      const members = new Set(lane.members);
      for (const row of model.roster) {
        if (!members.has(row.name)) expect(entries.has(`${row.dir}/Application.yaml`)).toBe(true);
      }
    });

    test(`${lane.id}: members that are NOT deferred survive — the glob does not exclude everything`, () => {
      const entries = new Set(globEntries(laneRootExclude(model, lane)));
      const deferred = new Set(excludeGlobDirs(DEFAULT_ROOT_DEV_CATALOG.excludeGlob));
      const surviving = model.roster.filter(
        (r) => lane.members.includes(r.name) && !deferred.has(r.dir) && !entries.has(`${r.dir}/Application.yaml`),
      );
      // A glob that excluded every Application would satisfy both tests above
      // and scope the lane to nothing. This is the guard against that.
      expect(surviving.length).toBeGreaterThan(0);
    });

    test(`${lane.id}: no duplicate entries`, () => {
      const entries = globEntries(laneRootExclude(model, lane));
      expect(entries.length).toBe(new Set(entries).size);
    });
  }

  test("platform specifically — the measured instance that motivated this", () => {
    const laneWithPlatform = partition.lanes.find((l) => l.members.includes("platform"));
    if (laneWithPlatform === undefined) return; // partition moved; the general tests still bind
    const entries = new Set(globEntries(laneRootExclude(model, laneWithPlatform)));
    expect(entries.has("platform/Application.yaml")).toBe(true);
  });
});

describe("excludeGlobDirs is the one parser", () => {
  test("parses the shipped glob to bare directory names", () => {
    const dirs = excludeGlobDirs(DEFAULT_ROOT_DEV_CATALOG.excludeGlob);
    expect(dirs).toContain("platform");
    expect(dirs).toContain("cilium-lb-ipam");
    for (const d of dirs) expect(d).not.toContain("*");
  });

  test("an empty or brace-only glob yields nothing rather than one empty entry", () => {
    expect(excludeGlobDirs("{}")).toEqual([]);
    expect(excludeGlobDirs("")).toEqual([]);
  });
});
