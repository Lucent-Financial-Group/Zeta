// registry-revoke.ts -- Ace slice 7: pure apply functions for revocation + quarantine marks.
// All functions are pure (no I/O). Returns new content or { error: string }.
import type { IndexSignableContent, RevocationMap, RevocationEntry } from "./signing.ts";

// format_version is 2 iff a mark remains, else 1.
function withFmt(c: IndexSignableContent): IndexSignableContent {
  const hasMarks = (m?: RevocationMap) => !!m && Object.keys(m).length > 0;
  return { ...c, format_version: (hasMarks(c.revoked) || hasMarks(c.quarantined)) ? 2 : 1 };
}
function clone(m: RevocationMap | undefined): RevocationMap {
  // deep-ish clone (own keys only; null-proto to avoid prototype pollution)
  const out: RevocationMap = Object.create(null);
  for (const n of Object.keys(m ?? {})) { out[n] = Object.create(null); for (const v of Object.keys(m![n]!)) out[n]![v] = { ...m![n]![v]! }; }
  return out;
}
function has(m: RevocationMap | undefined, name: string, version: string): boolean {
  return !!m && !!m[name] && m[name]![version] !== undefined;
}
function add(m: RevocationMap, name: string, version: string, entry: RevocationEntry): void {
  (m[name] ?? (m[name] = Object.create(null)))[version] = entry;
}
function remove(m: RevocationMap, name: string, version: string): void {
  if (m[name]) { delete m[name]![version]; if (Object.keys(m[name]!).length === 0) delete m[name]; }
}

export function applyRevoke(prev: IndexSignableContent, name: string, version: string, reason: string | undefined, at: string): IndexSignableContent {
  const revoked = clone(prev.revoked); const quarantined = clone(prev.quarantined);
  remove(quarantined, name, version);                 // revoke supersedes quarantine
  add(revoked, name, version, reason !== undefined ? { reason, at } : { at });
  return withFmt({ ...prev, revoked, quarantined });
}
export function applyQuarantine(prev: IndexSignableContent, name: string, version: string, reason: string | undefined, at: string): IndexSignableContent | { error: string } {
  if (has(prev.revoked, name, version)) return { error: `${name}@${version} is revoked (terminal); cannot quarantine` };
  const quarantined = clone(prev.quarantined);
  add(quarantined, name, version, reason !== undefined ? { reason, at } : { at });
  return withFmt({ ...prev, quarantined });
}
export function applyUnquarantine(prev: IndexSignableContent, name: string, version: string): IndexSignableContent | { error: string } {
  if (!has(prev.quarantined, name, version)) return { error: `${name}@${version} is not quarantined` };
  const quarantined = clone(prev.quarantined);
  remove(quarantined, name, version);
  return withFmt({ ...prev, quarantined });
}
