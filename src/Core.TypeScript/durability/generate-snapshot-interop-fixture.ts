#!/usr/bin/env bun
/**
 * generate-snapshot-interop-fixture.ts — write a snapshot store directory with the TypeScript
 * implementation, so the F# one can READ IT AT RUNTIME.
 *
 * ── WHY A FIXTURE AND NOT AN ASSERTION ON BYTES ──────────────────────────────
 * `SnapshotManifestInterop.Tests.fs` already asserts that F# can deserialise the exact manifest
 * bytes TypeScript emits. That is a good check and it is not the claim: the claim is that a
 * `DiskSnapshotStore` in one runtime can open a directory the other one wrote. A hand-typed byte
 * string proves the format was transcribed correctly; it does not prove the writer produces it.
 *
 * So the fixture is produced by the REAL `DiskSnapshotStore` — same `write` call a live loop would
 * make — and committed. The F# test then constructs its own real store over that directory and asks
 * `LatestAsync` for the pointer. If either side's addressing drifts, the crossing stops working and
 * a test says so.
 *
 * ── WHAT THE FIXTURE DOES AND DOES NOT PIN ───────────────────────────────────
 * It pins the ADDRESSING — the `LATEST.json` manifest and the `snapshot-%020d.snap` filename — which
 * is what lets either runtime FIND what the other wrote.
 *
 * It does NOT pin the snapshot BYTES. Those need codec parity (canonical CBOR on both sides), which
 * is a separate treaty with its own golden vectors. The fixture therefore uses a transparent JSON
 * codec and the F# test reads only the manifest, not the payload. Said plainly so nobody mistakes a
 * green test for byte-level interop it does not check.
 *
 * Usage: bun src/Core.TypeScript/durability/generate-snapshot-interop-fixture.ts
 */

import { mkdirSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ofEntries, type ZSet } from "../z-set/z-set";
import type { IDeltaCodec } from "./delta-codec";
import { DiskSnapshotStore, MANIFEST_FILE } from "./disk-snapshot-store";

/** The sequence the fixture is written at. The F# test asserts this exact number. */
export const FIXTURE_SEQ = 11;

/** Where the fixture lives. Committed, so the F# test needs no generation step to run. */
export const FIXTURE_DIR = join(import.meta.dir, "snapshot-interop-fixture");

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * A transparent JSON codec.
 *
 * Deliberately NOT the CBOR codec: the payload bytes are not what this fixture pins, and using the
 * real codec here would imply a byte-level guarantee the F# test does not check.
 */
const jsonCodec: IDeltaCodec<string> = {
  encode: (z) => [...Buffer.from(JSON.stringify(z), "utf8")],
  decode: (bytes) => JSON.parse(Buffer.from(bytes).toString("utf8")) as ZSet<string>,
};

const state = (): ZSet<string> =>
  ofEntries(cmp, [
    { e: "b", w: 1 },
    { e: "a", w: -2 },
    { e: "c", w: 3 },
  ]);

if (import.meta.main) {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  mkdirSync(FIXTURE_DIR, { recursive: true });

  const store = new DiskSnapshotStore({ dir: FIXTURE_DIR, codec: jsonCodec });
  const pointer = await store.write(FIXTURE_SEQ, state());

  // Read it back through the same store, so a fixture that the WRITER cannot read never ships.
  const readBack = await store.read(pointer);
  if (JSON.stringify(readBack) !== JSON.stringify(state())) {
    throw new Error("the fixture does not round-trip through its own writer — refusing to write it");
  }

  console.log(`wrote fixture to ${FIXTURE_DIR}`);
  for (const f of readdirSync(FIXTURE_DIR).sort()) console.log(`  ${f}`);
  console.log(`\n${MANIFEST_FILE}: ${readFileSync(join(FIXTURE_DIR, MANIFEST_FILE), "utf8")}`);
  console.log(`pointer: ${JSON.stringify(pointer)}`);
}
