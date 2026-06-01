import { createHash } from "node:crypto";
import type { AcePackage, LoadedTrustEntry } from "./store.ts";

/** Deterministic JSON: object keys recursively sorted; arrays preserve order. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

/** sha256 of the canonical whole package ({manifest incl. signature, files}). The parent's
 *  pin / identity for a dependency. Two edges sharing a packageHash are byte-identical. */
export function packageHash(pkg: AcePackage): string {
  return "sha256:" + createHash("sha256").update(canonicalJson({ manifest: pkg.manifest, files: pkg.files })).digest("hex");
}

export type FetchPackage = (urlOrPath: string) => Promise<string>;

export type ResolveReason =
  | "version-skew" | "tamper" | "pin-mismatch" | "bad-content-hash"
  | "bad-signature" | "untrusted-key" | "unsupported-algo" | "no-signature"
  | "cycle" | "fetch-failed" | "invalid-package";

export type ResolveResult =
  | { ok: true; order: AcePackage[] }
  | { ok: false; reason: ResolveReason; detail: string; path: string[] };

export async function resolve(
  root: AcePackage,
  fetchPackage: FetchPackage,
  _trustStore: Map<string, LoadedTrustEntry>,
  _opts: { allowNoSignature: boolean },
): Promise<ResolveResult> {
  const byName = new Map<string, { version: string; pkgHash: string; path: string[] }>();
  const visiting = new Set<string>();
  const order: AcePackage[] = [];

  byName.set(root.manifest.name, { version: root.manifest.version, pkgHash: packageHash(root), path: ["root"] });
  visiting.add(root.manifest.name);

  const walk = async (node: AcePackage, path: string[]): Promise<ResolveResult | null> => {
    for (const edge of node.manifest.dependencies ?? []) {
      const here = [...path, edge.name];
      let dep: AcePackage;
      try { dep = JSON.parse(await fetchPackage(edge.url)) as AcePackage; }
      catch (e) { return { ok: false, reason: "fetch-failed", detail: `${edge.url}: ${(e as Error).message}`, path: here }; }
      byName.set(edge.name, { version: edge.version, pkgHash: edge.package_hash, path: here });
      visiting.add(edge.name);
      const sub = await walk(dep, here);
      if (sub) return sub;
      visiting.delete(edge.name);
      order.push(dep);
    }
    return null;
  };

  const failure = await walk(root, ["root"]);
  if (failure) return failure;
  order.push(root);
  return { ok: true, order };
}
