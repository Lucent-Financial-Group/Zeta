import { describe, expect, test } from "bun:test";
import { parseIndex } from "./registry-remote.ts";

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
