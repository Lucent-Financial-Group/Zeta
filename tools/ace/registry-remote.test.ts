import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { parseIndex } from "./registry-remote.ts";
import type { TrustEntry } from "./signing.ts";
import { generateKeypair, signIndex } from "./signing.ts";
import { verifyIndex, type CacheMeta } from "./registry-remote.ts";

const good = JSON.stringify({
  format_version: 1, sequence: 2, issued_at: "2026-06-01T12:00:00Z",
  packages: { leaf: { "1.0.0": { url: "https://x/l.json", package_hash: "sha256:aa" } } },
  signature: { algo: "ed25519", key_id: "ed25519:k", sig: "BASE64" },
});

describe("parseIndex", () => {
  test("parses a well-formed index", () => {
    const r = parseIndex(good);
    expect("error" in r).toBe(false);
    if (!("error" in r)) { expect(r.sequence).toBe(2); expect(r.packages.leaf!["1.0.0"]!.url).toBe("https://x/l.json"); }
  });
  test.each([
    ["not json", "{"],
    ["bad format_version", JSON.stringify({ format_version: 2, sequence: 1, issued_at: "2026-06-01T12:00:00Z", packages: {}, signature: { algo: "ed25519", key_id: "k", sig: "s" } })],
    ["negative sequence", JSON.stringify({ format_version: 1, sequence: -1, issued_at: "2026-06-01T12:00:00Z", packages: {}, signature: { algo: "ed25519", key_id: "k", sig: "s" } })],
    ["unparseable issued_at", JSON.stringify({ format_version: 1, sequence: 1, issued_at: "nope", packages: {}, signature: { algo: "ed25519", key_id: "k", sig: "s" } })],
    ["missing signature", JSON.stringify({ format_version: 1, sequence: 1, issued_at: "2026-06-01T12:00:00Z", packages: {} })],
    ["non-string url", JSON.stringify({ format_version: 1, sequence: 1, issued_at: "2026-06-01T12:00:00Z", packages: { a: { "1.0.0": { url: 5, package_hash: "h" } } }, signature: { algo: "ed25519", key_id: "k", sig: "s" } })],
  ])("rejects %s (no throw)", (_label, json) => {
    expect("error" in parseIndex(json)).toBe(true);
  });
});

function mk(seq: number, issuedAtMs: number) {
  const kp = generateKeypair();
  const content = { format_version: 1 as const, sequence: seq, issued_at: new Date(issuedAtMs).toISOString(),
    packages: { leaf: { "1.0.0": { url: "https://x/l.json", package_hash: "sha256:aa" } } } };
  const doc = { ...content, signature: signIndex(content, kp.privatePem) };
  const trust = new Map<string, TrustEntry>([[kp.keyId, { public_key: kp.publicSpkiB64 }]]);
  return { kp, doc, trust };
}
const remoteOf = (keyId: string) => ({ url: "https://x/index.json", key_id: keyId });
const NOW = Date.parse("2026-06-01T12:00:00Z");
const meta0: CacheMeta = { url: "https://x/index.json", sequence_high_water: 0, index_content_hash: "", fetched_at: "" };

describe("verifyIndex (three gates)", () => {
  test("all gates pass", () => { const { kp, doc, trust } = mk(1, NOW); expect(verifyIndex(doc, remoteOf(kp.keyId), trust, meta0, NOW, {}).ok).toBe(true); });
  test("untrusted signer refused", () => { const { doc, kp } = mk(1, NOW); expect(verifyIndex(doc, remoteOf(kp.keyId), new Map(), meta0, NOW, {}).ok).toBe(false); });
  test("trusted-but-not-pinned key refused (mandatory pin)", () => {
    const { doc, trust } = mk(1, NOW);
    const r = verifyIndex(doc, remoteOf("ed25519:someoneelse"), trust, meta0, NOW, {});
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toContain("pinned");
  });
  test("rollback refused", () => {
    const { kp, doc, trust } = mk(2, NOW);
    const r = verifyIndex(doc, remoteOf(kp.keyId), trust, { ...meta0, sequence_high_water: 5 }, NOW, {});
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toContain("rollback");
  });
  test("equal sequence accepted", () => { const { kp, doc, trust } = mk(5, NOW); expect(verifyIndex(doc, remoteOf(kp.keyId), trust, { ...meta0, sequence_high_water: 5 }, NOW, {}).ok).toBe(true); });
  test("stale (past) refused", () => {
    const { kp, doc, trust } = mk(1, NOW - 40 * 24 * 3600 * 1000);
    const r = verifyIndex(doc, remoteOf(kp.keyId), trust, meta0, NOW, {});
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toContain("stale");
  });
  test("future beyond skew refused — always, incl. offline", () => {
    const { kp, doc, trust } = mk(1, NOW + 10 * 60 * 1000);
    expect(verifyIndex(doc, remoteOf(kp.keyId), trust, meta0, NOW, {}).ok).toBe(false);
    expect(verifyIndex(doc, remoteOf(kp.keyId), trust, meta0, NOW, { offline: true }).ok).toBe(false);
  });
  test("offline skips past-staleness but keeps sig + anti-rollback", () => {
    const { kp, doc, trust } = mk(1, NOW - 40 * 24 * 3600 * 1000);
    expect(verifyIndex(doc, remoteOf(kp.keyId), trust, meta0, NOW, { offline: true }).ok).toBe(true);
  });
});

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pjoin } from "node:path";
import { readCache, writeCache } from "./registry-remote.ts";

