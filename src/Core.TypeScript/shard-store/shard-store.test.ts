/**
 * shard-store.test.ts — the convention itself, tested where it lives.
 *
 * The shape had been written three times before it was one module. These are the four decisions
 * every copy re-derived, so they are asserted once, here, rather than once per copy: canonical
 * bytes, a content-derived id, a UTC date path, and a set-union read.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toHex } from "../zeta-id/encoding";
import { Category } from "../zeta-id/types";
import {
  canonicalJson,
  dateSegments,
  readShards,
  shardPath,
  shardZetaId,
  SHARD_ID_RE,
  writeShard,
} from "./shard-store";

const roots: string[] = [];
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "shard-store-"));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  while (roots.length > 0) {
    const dir = roots.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

interface Rec {
  readonly id: string;
  readonly nested: { readonly b: number; readonly a: number };
}
const rec = (id = "r1"): Rec => ({ id, nested: { b: 2, a: 1 } });
const AT = Date.parse("2026-09-03T10:00:00.000Z");
const spec = (value: unknown = rec(), atMs = AT, prefix?: readonly string[]) => ({
  value,
  atMs,
  category: Category.Workflow,
  ...(prefix === undefined ? {} : { prefix }),
});

describe("canonical bytes", () => {
  test("key order does not change the output", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  test("NESTED keys are sorted too", () => {
    // Sorting only the top level leaves nested objects in insertion order, so two writers building
    // the same record by different code paths produce different bytes for the same content.
    const out = canonicalJson({ z: { d: 1, c: 2 }, a: 1 });
    expect(out.indexOf('"a"')).toBeLessThan(out.indexOf('"z"'));
    expect(out.indexOf('"c"')).toBeLessThan(out.indexOf('"d"'));
  });

  test("arrays keep their order — position is meaning", () => {
    expect(canonicalJson([3, 1, 2])).toContain("3");
    expect(JSON.parse(canonicalJson([3, 1, 2]))).toEqual([3, 1, 2]);
  });

  test("THE SORT IS ORDINAL, not locale-aware", () => {
    // The digest decides the filename, so a locale-aware sort makes the same record land at
    // different addresses on machines with different ICU data.
    const out = canonicalJson({ a: 1, B: 2 });
    expect(out.indexOf('"B"')).toBeLessThan(out.indexOf('"a"'));
    expect("a".localeCompare("B", "en")).toBeLessThan(0); // the collation this avoids
  });
});

describe("the id is a pure function of content and instant", () => {
  test("same content, same instant ⇒ same id", () => {
    expect(toHex(shardZetaId(rec(), AT, Category.Workflow))).toBe(
      toHex(shardZetaId(rec(), AT, Category.Workflow)),
    );
  });

  test("different CONTENT ⇒ different id, at the same instant", () => {
    expect(toHex(shardZetaId(rec("a"), AT, Category.Workflow))).not.toBe(
      toHex(shardZetaId(rec("b"), AT, Category.Workflow)),
    );
  });

  test("different INSTANT ⇒ different id, and ids sort chronologically", () => {
    const early = toHex(shardZetaId(rec(), AT, Category.Workflow));
    const late = toHex(shardZetaId(rec(), AT + 3_600_000, Category.Workflow));
    expect(early).not.toBe(late);
    // The instant lands in the high bits, so hex-filename order inside a directory is time order.
    expect(early < late).toBe(true);
  });

  test("the id is canonical 32-char hex", () => {
    expect(toHex(shardZetaId(rec(), AT, Category.Workflow))).toMatch(SHARD_ID_RE);
  });

  test("a non-finite instant is REFUSED, with a message naming the problem", () => {
    expect(() => shardZetaId(rec(), Number.NaN, Category.Workflow)).toThrow("unparseable timestamp");
  });
});

describe("the path", () => {
  test("is UTC-dated, zero-padded, with the prefix above the date", () => {
    const path = shardPath(spec(rec(), AT, ["alexa"]), "/root");
    const parts = path.split(/[\\/]/).filter((p) => p !== "" && p !== "root");
    expect(parts.slice(0, 4)).toEqual(["alexa", "2026", "09", "03"]);
  });

  test("THE DATE IS UTC, not local — for every boundary", () => {
    // The expectation is derived from the ISO string's OWN date part rather than hardcoded, so the
    // property is "the shard date is the instant's UTC date as written" — true on every machine,
    // and violated by a local-time read on any machine whose offset is not zero.
    //
    // The instants are chosen to cross each boundary a local read would shift: end and start of a
    // UTC day, of a month, and of a YEAR. A single mid-day instant cannot tell the two apart.
    for (const iso of [
      "2026-09-03T23:30:00.000Z",
      "2026-09-04T00:30:00.000Z",
      "2026-01-31T23:00:00.000Z",
      "2026-02-01T01:00:00.000Z",
      "2026-12-31T23:30:00.000Z",
      "2027-01-01T02:00:00.000Z",
      "2026-01-05T12:00:00.000Z",
    ]) {
      const datePart = iso.split("T")[0]!;
      expect(dateSegments(Date.parse(iso)).join("-")).toBe(datePart);
    }
  });

  test("dateSegments refuses a non-finite instant on its own account", () => {
    // Its own guard, not the mint's: `shardPath` calls both, so testing only through the mint
    // would leave this one covered by the wrong check — and `new Date(NaN).toISOString()` throws a
    // RangeError that says nothing about a shard record.
    expect(() => dateSegments(Number.NaN)).toThrow("unparseable timestamp");
    expect(() => dateSegments(Number.POSITIVE_INFINITY)).toThrow("unparseable timestamp");
  });

  test("an empty prefix is allowed and simply omitted", () => {
    const path = shardPath(spec(), "/root");
    expect(path.split(/[\\/]/).filter((p) => p !== "" && p !== "root").slice(0, 3)).toEqual(["2026", "09", "03"]);
  });
});

describe("writing and reading", () => {
  const identify = (r: Rec) => toHex(shardZetaId(r, AT, Category.Workflow));

  test("a write is idempotent — same record, same path, same bytes", () => {
    const root = tempRoot();
    const first = writeShard(spec(), root);
    const second = writeShard(spec(), root);
    expect(second).toBe(first);
    expect(readShards<Rec>(root, identify)).toHaveLength(1);
  });

  test("A MISSING ROOT IS AN EMPTY READ, not an error", () => {
    // Throwing would make "nothing has happened yet" indistinguishable from "something broke".
    expect(readShards<Rec>(join(tempRoot(), "never-written"), identify)).toEqual([]);
  });

  test("THE MERGE IS SET UNION — the same record at two paths counts once", () => {
    const root = tempRoot();
    writeShard(spec(), root);
    // The other branch's copy, landed under a different date directory as a hand-merge might do.
    // Identity is the re-minted content id, not the path.
    const stray = join(root, "2026", "09", "04");
    mkdirSync(stray, { recursive: true });
    const name = readdirSync(join(root, "2026", "09", "03"))[0]!;
    writeFileSync(join(stray, name), canonicalJson(rec()));
    expect(readShards<Rec>(root, identify)).toHaveLength(1);
  });

  test("A STRAY FILE IS NOT A RECORD — the name says what is ours", () => {
    // Reading every `.json` meant anything left in the directory — a config, an editor scratch, a
    // note — was parsed and returned as a record with whatever fields it happened to have.
    const root = tempRoot();
    writeShard(spec(), root);
    writeFileSync(join(root, "2026", "09", "03", "notes.json"), '{"id":"not-a-shard"}');
    writeFileSync(join(root, "2026", "09", "03", "README.md"), "ignored");
    const read = readShards<Rec>(root, identify);
    expect(read).toHaveLength(1);
    expect(read[0]?.id).toBe("r1");
  });

  test("genuinely different records are both kept", () => {
    const root = tempRoot();
    writeShard(spec(rec("a")), root);
    writeShard(spec(rec("b")), root);
    expect(readShards<Rec>(root, identify)).toHaveLength(2);
  });

  test("the bytes on disk are the canonical bytes", () => {
    const root = tempRoot();
    writeShard(spec(), root);
    const read = readShards<Rec>(root, identify);
    expect(read[0]).toEqual(rec());
  });
});
