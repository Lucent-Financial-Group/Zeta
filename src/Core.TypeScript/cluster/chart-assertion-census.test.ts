#!/usr/bin/env bun
/**
 * Falsifiers for `chart-assertion-census.ts`.
 *
 * The census exists to say what an assertion CANNOT catch, so the first thing to
 * establish is that the census itself can fail. Every negative test below mutates
 * a row and expects a named refusal; the CONTROLS establish that the real tree
 * produces none, without which an always-failing implementation would satisfy all
 * of them.
 *
 * The measured facts these pin, from 2026-09-09:
 *   - `deepseek-coder` and `qwen-coder` are asserted `Synced+Healthy` and every
 *     committed resource is a kind ArgoCD gives no health verdict;
 *   - nine directories are applied by no lane;
 *   - ZERO charts have a post-deploy functional assertion.
 */
import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import {
  census,
  censusFailures,
  committedKinds,
  FUNCTIONAL_ASSERTIONS,
  healthVerdict,
  HEALTHY_BY_VACUITY,
  HEALTH_BEARING_KINDS,
  NEVER_APPLIED_COVERAGE,
  renderMarkdown,
  summarise,
  tierOfApplied,
  type CensusRow,
} from "./chart-assertion-census.ts";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** A row shaped for one refusal at a time. */
function row(over: Partial<CensusRow>): CensusRow {
  const base: CensusRow = {
    dir: "example",
    tier: "full",
    healthBearing: 1,
    healthBlind: 0,
    resourcesInTree: true,
    coveredBy: null,
    functional: null,
  };
  return { ...base, ...over };
}

describe("chart assertion census", () => {
  test("CONTROL: the real tree is accounted for -- must SURVIVE the mutations", () => {
    expect(censusFailures(census(REPO_ROOT))).toEqual([]);
  });

  test("CONTROL: the census is non-empty and every tier is represented", () => {
    const rows = census(REPO_ROOT);
    expect(rows.length).toBeGreaterThan(40);
    const tiers = new Set(rows.map((r) => r.tier));
    expect(tiers.has("full")).toBe(true);
    expect(tiers.has("not-applied")).toBe(true);
  });

  test("THE FINDING: zero charts carry a post-deploy functional assertion", () => {
    // Written to go RED the moment the first one lands, which is the point: this
    // is a measurement of the gap, not a rule that it must stay open. Whoever
    // closes it updates this number and gets to say which chart moved.
    expect(FUNCTIONAL_ASSERTIONS.size).toBe(0);
  });

  test("MUTATION: a never-applied chart with no coverage entry is refused", () => {
    const one = row({
      dir: "unregistered",
      tier: "not-applied",
    });
    const failures = censusFailures([one]);
    expect(failures.join(" ")).toContain("belongs to no job");
  });

  test("MUTATION: a health-blind chart asserted Synced+Healthy is refused", () => {
    const one = row({
      dir: "blind-and-asserted",
      healthBearing: 0,
      healthBlind: 3,
    });
    const failures = censusFailures([one]);
    expect(failures.join(" ")).toContain("the Healthy half carries no information");
  });

  test("MUTATION: a coverage entry for a chart a lane now applies is refused as STALE", () => {
    const one = row({
      dir: "longhorn",
      tier: "full",
    });
    const failures = censusFailures([one]);
    expect(failures.join(" ")).toContain("is STALE");
  });

  test("MUTATION: an EMPTY census is refused", () => {
    const failures = censusFailures([]);
    expect(failures.join(" ")).toContain("a check that cannot fail");
  });

  test("the vacuity column never claims coverage it cannot establish", () => {
    const helm = row({
      resourcesInTree: false,
      healthBearing: 0,
    });
    expect(healthVerdict(helm)).toBe("helm-unknown");
    const blind = row({
      healthBearing: 0,
      healthBlind: 2,
    });
    expect(healthVerdict(blind)).toBe(HEALTHY_BY_VACUITY);
    expect(healthVerdict(blind)).toContain("nothing exists that could be unhealthy");
    expect(healthVerdict(row({}))).toBe("reconciliation-only");
  });

  test("tierOfApplied ranks manual-sync and excluded below the full contract", () => {
    expect(tierOfApplied(undefined)).toBe("applied-unasserted");
    const manual = { manualSync: true, excludedFromDev: false };
    expect(tierOfApplied(manual)).toBe("manual-sync");
    const excluded = { manualSync: false, excludedFromDev: true };
    expect(tierOfApplied(excluded)).toBe("applied-unasserted");
    const plain = { manualSync: false, excludedFromDev: false };
    expect(tierOfApplied(plain)).toBe("full");
  });

  test("MEASURED: hat-system is overwhelmingly health-blind, which is why it hid a defect", () => {
    const kinds = committedKinds(REPO_ROOT, "hat-system");
    const bearing = kinds.filter((k) => HEALTH_BEARING_KINDS.has(k));
    expect(kinds.length).toBeGreaterThan(20);
    expect(bearing.length * 5).toBeLessThan(kinds.length);
  });

  test("the rendered table and summary both name the functional gap", () => {
    const rows = census(REPO_ROOT);
    expect(renderMarkdown(rows)).toContain("functional assertion");
    expect(summarise(rows)).toContain("0 with a POST-DEPLOY FUNCTIONAL assertion");
    expect(summarise(rows)).toContain("healthy-by-vacuity");
  });
});

