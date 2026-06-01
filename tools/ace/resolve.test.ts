import { describe, expect, test } from "bun:test";
import { packageHash } from "./resolve.ts";
import type { AcePackage } from "./store.ts";

const mk = (name: string): AcePackage => ({
  manifest: { format_version: 1, name, version: "1.0.0", content_hash: "sha256:aaa" },
  files: { "a.txt": "x" },
});

describe("packageHash", () => {
  test("stable under key reordering (canonical)", () => {
    const a: AcePackage = { manifest: { format_version: 1, name: "n", version: "1", content_hash: "h" }, files: { a: "1", b: "2" } };
    const b: AcePackage = { manifest: { content_hash: "h", version: "1", name: "n", format_version: 1 }, files: { b: "2", a: "1" } } as AcePackage;
    expect(packageHash(a)).toBe(packageHash(b));
  });
  test("differs when manifest differs even if files identical", () => {
    expect(packageHash(mk("A"))).not.toBe(packageHash(mk("B")));
  });
  test("differs when files differ", () => {
    const base = mk("A");
    const other: AcePackage = { manifest: base.manifest, files: { "a.txt": "DIFFERENT" } };
    expect(packageHash(base)).not.toBe(packageHash(other));
  });
});
