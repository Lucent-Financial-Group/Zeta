import { createHash } from "node:crypto";
import type { AcePackage } from "./store.ts";

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
