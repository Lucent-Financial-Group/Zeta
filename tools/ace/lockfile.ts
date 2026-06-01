import { canonicalJson, packageHash } from "./resolve.ts";
import type { AcePackage, Registry } from "./store.ts";

export type LockNode = { name: string; version: string; url: string; package_hash: string };
export type Lockfile = {
  format_version: 1;
  root: { name: string; version: string; package_hash: string };
  nodes: LockNode[];
};

/** Build the lockfile from a successful resolve. `order` is resolve()'s output (deps-first,
 *  root LAST); root is excluded from `nodes`. Each node's url is taken inline-edge-first
 *  (inline pins are authoritative — the solver never registry-solves an inline-fixed name),
 *  then registry. package_hash is the hash of the actually-installed package. */
export function buildLockfile(root: AcePackage, order: AcePackage[], registry: Registry): Lockfile | { error: string } {
  // Prescan every inline edge in the graph → name@version -> url.
  const inlineUrls = new Map<string, string>();
  for (const p of order) {
    for (const edge of (p.manifest.dependencies ?? [])) {
      if (edge.kind === "inline" && typeof edge.url === "string") {
        inlineUrls.set(`${edge.name}@${edge.version}`, edge.url);
      }
    }
  }
  const deps = order.filter((p) => p !== root); // root is the input, not a locked dependency
  const nodes: LockNode[] = [];
  for (const dep of deps) {
    const name = dep.manifest.name;
    const version = dep.manifest.version;
    const url = inlineUrls.get(`${name}@${version}`) ?? registry.get(name)?.get(version)?.url;
    if (url === undefined) return { error: `cannot resolve url for ${name}@${version}` };
    nodes.push({ name, version, url, package_hash: packageHash(dep) });
  }
  return {
    format_version: 1,
    root: { name: root.manifest.name, version: root.manifest.version, package_hash: packageHash(root) },
    nodes,
  };
}

export function serializeLockfile(lf: Lockfile): string {
  return canonicalJson(lf) + "\n";
}

/** Parse + shape-guard an untrusted lockfile string. Never throws — malformed input → {error}. */
export function parseLockfile(json: string): Lockfile | { error: string } {
  let v: unknown;
  try { v = JSON.parse(json); } catch (e) { return { error: `not valid JSON: ${(e as Error).message}` }; }
  if (typeof v !== "object" || v === null) return { error: "lockfile is not an object" };
  const o = v as Record<string, unknown>;
  if (o.format_version !== 1) return { error: `unsupported format_version: ${JSON.stringify(o.format_version)}` };
  const root = o.root as Record<string, unknown> | null | undefined;
  if (typeof root !== "object" || root === null
      || typeof root.name !== "string" || typeof root.version !== "string" || typeof root.package_hash !== "string") {
    return { error: "malformed lockfile root" };
  }
  if (!Array.isArray(o.nodes)) return { error: "lockfile nodes is not an array" };
  const nodes: LockNode[] = [];
  for (const n of o.nodes) {
    const e = n as Record<string, unknown> | null;
    if (typeof e !== "object" || e === null
        || typeof e.name !== "string" || typeof e.version !== "string"
        || typeof e.url !== "string" || typeof e.package_hash !== "string") {
      return { error: "malformed lockfile node" };
    }
    nodes.push({ name: e.name, version: e.version, url: e.url, package_hash: e.package_hash });
  }
  return { format_version: 1, root: { name: root.name, version: root.version, package_hash: root.package_hash }, nodes };
}