describe("cache I/O", () => {
  let savedHome: string | undefined, savedUP: string | undefined;
  beforeEach(() => { savedHome = process.env.HOME; savedUP = process.env.USERPROFILE;
    const h = mkdtempSync(pjoin(tmpdir(), "ace-cache-")); process.env.HOME = h; process.env.USERPROFILE = h; });
  afterEach(() => { if (savedHome !== undefined) process.env.HOME = savedHome; else delete process.env.HOME;
    if (savedUP !== undefined) process.env.USERPROFILE = savedUP; else delete process.env.USERPROFILE; });

  test("write then read round-trips meta + body", () => {
    const body = '{"hello":"world"}';
    const meta = writeCache("https://x/index.json", body, { etag: '"e1"', last_modified: "lm", sequence_high_water: 3 });
    expect(meta.index_content_hash).toMatch(/^sha256:/);
    const got = readCache("https://x/index.json");
    expect(got).not.toBeNull();
    expect(got!.body).toBe(body);
    expect(got!.meta.etag).toBe('"e1"');
    expect(got!.meta.sequence_high_water).toBe(3);
  });
  test("missing → null", () => { expect(readCache("https://nope")).toBeNull(); });
});

import { generateKeypair as gkp, signIndex as sidx } from "./signing.ts";
import { fetchRemoteIndex } from "./registry-remote.ts";

function indexJson(kp: { privatePem: string }, seq: number, issuedAtMs: number) {
  const content = { format_version: 1 as const, sequence: seq, issued_at: new Date(issuedAtMs).toISOString(),
    packages: { leaf: { "1.0.0": { url: "https://x/l.json", package_hash: "sha256:aa" } } } };
  return JSON.stringify({ ...content, signature: sidx(content, kp.privatePem) });
}

describe("fetchRemoteIndex", () => {
  let savedFetch: typeof globalThis.fetch, savedHome: string | undefined, savedUP: string | undefined;
  beforeEach(() => { savedFetch = globalThis.fetch; savedHome = process.env.HOME; savedUP = process.env.USERPROFILE;
    const h = mkdtempSync(pjoin(tmpdir(), "ace-fetch-")); process.env.HOME = h; process.env.USERPROFILE = h; });
  afterEach(() => { globalThis.fetch = savedFetch;
    if (savedHome !== undefined) process.env.HOME = savedHome; else delete process.env.HOME;
    if (savedUP !== undefined) process.env.USERPROFILE = savedUP; else delete process.env.USERPROFILE; });

  test("200 verifies + returns entries + caches", async () => {
    const kp = gkp(); const now = Date.parse("2026-06-01T12:00:00Z");
    globalThis.fetch = (async () => new Response(indexJson(kp, 1, now), { status: 200, headers: { ETag: '"e1"' } })) as unknown as typeof fetch;
    const trust = new Map([[kp.keyId, { public_key: kp.publicSpkiB64 }]]);
    const r = await fetchRemoteIndex({ url: "https://x/index.json", key_id: kp.keyId }, trust, { now });
    expect("entries" in r).toBe(true);
    if ("entries" in r) expect(r.entries.get("leaf")!.get("1.0.0")!.url).toBe("https://x/l.json");
  });
  test("304 uses cached body", async () => {
    const kp = gkp(); const now = Date.parse("2026-06-01T12:00:00Z");
    globalThis.fetch = (async () => new Response(indexJson(kp, 2, now), { status: 200, headers: { ETag: '"e2"' } })) as unknown as typeof fetch;
    const trust = new Map([[kp.keyId, { public_key: kp.publicSpkiB64 }]]);
    const remote = { url: "https://x/index.json", key_id: kp.keyId };
    await fetchRemoteIndex(remote, trust, { now });
    globalThis.fetch = (async () => new Response(null, { status: 304 })) as unknown as typeof fetch;
    expect("entries" in await fetchRemoteIndex(remote, trust, { now })).toBe(true);
  });
  test("network error → cache-fallback", async () => {
    const kp = gkp(); const now = Date.parse("2026-06-01T12:00:00Z");
    globalThis.fetch = (async () => new Response(indexJson(kp, 1, now), { status: 200 })) as unknown as typeof fetch;
    const trust = new Map([[kp.keyId, { public_key: kp.publicSpkiB64 }]]);
    const remote = { url: "https://x/index.json", key_id: kp.keyId };
    await fetchRemoteIndex(remote, trust, { now });
    globalThis.fetch = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
    expect("entries" in await fetchRemoteIndex(remote, trust, { now })).toBe(true);
  });
  test("network error + no cache → skipped", async () => {
    const kp = gkp();
    globalThis.fetch = (async () => { throw new Error("net"); }) as unknown as typeof fetch;
    expect("skipped" in await fetchRemoteIndex({ url: "https://x/index.json", key_id: kp.keyId }, new Map(), { now: Date.now() })).toBe(true);
  });
  test("rollback on 200 → error (hard refusal)", async () => {
    const kp = gkp(); const now = Date.parse("2026-06-01T12:00:00Z");
    const remote = { url: "https://x/index.json", key_id: kp.keyId };
    const trust = new Map([[kp.keyId, { public_key: kp.publicSpkiB64 }]]);
    globalThis.fetch = (async () => new Response(indexJson(kp, 5, now), { status: 200 })) as unknown as typeof fetch;
    await fetchRemoteIndex(remote, trust, { now });
    globalThis.fetch = (async () => new Response(indexJson(kp, 2, now), { status: 200 })) as unknown as typeof fetch;
    expect("error" in await fetchRemoteIndex(remote, trust, { now })).toBe(true);
  });
});
