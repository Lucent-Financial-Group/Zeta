/**
 * delta-log-entry/entry-codec.ts — the SHIPPABLE `DeltaLogEntry` codec.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `golden-vectors.test.ts` is the TypeScript oracle for the four-language `DeltaLogEntry` byte-lock,
 * and it passes. But the function that produced those bytes — `entryToTagged` — lived **inside the
 * test file**. So the byte-lock proved that TypeScript *can* produce the canonical frame, while
 * nothing in `durability/` *could*: `delta-log.ts` shipped only `InMemoryDeltaLog`, which frames
 * nothing because it never leaves memory.
 *
 * That is a byte-lock over a capability the product does not have. The vectors were green and a
 * TypeScript-written log was still unreadable by F#, because there was no TypeScript writer.
 *
 * This module is that encoder, moved out of the test and given the missing half — a DECODER. The
 * test now imports from here, so the byte-lock covers the shipped code rather than a copy of it.
 *
 * ── THE FORMAT, AND WHY IT NEEDS NO NEW CANONICAL ENCODING ───────────────────
 * An entry maps to a `DynamicValue.Object` with ordinal-ordered keys `captured` / `delta` / `seq`,
 * then rides DynamicValue's canonical CBOR (RFC 8949) — already locked across four languages. An
 * entry is *just a DynamicValue*, so the Log noun inherits the lock instead of minting one. This
 * mirrors `DeltaLogEntryDynamic.toDynamicValue` in `src/Core/DeltaCodec.fs`.
 *
 * ── COLLATION ────────────────────────────────────────────────────────────────
 * Keys sort ORDINALLY, matching F#'s `'K : comparison` for strings. Not `localeCompare`: a locale
 * collation reorders mixed-case keys and the frames stop being byte-identical — the exact failure
 * `culture-invariant-by-default` exists to prevent.
 *
 * ── SCOPE, STATED HONESTLY ───────────────────────────────────────────────────
 * `string` keys only. F#'s codec is generic in `'K`; this covers the key type the golden vectors
 * pin and the one the interop fixture uses. A numeric-key entry has no vector, so claiming support
 * for it would be claiming a lock that does not exist.
 */

import { type Tagged, canonicalCbor, fromCanonicalCbor } from "../dynamic-value/cbor";

/** One log entry, in the shape the four-language vectors pin. */
export interface CanonicalEntry {
  readonly seq: number;
  /** (key, weight) pairs. Sorted ordinally by the encoder; input order is not significant. */
  readonly delta: readonly (readonly [string, number])[];
  readonly captured: Readonly<Record<string, string>>;
}

/** Ordinal string order. See the collation note above — deliberately not `localeCompare`. */
const ordinal = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The DynamicValue an entry maps to. Mirrors `DeltaLogEntryDynamic.toDynamicValue`. */
export function entryToTagged(entry: CanonicalEntry): Tagged {
  const captured: [string, Tagged][] = Object.entries(entry.captured)
    .sort((x, y) => ordinal(x[0], y[0]))
    .map(([k, v]) => [k, { t: "str", v }] as [string, Tagged]);

  const delta: Tagged[] = entry.delta
    .slice()
    .sort((x, y) => ordinal(x[0], y[0]))
    .map(
      ([k, w]) =>
        ({
          t: "arr",
          v: [
            { t: "str", v: k },
            { t: "int", v: String(w) },
          ],
        }) as Tagged,
    );

  return {
    t: "obj",
    v: [
      ["captured", { t: "obj", v: captured }],
      ["delta", { t: "arr", v: delta }],
      ["seq", { t: "int", v: String(entry.seq) }],
    ],
  };
}

export type EntryParse =
  { readonly ok: true; readonly entry: CanonicalEntry } | { readonly ok: false; readonly why: string };

/** Look one key up in a `Tagged` object's association list. */
function field(obj: readonly (readonly [string, Tagged])[], name: string): Tagged | undefined {
  for (const [k, v] of obj) if (k === name) return v;
  return undefined;
}

/**
 * The inverse of `entryToTagged`. STRICT: a missing or wrongly-shaped field is a refusal, never a
 * default.
 *
 * A defaulted `seq` would replay a log tail from the wrong point — losing committed deltas with no
 * error anywhere, which is the failure durability exists to prevent. A defaulted `delta` would be
 * worse: the commit's content vanishes while the sequence still advances, so the log looks complete.
 */
export function taggedToEntry(t: Tagged): EntryParse {
  if (t.t !== "obj") return { ok: false, why: `entry is not an object: ${t.t}` };

  const seqT = field(t.v, "seq");
  const deltaT = field(t.v, "delta");
  const capturedT = field(t.v, "captured");

  if (seqT === undefined || seqT.t !== "int") return { ok: false, why: 'entry "seq" is missing or not an int' };
  const seq = Number(seqT.v);
  if (!Number.isSafeInteger(seq)) return { ok: false, why: `entry "seq" is not a sequence: ${seqT.v}` };

  if (deltaT === undefined || deltaT.t !== "arr") return { ok: false, why: 'entry "delta" is missing or not an array' };
  const delta: [string, number][] = [];
  for (const pair of deltaT.v) {
    if (pair.t !== "arr" || pair.v.length !== 2) {
      return { ok: false, why: "entry delta item is not a [key, weight] pair" };
    }
    const k = pair.v[0];
    const w = pair.v[1];
    if (k === undefined || k.t !== "str") return { ok: false, why: "entry delta key is not a string" };
    if (w === undefined || w.t !== "int") return { ok: false, why: "entry delta weight is not an int" };
    const weight = Number(w.v);
    if (!Number.isSafeInteger(weight)) return { ok: false, why: `entry delta weight is not an integer: ${w.v}` };
    delta.push([k.v, weight]);
  }

  if (capturedT === undefined || capturedT.t !== "obj") {
    return { ok: false, why: 'entry "captured" is missing or not an object' };
  }
  const captured: Record<string, string> = {};
  for (const [k, v] of capturedT.v) {
    if (v.t !== "str") return { ok: false, why: `entry captured key "${k}" is not a string` };
    captured[k] = v.v;
  }

  return { ok: true, entry: { seq, delta, captured } };
}

/** Encode an entry to its canonical CBOR frame. Throws only on an encoder error, which is a bug. */
export function encodeEntry(entry: CanonicalEntry): number[] {
  const enc = canonicalCbor(entryToTagged(entry));
  if (!enc.ok) throw new Error(`DeltaLogEntry encode failed: ${JSON.stringify(enc.error)}`);
  return enc.value;
}

/** Decode a canonical CBOR frame back to an entry. */
export function decodeEntry(bytes: readonly number[]): EntryParse {
  const dec = fromCanonicalCbor([...bytes]);
  if (!dec.ok) return { ok: false, why: `frame is not canonical CBOR: ${JSON.stringify(dec.error)}` };
  return taggedToEntry(dec.value);
}
