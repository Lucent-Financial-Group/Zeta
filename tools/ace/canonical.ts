// canonical.ts -- Ace slice 8.1: the seam between Ace's trust core and the project's
// shared, 4-language byte-locked canonical-JSON (src/Core.TypeScript/dynamic-value/json.ts).
// Own-the-interface: the rest of Ace depends on canonicalBytes() here, not directly on the
// dynamic-value port. The trust core's package_hash / key_id / index+manifest signing all
// rest on canonicalBytes, so they inherit the audited cross-language canonicalization (and a
// future Rust/F#/C# Ace consumer computes byte-identical hashes for free from the byte-lock).
import { canonicalJson, type Tagged } from "../../src/Core.TypeScript/dynamic-value/json.ts";

/**
 * Convert a plain JS value into the shared `Tagged` form. Object entries are emitted in
 * lexicographically-SORTED key order, so the order-preserving `canonicalJson` yields
 * sorted-key output — Ace keeps its key-order-independent canonicalization while consuming
 * the shared primitive. A JS `number` must be an integer (`Number.isInteger`): Ace's
 * canonical content has no Float fields, so a non-integer is a bug and throws rather than
 * silently hashing a float. `undefined` object properties are omitted (matching JSON /
 * the prior `canonicalize`). bigint / symbol / function are unsupported and throw.
 */
export function toTagged(value: unknown): Tagged {
  if (value === null) return { t: "null" };
  switch (typeof value) {
    case "boolean":
      return { t: "bool", v: value };
    case "number":
      if (!Number.isInteger(value)) {
        throw new Error(`toTagged: non-integer number ${value} — Ace canonical content has no Float fields`);
      }
      return { t: "int", v: String(value) };
    case "string":
      return { t: "str", v: value };
    case "object": {
      if (Array.isArray(value)) {
        return { t: "arr", v: value.map(toTagged) };
      }
      const obj = value as Record<string, unknown>;
      const entries: [string, Tagged][] = [];
      for (const k of Object.keys(obj).sort()) {
        const v = obj[k];
        if (v === undefined) continue; // omit undefined props (JSON.stringify parity)
        entries.push([k, toTagged(v)]);
      }
      return { t: "obj", v: entries };
    }
    default:
      throw new Error(`toTagged: unsupported value type ${typeof value}`);
  }
}

const ENCODER = new TextEncoder();

/** Ace's canonical byte form: shared canonical-JSON over the sorted-key `Tagged` tree. */
export function canonicalBytes(value: unknown): Uint8Array {
  return ENCODER.encode(canonicalJson(toTagged(value)));
}
