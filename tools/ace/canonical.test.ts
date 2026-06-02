import { describe, expect, test } from "bun:test";
import { toTagged, canonicalBytes } from "./canonical.ts";
import { canonicalJson, fromCanonicalJson, type Tagged } from "../../src/Core.TypeScript/dynamic-value/json.ts";

const dec = new TextDecoder();
const bytesToStr = (b: Uint8Array): string => dec.decode(b);

describe("toTagged", () => {
  test("null / bool / string map directly", () => {
    expect(toTagged(null)).toEqual({ t: "null" });
    expect(toTagged(true)).toEqual({ t: "bool", v: true });
    expect(toTagged(false)).toEqual({ t: "bool", v: false });
    expect(toTagged("hi")).toEqual({ t: "str", v: "hi" });
  });

  test("integer number → int with decimal-string value", () => {
    expect(toTagged(0)).toEqual({ t: "int", v: "0" });
    expect(toTagged(42)).toEqual({ t: "int", v: "42" });
    expect(toTagged(-7)).toEqual({ t: "int", v: "-7" });
  });

  test("non-safe-integer numbers throw (float, NaN, Infinity, out-of-range)", () => {
    expect(() => toTagged(3.14)).toThrow();
    expect(() => toTagged(Number.NaN)).toThrow();
    expect(() => toTagged(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => toTagged(1e21)).toThrow(); // String(1e21) === "1e+21" → would crash canonicalJson's BigInt
    expect(() => toTagged(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  test("safe-integer bounds map directly", () => {
    expect(toTagged(Number.MAX_SAFE_INTEGER)).toEqual({ t: "int", v: "9007199254740991" });
    expect(toTagged(Number.MIN_SAFE_INTEGER)).toEqual({ t: "int", v: "-9007199254740991" });
  });

  test("empty object and empty array", () => {
    expect(toTagged({})).toEqual({ t: "obj", v: [] });
    expect(toTagged([])).toEqual({ t: "arr", v: [] });
  });

  test("array preserves order, recurses", () => {
    expect(toTagged([1, "a", true])).toEqual({
      t: "arr",
      v: [
        { t: "int", v: "1" },
        { t: "str", v: "a" },
        { t: "bool", v: true },
      ],
    });
  });

  test("object emits entries in SORTED key order", () => {
    const out = toTagged({ b: 2, a: 1, c: 3 }) as Extract<Tagged, { t: "obj" }>;
    expect(out.t).toBe("obj");
    expect(out.v.map(([k]) => k)).toEqual(["a", "b", "c"]);
    expect(out.v).toEqual([
      ["a", { t: "int", v: "1" }],
      ["b", { t: "int", v: "2" }],
      ["c", { t: "int", v: "3" }],
    ]);
  });

  test("nested object sorts at every level", () => {
    const out = toTagged({ z: { y: 1, x: 2 }, a: 3 }) as Extract<Tagged, { t: "obj" }>;
    expect(out.v.map(([k]) => k)).toEqual(["a", "z"]);
    const z = out.v[1]![1] as Extract<Tagged, { t: "obj" }>;
    expect(z.v.map(([k]) => k)).toEqual(["x", "y"]);
  });

  test("undefined object properties are omitted (JSON parity)", () => {
    const out = toTagged({ a: 1, b: undefined, c: 3 }) as Extract<Tagged, { t: "obj" }>;
    expect(out.v.map(([k]) => k)).toEqual(["a", "c"]);
  });

  test("unsupported value types throw (bigint, symbol, function)", () => {
    expect(() => toTagged(1n)).toThrow();
    expect(() => toTagged(Symbol("x"))).toThrow();
    expect(() => toTagged(() => 0)).toThrow();
  });
});

describe("canonicalBytes", () => {
  test("= encode(canonicalJson(toTagged(x)))", () => {
    const x = { b: 2, a: "hi", c: [1, 2] };
    const expected = canonicalJson(toTagged(x));
    expect(bytesToStr(canonicalBytes(x))).toBe(expected);
  });

  test("produces sorted-key minified canonical JSON", () => {
    expect(bytesToStr(canonicalBytes({ b: 2, a: 1 }))).toBe('{"a":1,"b":2}');
  });

  test("empty object / array canonical bytes", () => {
    expect(bytesToStr(canonicalBytes({}))).toBe("{}");
    expect(bytesToStr(canonicalBytes([]))).toBe("[]");
  });

  test("round-trips through the shared fromCanonicalJson", () => {
    const x = { name: "z", count: 3, nested: { k: "v" } };
    const json = bytesToStr(canonicalBytes(x));
    const back = fromCanonicalJson(json);
    expect(back.ok).toBe(true);
    if (back.ok) expect(canonicalJson(back.value)).toBe(json);
  });

  test("determinism: key insertion order does not change the bytes", () => {
    const a = canonicalBytes({ one: 1, two: 2, three: 3 });
    const b = canonicalBytes({ three: 3, one: 1, two: 2 });
    expect(Buffer.from(a)).toEqual(Buffer.from(b));
  });
});

describe("lone surrogates rejected (hash/signature replay-resistance)", () => {
  // A lone surrogate survives canonicalJson (string chars > U+001F are emitted raw) but
  // TextEncoder in canonicalBytes maps every lone surrogate to U+FFFD — so "\uD800",
  // "\uD801" and the real "�" would otherwise collide to identical signing bytes.
  // toTagged must reject lone surrogates before they reach that seam.
  test("lone high surrogate string value throws", () => {
    expect(() => toTagged("\uD800")).toThrow(/lone surrogate/);
    expect(() => canonicalBytes("\uD800")).toThrow(/lone surrogate/);
  });

  test("lone low surrogate string value throws", () => {
    expect(() => toTagged("\uDC00")).toThrow(/lone surrogate/);
  });

  test("lone surrogate buried in a longer string / nested value throws", () => {
    expect(() => toTagged("ace\uD83Dpkg")).toThrow(/lone surrogate/); // high surrogate, no low follower
    expect(() => canonicalBytes({ name: "ok", bad: ["\uDFFF"] })).toThrow(/lone surrogate/);
  });

  test("lone surrogate in an OBJECT KEY throws (keys bypass the string-value case)", () => {
    expect(() => toTagged({ "\uD800": 1 })).toThrow(/lone surrogate/);
    expect(() => canonicalBytes({ ["k\uDC00"]: 1 })).toThrow(/lone surrogate/);
  });

  test("the would-be collision is now distinguishable: each side throws instead of colliding", () => {
    // Pre-fix, all three encoded to the same EF BF BD bytes. Post-fix the two lone
    // surrogates throw, and only the genuine replacement character canonicalizes.
    expect(() => canonicalBytes("\uD800")).toThrow();
    expect(() => canonicalBytes("\uD801")).toThrow();
    expect(bytesToStr(canonicalBytes("�"))).toBe('"�"'); // real U+FFFD is well-formed → allowed
  });

  test("valid surrogate PAIRS (astral chars) are NOT rejected — no false positive", () => {
    expect(() => toTagged("😀")).not.toThrow(); // U+1F600, a well-formed pair
    expect(bytesToStr(canonicalBytes("😀"))).toBe('"😀"');
    expect(() => toTagged({ "🔑": "🗝️" })).not.toThrow();
  });
});
