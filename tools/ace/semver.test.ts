import { describe, expect, test } from "bun:test";
import { parseVersion, compareVersions, parseRange, satisfies } from "./semver.ts";

describe("parseVersion + compareVersions", () => {
  test("parses x.y.z", () => { expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 }); });
  test("rejects junk", () => { expect(parseVersion("1.2")).toBeNull(); expect(parseVersion("v1.2.3")).toBeNull(); expect(parseVersion("1.2.x")).toBeNull(); });
  test("orders numerically (not lexically)", () => {
    expect(compareVersions("1.2.3", "1.2.10")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });
});

describe("satisfies — exact / comparator / wildcard", () => {
  test("exact", () => { expect(satisfies("1.2.3", "1.2.3")).toBe(true); expect(satisfies("1.2.4", "1.2.3")).toBe(false); expect(satisfies("1.2.3", "=1.2.3")).toBe(true); });
  test("comparators", () => {
    expect(satisfies("1.5.0", ">=1.2.0")).toBe(true);
    expect(satisfies("1.1.0", ">=1.2.0")).toBe(false);
    expect(satisfies("1.2.0", "<2.0.0")).toBe(true);
    expect(satisfies("2.0.0", "<2.0.0")).toBe(false);
    expect(satisfies("1.2.0", ">1.2.0")).toBe(false);
    expect(satisfies("1.2.0", "<=1.2.0")).toBe(true);
  });
  test("wildcard * and x match any valid version", () => { expect(satisfies("9.9.9", "*")).toBe(true); expect(satisfies("0.0.1", "x")).toBe(true); });
  test("malformed range surfaces via parseRange error", () => { expect("error" in (parseRange("@@@") as object)).toBe(true); });
});
