#!/usr/bin/env bun
/**
 * generate-delta-log-interop-fixture.ts — write a delta-log directory with the TypeScript
 * implementation, so the F# one can REPLAY IT AT RUNTIME.
 *
 * ── WHY THIS EXISTS AND THE GOLDEN VECTORS DO NOT COVER IT ───────────────────
 * `delta-log-entry/golden-vectors.json` already locks the FRAME — one entry's canonical CBOR,
 * byte-identical across four languages. That is a codec treaty, and it says nothing about the
 * directory the frames live in: the filename, the padding, the exclusive-replay boundary, the
 * high-water recovery, which files `truncate` unlinks. Two implementations can agree on every byte
 * of every frame and still be unable to read each other's LOG.
 *
 * So this writes a real log with the real `DiskDeltaLog` — the same `append` a live spine calls —
 * and records what it wrote. `tests/Tests.FSharp/DeltaLogInterop.Tests.fs` then constructs an F#
 * `DiskDeltaLog` over those exact files and replays them, asserting the sequences, the deltas, and
 * the captured metadata all arrive. The crossing is the claim; the frames were already pinned.
 *
 * ── WHY THE FIXTURE IS HEX-IN-JSON AND NOT THE DIRECTORY ITSELF ──────────────
 * The frames are canonical CBOR, so committing the `.delta` files directly would put BINARY in the
 * proof lineage. `no-binary-in-proof-lineage` forbids that, and its enforcer
 * (`audit-proof-lineage-binaries.ts`) is scoped to `src/wasm-dla/bytelock/` — so a binary fixture
 * here would be unaudited as well as forbidden, which is the drift the rule exists to catch.
 *
 * The fixture is therefore the exact bytes TypeScript wrote, recorded as lowercase hex in JSON
 * alongside the exact filenames it chose. The F# test materialises a directory from it and runs the
 * REAL `DiskDeltaLog` over that. Nothing is re-encoded on the way: the hex is read back verbatim
 * from the files `append` produced, so the crossing is over TypeScript's own bytes and the record
 * of them stays diffable.
 *
 * ── WHY THE FIXTURE IS COMMITTED RATHER THAN GENERATED IN THE TEST ───────────
 * A test that generates its input with the same code it is testing checks that code against
 * itself. Committing the artifact means the F# test replays bytes produced by a specific
 * TypeScript revision, and a later TypeScript change that breaks the crossing shows up as a red
 * test rather than as a fixture that quietly regenerates to match.
 *
 * Usage: bun src/Core.TypeScript/durability/generate-delta-log-interop-fixture.ts
 */

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ofEntries } from "../z-set/z-set";
import { stringCompare } from "../z-set/z-set";
import { DiskDeltaLog } from "./disk-delta-log";

/** The committed, text fixture the F# test reads. */
export const FIXTURE_FILE = join(import.meta.dir, "delta-log-interop-fixture.json");

/** The scratch directory the real writer produces. NOT committed — the JSON above is the record. */
export const FIXTURE_DIR = join(import.meta.dir, "delta-log-interop-fixture");

const cmp = stringCompare;

/**
 * Three entries, chosen so the crossing has something to fail on:
 *
 *   1. multi-key with a NEGATIVE weight — a retraction, which is the case a naive unsigned codec
 *      would mangle, and it carries captured metadata.
 *   2. case-mixed keys — ordinal vs locale collation orders `[B, a]` differently, so a
 *      `localeCompare` on either side reorders the frame and the bytes stop matching.
 *   3. empty delta with empty captured — the degenerate frame, which is where an encoder that
 *      writes `null` instead of an empty container diverges.
 */
const entries: { delta: readonly (readonly [string, number])[]; captured: readonly (readonly [string, string])[] }[] = [
  {
    delta: [
      ["alpha", 2],
      ["beta", -1],
    ],
    captured: [
      ["clock", "1700000000"],
      ["seed", "4"],
    ],
  },
  {
    delta: [
      ["B", 1],
      ["a", 1],
      ["A", -3],
      ["b", 5],
    ],
    captured: [["note", "case-mixed: ordinal order is A,B,a,b"]],
  },
  { delta: [], captured: [] },
];

if (import.meta.main) {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  mkdirSync(FIXTURE_DIR, { recursive: true });

  const log = new DiskDeltaLog({ dir: FIXTURE_DIR }, cmp);
  for (const e of entries) {
    await log.append(
      ofEntries(
        cmp,
        e.delta.map(([k, w]) => ({ e: k, w })),
      ),
      new Map(e.captured),
    );
  }

  // Read it back through a FRESH instance, so a fixture the writer itself cannot reopen never ships.
  const reread = await new DiskDeltaLog({ dir: FIXTURE_DIR }, cmp).replay(0);
  if (reread.length !== entries.length) {
    throw new Error(
      `the fixture does not reopen through its own writer: expected ${entries.length} entries, replayed ${reread.length} — refusing to write it`,
    );
  }

  // Record the bytes VERBATIM from the files `append` produced — never re-encoded here, so the
  // fixture cannot drift from what the writer actually wrote.
  const files = readdirSync(FIXTURE_DIR)
    .filter((n) => n.endsWith(".delta"))
    .sort()
    .map((name) => ({
      name,
      hex: [...readFileSync(join(FIXTURE_DIR, name))].map((b) => b.toString(16).padStart(2, "0")).join(""),
    }));

  writeFileSync(
    FIXTURE_FILE,
    `${JSON.stringify(
      {
        _comment:
          "A delta-log directory written by the TypeScript DiskDeltaLog (src/Core.TypeScript/durability/disk-delta-log.ts), recorded as hex-in-JSON per .claude/rules/no-binary-in-proof-lineage.md. tests/Tests.FSharp/DeltaLogInterop.Tests.fs materialises these files and replays them with the REAL F# DiskDeltaLog. Regenerate: bun src/Core.TypeScript/durability/generate-delta-log-interop-fixture.ts",
        files,
      },
      null,
      2,
    )}
`,
  );

  // The directory was the writer's working output; the JSON is the artifact. Removing it keeps a
  // stray binary from being committed by a later `git add -A`.
  rmSync(FIXTURE_DIR, { recursive: true, force: true });

  console.log(`wrote ${FIXTURE_FILE}`);
  for (const f of files) console.log(`  ${f.name}  ${f.hex.length / 2} bytes`);
  console.log(`
replayed ${reread.length} entries, seqs: ${reread.map((e) => e.seq).join(", ")}`);
}
