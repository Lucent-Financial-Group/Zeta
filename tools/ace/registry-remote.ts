// registry-remote.ts -- Ace slice 6: fetch + verify + anti-rollback + cache + merge of a
// signed remote registry index. Untrusted-input discipline throughout (never throw on bad
// input; return { error } / { skipped }). The package bytes the index points at are still
// hash-pinned + signature-gated downstream (unchanged) — index trust is additive.
import type { AceSignature, IndexSignableContent, TrustEntry } from "./signing.ts";
import { verifyIndexSignature } from "./signing.ts";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { RegistryEntry, RemoteRegistryConfig } from "./store.ts";
import { registryCacheDir } from "./store.ts";

export type IndexDoc = IndexSignableContent & { signature: AceSignature };

function isEntry(e: unknown): e is RegistryEntry {
  return !!e && typeof e === "object"
    && typeof (e as RegistryEntry).url === "string"
    && typeof (e as RegistryEntry).package_hash === "string";
}
function isSig(s: unknown): s is AceSignature {
  return !!s && typeof s === "object"
    && (s as AceSignature).algo === "ed25519"
    && typeof (s as AceSignature).key_id === "string"
    && typeof (s as AceSignature).sig === "string";
}

export function parseIndex(json: string): IndexDoc | { error: string } {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return { error: "index is not valid JSON" }; }
  if (!raw || typeof raw !== "object") return { error: "index is not an object" };
  const o = raw as Record<string, unknown>;
  if (o.format_version !== 1) return { error: "unsupported index format_version" };
  if (typeof o.sequence !== "number" || !Number.isInteger(o.sequence) || o.sequence < 0) return { error: "index sequence must be a non-negative integer" };
  if (typeof o.issued_at !== "string" || Number.isNaN(Date.parse(o.issued_at))) return { error: "index issued_at must be RFC3339" };
  if (!o.packages || typeof o.packages !== "object") return { error: "index packages must be an object" };
  const packages: Record<string, Record<string, RegistryEntry>> = {};
  for (const [name, versions] of Object.entries(o.packages as Record<string, unknown>)) {
    if (!versions || typeof versions !== "object") return { error: `index packages.${name} must be an object` };
    const vm: Record<string, RegistryEntry> = {};
    for (const [version, entry] of Object.entries(versions as Record<string, unknown>)) {
      if (!isEntry(entry)) return { error: `index packages.${name}.${version} is malformed` };
      vm[version] = { url: entry.url, package_hash: entry.package_hash };
    }
    packages[name] = vm;
  }
  if (!isSig(o.signature)) return { error: "index signature is malformed" };
  return { format_version: 1, sequence: o.sequence, issued_at: o.issued_at, packages, signature: o.signature };
}

export const DEFAULT_MAX_STALENESS_DAYS = 30;
export const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface CacheMeta {
  url: string; etag?: string; last_modified?: string;
  sequence_high_water: number; index_content_hash: string; fetched_at: string;
}
export interface VerifyOpts { offline?: boolean }

/** The three gates, in order: signature (mandatory pin) → anti-rollback → freshness (two-sided). */
export function verifyIndex(
  doc: IndexDoc, remote: RemoteRegistryConfig, trustStore: Map<string, TrustEntry>,
  cacheMeta: CacheMeta, now: number, opts: VerifyOpts,
): { ok: true } | { ok: false; reason: string } {
  const { signature, ...content } = doc;
  if (signature.key_id !== remote.key_id) return { ok: false, reason: `index not signed by the registry's pinned key ${remote.key_id}` };
  const sv = verifyIndexSignature(content, signature, trustStore);
  if (!sv.ok) return { ok: false, reason: `index signature ${sv.reason}` };
  if (doc.sequence < cacheMeta.sequence_high_water) return { ok: false, reason: `index rollback: sequence ${doc.sequence} < seen ${cacheMeta.sequence_high_water}` };
  const issued = Date.parse(doc.issued_at);
  if (issued - now > MAX_FUTURE_SKEW_MS) return { ok: false, reason: `index issued_at is in the future beyond skew` };
  if (!opts.offline) {
    const maxStaleMs = (remote.max_staleness_days ?? DEFAULT_MAX_STALENESS_DAYS) * 24 * 3600 * 1000;
    if (now - issued > maxStaleMs) return { ok: false, reason: `index is stale (issued_at older than max-staleness)` };
  }
  return { ok: true };
}

function metaPath(url: string): string {
  return join(registryCacheDir(), createHash("sha256").update(url).digest("hex") + ".json");
}
function blobPath(contentHash: string): string {
  return join(registryCacheDir(), "blobs", contentHash.replace("sha256:", "") + ".json");
}
function indexContentHash(body: string): string {
  return "sha256:" + createHash("sha256").update(body).digest("hex");
}

export function readCache(url: string): { meta: CacheMeta; body: string } | null {
  try {
    const meta = JSON.parse(readFileSync(metaPath(url), "utf8")) as CacheMeta;
    if (typeof meta.index_content_hash !== "string") return null;
    const body = readFileSync(blobPath(meta.index_content_hash), "utf8");
    return { meta, body };
  } catch { return null; }
}

export function writeCache(
  url: string, body: string,
  fields: { etag?: string; last_modified?: string; sequence_high_water: number },
): CacheMeta {
  const ch = indexContentHash(body);
  mkdirSync(join(registryCacheDir(), "blobs"), { recursive: true });
  writeFileSync(blobPath(ch), body);
  const meta: CacheMeta = {
    url, sequence_high_water: fields.sequence_high_water, index_content_hash: ch,
    fetched_at: new Date().toISOString(),
    ...(fields.etag !== undefined ? { etag: fields.etag } : {}),
    ...(fields.last_modified !== undefined ? { last_modified: fields.last_modified } : {}),
  };
  writeFileSync(metaPath(url), JSON.stringify(meta, null, 2));
  return meta;
}
