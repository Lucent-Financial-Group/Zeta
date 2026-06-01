import { describe, expect, test } from "bun:test";
import { packageHash, resolve, type FetchPackage } from "./resolve.ts";
import type { AcePackage } from "./store.ts";
import { contentHash } from "./store.ts";

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

// --- slice-4 resolve test helpers ---
// Build a package; children are already-built {pkg, url} whose edges this package will declare.
function pkgOf(name: string, files: Record<string, string>, children: { pkg: AcePackage; url: string }[] = []): AcePackage {
  return {
    manifest: {
      format_version: 1, name, version: "1.0.0",
      content_hash: contentHash(new TextEncoder().encode(JSON.stringify(files))),
      dependencies: children.map((c) => ({
        name: c.pkg.manifest.name, version: c.pkg.manifest.version, url: c.url, package_hash: packageHash(c.pkg),
      })),
    },
    files,
  };
}
// Injected fetch over a {url: package} map.
function fetchOf(map: Record<string, AcePackage>): FetchPackage {
  return async (url: string) => { const p = map[url]; if (!p) throw new Error("404 " + url); return JSON.stringify(p); };
}
const NO_TRUST = new Map(); // empty trust store; basic tests pass allowNoSignature:true

describe("resolve — basic", () => {
  test("leaf package (no deps) resolves to [root]", async () => {
    const root = pkgOf("root", { "r.txt": "x" });
    const r = await resolve(root, fetchOf({}), NO_TRUST, { allowNoSignature: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.map((p) => p.manifest.name)).toEqual(["root"]);
  });
  test("linear chain root->A->B installs leaves-first [B, A, root]", async () => {
    const B = pkgOf("B", { "b.txt": "b" });
    const A = pkgOf("A", { "a.txt": "a" }, [{ pkg: B, url: "http://e/B" }]);
    const root = pkgOf("root", { "r.txt": "r" }, [{ pkg: A, url: "http://e/A" }]);
    const r = await resolve(root, fetchOf({ "http://e/A": A, "http://e/B": B }), NO_TRUST, { allowNoSignature: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.map((p) => p.manifest.name)).toEqual(["B", "A", "root"]);
  });
});
