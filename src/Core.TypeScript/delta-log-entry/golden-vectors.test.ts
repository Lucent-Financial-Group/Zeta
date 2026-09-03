import { test, expect } from "bun:test";
import seed from "./golden-vectors.json";
import { canonicalCbor, toHex, fromHex, fromCanonicalCbor } from "../dynamic-value/cbor";
import { type CanonicalEntry, entryToTagged, decodeEntry } from "./entry-codec";

// ═══════════════════════════════════════════════════════════════════
// Log noun — the TS oracle for the DeltaLogEntry byte-lock (workitem 081KTGD5JMD). Replays the shared
// seed (this directory's golden-vectors.json) that the F# reference oracle produced, and asserts TS
// reproduces byte-identical canonical CBOR + round-trips it. A whole entry { seq; delta; captured } maps
// to a DynamicValue object (obj keys captured/delta/seq, ordinal order; captured keys ordinal-sorted)
// riding the already-4-language-locked DynamicValue canonical CBOR — so the Log entry inherits the
// byte-lock with no new canonical encoding (an entry is just a DynamicValue). Mirrors F#
// DeltaLogEntryDynamic.toDynamicValue (src/Core/DeltaCodec.fs) + the C# oracle.
// ═══════════════════════════════════════════════════════════════════

// The encoder under test now lives in `entry-codec.ts` and is IMPORTED, not redefined here. It
// used to be a copy local to this file, which meant these vectors locked a function nothing
// shipped — a green byte-lock with no writer behind it. Importing it is what makes the lock
// cover the product.
type Entry = CanonicalEntry;

const vectors = (seed as unknown as { vectors: { name: string; entry: Entry; cbor: string }[] }).vectors;

test("seed has the DeltaLogEntry vectors", () => {
  expect(vectors.length).toBeGreaterThanOrEqual(5);
});

for (const v of vectors) {
  test(`TS DeltaLogEntry byte-lock: ${v.name}`, () => {
    // encode → must equal the seed hex (the cross-language byte-lock)
    const enc1 = canonicalCbor(entryToTagged(v.entry));
    expect(enc1.ok).toBe(true);
    expect(toHex(enc1.ok ? enc1.value : [])).toBe(v.cbor);

    // decode(seed hex) → re-encode → must equal the seed hex (round-trip stability)
    const decoded = fromCanonicalCbor(fromHex(v.cbor));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      const enc2 = canonicalCbor(decoded.value);
      expect(enc2.ok).toBe(true);
      expect(toHex(enc2.ok ? enc2.value : [])).toBe(v.cbor);
    }
  });
}

// ── THE DECODER ─────────────────────────────────────────────────────────────
// Every assertion above goes encode → hex, or hex → decode → re-encode → hex. Both directions run
// through the ENCODER, so a decoder could have been absent or wrong and the byte-lock stayed green.
// These assert the other direction against the same shared seed: the bytes the F# oracle produced
// must come back as the entry the F# oracle started from.
for (const v of vectors) {
  test(`TS DeltaLogEntry decodes the shared seed: ${v.name}`, () => {
    const decoded = decodeEntry(fromHex(v.cbor));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    expect(decoded.entry.seq).toBe(v.entry.seq);
    expect(decoded.entry.captured).toEqual(v.entry.captured);
    // Ordinal order, because that is the order the canonical frame carries.
    const expected = v.entry.delta.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    expect(decoded.entry.delta).toEqual(expected);
  });
}

test("the decoder REFUSES a frame that is not an entry, rather than defaulting", () => {
  // A defaulted seq replays the tail from the wrong point and loses committed deltas with no error
  // anywhere. Refusal is the only safe reading of an unparseable frame.
  const notAnEntry = canonicalCbor({ t: "arr", v: [{ t: "int", v: "1" }] });
  expect(notAnEntry.ok).toBe(true);
  const r = decodeEntry(notAnEntry.ok ? notAnEntry.value : []);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.why).toContain("not an object");
});

test("the decoder REFUSES an entry whose seq is missing", () => {
  const missingSeq = canonicalCbor({
    t: "obj",
    v: [
      ["captured", { t: "obj", v: [] }],
      ["delta", { t: "arr", v: [] }],
    ],
  });
  expect(missingSeq.ok).toBe(true);
  const r = decodeEntry(missingSeq.ok ? missingSeq.value : []);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.why).toContain("seq");
});