/**
 * -- THE MODEL-INFO CHARTS ---------------------------------------------------
 * Aaron 2026-09-09, on `deepseek-coder` and `qwen-coder`: "what's special about
 * those charts rather than the way we have our multi harness summoner and our own
 * custom harness both of which can use ollama and others?"
 *
 * The measured answer is "nothing", and these pin the two halves of it so the
 * disposition cannot rot into folklore: the ConfigMaps have no consumer, and the
 * harness reads the same pair from somewhere else.
 */
describe("the model-info charts", () => {
  test("MEASURED: both are healthy-by-vacuity, and both are asserted anyway", () => {
    const rows = census(REPO_ROOT);
    for (const dir of ["deepseek-coder", "qwen-coder"]) {
      const found = rows.find((r) => r.dir === dir);
      if (found === undefined) throw new Error("missing row: " + dir);
      expect(found.tier).toBe("full");
      expect(found.healthBearing).toBe(0);
      expect(healthVerdict(found)).toBe(HEALTHY_BY_VACUITY);
    }
  });

  test("MEASURED: every committed resource is a ConfigMap or a Namespace", () => {
    const kinds = new Set<string>();
    for (const dir of ["deepseek-coder", "qwen-coder"]) {
      for (const k of committedKinds(REPO_ROOT, dir)) kinds.add(k);
    }
    // No Deployment, no StatefulSet, no Service, no image: nothing RUNS here.
    expect([...kinds].sort()).toEqual(["ConfigMap", "Namespace"]);
  });
});

/**
 * -- THE BRANCH NOTHING ASSERTED -------------------------------------------
 * `NEVER_APPLIED_COVERAGE` was IMPORTED into this file and never used. A review
 * flagged it as an unused import, and the flag was right -- but "delete the
 * import" would have been the wrong fix, because the import was not decoration:
 * `censusFailures` carries a THIRD refusal on each registry -- "it names a
 * directory the tree no longer has" -- and only two of the three were ever
 * tested. The import was added for an assertion that never got written.
 *
 * That is a small instance of exactly what this census exists to find: a refusal
 * that is present, reads as coverage, and is falsified by nothing. So the import
 * is USED rather than removed, and the branch gets its falsifier.
 *
 * The `FUNCTIONAL_ASSERTIONS` half could not be reached at all while that map is
 * empty by design, which is why `censusFailures` now takes both registries as
 * injectable parameters -- see its docstring.
 */
describe("the orphan branch", () => {
  test("MUTATION: a coverage entry naming a directory the tree no longer has is refused", () => {
    // DERIVED from the real registry, never a hardcoded name: this test must
    // follow the registry if its contents change.
    const registered = [...NEVER_APPLIED_COVERAGE.keys()];
    expect(registered.length).toBeGreaterThan(0);
    const gone = registered[0];
    if (gone === undefined) throw new Error("registry is empty");
    // A census whose rows omit the registered dir == the dir was deleted.
    const other = row({
      dir: "some-other-chart",
    });
    const failures = censusFailures([other]);
    expect(failures.join(" ")).toContain(gone + ": NEVER_APPLIED_COVERAGE names a directory");
  });

  test("MUTATION: the same refusal on FUNCTIONAL_ASSERTIONS -- reachable only by injection", () => {
    // The real map is empty by design, so this branch could never fire against
    // it. Injecting one is what makes the refusal falsifiable rather than merely
    // written down -- which is the whole subject of this file.
    const injected = new Map([["a-retired-chart", "some functional test"]]);
    const rows = [row({})];
    const failures = censusFailures(rows, new Map(), injected);
    expect(failures.join(" ")).toContain("a-retired-chart: FUNCTIONAL_ASSERTIONS names a directory");
  });

  test("CONTROL: injecting EMPTY registries produces no orphan failure", () => {
    // Without this, both tests above would still pass if the orphan loops were
    // rewritten to report unconditionally.
    const failures = censusFailures([row({})], new Map(), new Map());
    expect(failures.join(" ")).not.toContain("names a directory the tree no longer has");
  });
});
