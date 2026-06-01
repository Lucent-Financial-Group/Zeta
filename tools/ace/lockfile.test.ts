import { describe, expect, test } from "bun:test";
import { buildLockfile } from "./lockfile.ts";
import { packageHash } from "./resolve.ts";
import { contentHash } from "./store.ts";
import type { AcePackage, AceDependency, RegistryEntry, Registry } from "./store.ts";

function pkgAt(name: string, version: string, deps: AceDependency[] = []): AcePackage {
  const files = { "f.txt": `${name}@${version}` };
  return { manifest: { format_version: 1, name, version, content_hash: contentHash(new TextEncoder().encode(JSON.stringify(files))), dependencies: deps }, files };
}
const regEdge = (name: string, range: string): AceDependency => ({ kind: "registry", name, version: range });
const inlineEdge = (pkg: AcePackage, url: string): AceDependency => ({ kind: "inline", name: pkg.manifest.name, version: pkg.manifest.version, url, package_hash: packageHash(pkg) });
function reg(entries: { name: string; version: string; url: string; pkg: AcePackage }[]): Registry {
  const r: Registry = new Map();
  for (const e of entries) {
    if (!r.has(e.name)) r.set(e.name, new Map<string, RegistryEntry>());
    r.get(e.name)!.set(e.version, { url: e.url, package_hash: packageHash(e.pkg) });
  }
  return r;
}

describe("buildLockfile", () => {
  test("records registry node url from the registry + excludes root", () => {
    const A = pkgAt("A", "1.2.0");
    const root = pkgAt("root", "1.0.0", [regEdge("A", "^1.0.0")]);
    const registry = reg([{ name: "A", version: "1.2.0", url: "u/A/1.2.0", pkg: A }]);
    const order: AcePackage[] = [A, root]; // resolve order: deps-first, root last
    const lf = buildLockfile(root, order, registry);
    expect("error" in lf).toBe(false);
    if (!("error" in lf)) {
      expect(lf.format_version).toBe(1);
      expect(lf.root).toEqual({ name: "root", version: "1.0.0", package_hash: packageHash(root) });
      expect(lf.nodes).toEqual([{ name: "A", version: "1.2.0", url: "u/A/1.2.0", package_hash: packageHash(A) }]);
    }
  });
  test("records inline node url from the inline edge (inline precedence)", () => {
    const B = pkgAt("B", "2.0.0");
    const root = pkgAt("root", "1.0.0", [inlineEdge(B, "http://e/B")]);
    const order: AcePackage[] = [B, root];
    const lf = buildLockfile(root, order, new Map());
    expect("error" in lf).toBe(false);
    if (!("error" in lf)) {
      expect(lf.nodes).toEqual([{ name: "B", version: "2.0.0", url: "http://e/B", package_hash: packageHash(B) }]);
    }
  });
});
