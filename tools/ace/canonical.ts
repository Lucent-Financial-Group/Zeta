// canonical.ts -- Ace slice 8.1: the seam between Ace's trust core and the project's
// shared, 4-language byte-locked canonical-JSON (src/Core.TypeScript/dynamic-value/json.ts).
// Own-the-interface: the rest of Ace depends on canonicalBytes() here, not directly on the
// dynamic-value port. The trust core's package_hash + index/manifest signing all
// rest on canonicalBytes, so they inherit the audited cross-language canonicalization (and a
// future Rust/F#/C# Ace consumer computes byte-identical hashes for free from the byte-lock).
import { canonicalJson, type Tagged } from "../../src/Core.TypeScript/dynamic-value/json.ts";

/**
 * Reject strings carrying a lone surrogate (e.g. "\uD800") before they reach the
 * hashing/signing seam. `canonicalJson` preserves a lone surrogate (it emits string chars
 * raw above U+001F), but `TextEncoder` in `canonicalBytes` silently maps EVERY lone
 * surrogate to U+FFFD — so byte-distinct strings ("\uD800", "\uD801", and the real
 * "�") collapse to identical canonical bytes. Since canonicalBytes is the shared
 * package_hash + index/manifest signing seam, that collapse would let one signature /
 * package hash be replayed across distinct metadata. `isWellFormed()` is the spec
 * primitive (false iff the string contains a lone surrogate); fail loud here — matching the
 * `Number.isSafeInteger` throw below — rather than silently hashing a collidable value.
 */
function assertWellFormed(s: string, what: string): void {
  if (!s.isWellFormed()) {
    throw new Error(
      `toTagged: ${what} contains a lone surrogate — lone surrogates collapse to U+FFFD under UTF-8 encoding and would collide byte-distinct values at the package_hash/signing seam`,
    );
  }
}

/**
 * Convert a plain JS value into the shared `Tagged` form. Object entries are emitted in
 * lexicographically-SORTED key order, so the order-preserving `canonicalJson` yields
 * sorted-key output — Ace keeps its key-order-independent canonicalization while consuming
 * the shared primitive. A JS `number` must be an integer (`Number.isInteger`): Ace's
 * canonical content has no Float fields, so a non-integer is a bug and throws rather than
 * silently hashing a float. `undefined` object properties are omitted (matching JSON /
 * the prior `canonicalize`). bigint / symbol / function are unsupported and throw.
 * String values AND object keys are checked for lone surrogates (see `assertWellFormed`) —
 * keys bypass the `case "string"` path but still reach `encodeString` → `canonicalBytes`.
 */
export function toTagged(value: unknown): Tagged {
  if (value === null) return { t: "null" };
  switch (typeof value) {
    case "boolean":
      return { t: "bool", v: value };
    case "number":
      // Number.isSafeInteger rejects floats, NaN, Infinity, AND integers outside
      // ±(2^53-1) whose String() would be exponential (e.g. 1e21 → "1e+21", which
      // BigInt() rejects inside canonicalJson). Ace's ints (format_version, sequence)
      // are tiny; an out-of-range or non-integer number is a bug — fail loud here with
      // a clear message rather than a cryptic downstream BigInt SyntaxError.
      if (!Number.isSafeInteger(value)) {
        throw new Error(
          `toTagged: ${value} is not a safe integer — Ace canonical content has no Float fields and integers must be within the safe-integer range`,
        );
      }
      return { t: "int", v: String(value) };
    case "string":
      assertWellFormed(value, "string value");
      return { t: "str", v: value };
    case "object": {
      if (Array.isArray(value)) {
        return { t: "arr", v: value.map(toTagged) };
      }
      const obj = value as Record<string, unknown>;
      const entries: [string, Tagged][] = [];
      // Code-unit (≈ ASCII) sort: intentional + deterministic. Do NOT switch to
      // localeCompare — it would change the byte output for non-ASCII keys.
      for (const k of Object.keys(obj).sort()) {
        const v = obj[k];
        if (v === undefined) continue; // omit undefined props (JSON.stringify parity)
        assertWellFormed(k, "object key"); // keys bypass the string-value case but still reach encodeString → canonicalBytes
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
