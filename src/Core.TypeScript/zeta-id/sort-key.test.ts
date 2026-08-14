import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  KNOWN_ID_VERSIONS,
  ZetaIdSortError,
  categoryOf,
  compareByField,
  compareByIdentity,
  compareByTime,
  extractField,
  hasTimeField,
  identitySortKey,
  isTimeSortableSet,
  layoutClassOf,
  timeSortKey,
  versionOf,
} from "./sort-key";
import { pack, packGeneric, DETERMINISTIC_ENV } from "./zeta-id";
import { parse, format } from "./encoding";
import { BIT_MASKS } from "./zeta-id.gen";
import { Category, Chromosome, IdVersion, type Milliseconds, type ZetaId, type ZetaObservation } from "./types";

const observation = (timestampMs: number, category: number = Category.WorkItem): ZetaId =>
  pack(
    {
      version: IdVersion.V1,
      timestamp: timestampMs as Milliseconds,
      chromosome: Chromosome.MetaCoherence,
      category: category as ZetaObservation["category"],
      authority: { type: "Standard" },
      persona: 0 as ZetaObservation["persona"],
      momentum: { type: "Normal" },
      location: 0 as ZetaObservation["location"],
    },
    DETERMINISTIC_ENV,
  );

/** Force a version into an already-packed id (versions > 1 cannot be minted yet). */
const withVersion = (id: ZetaId, version: number): ZetaId =>
  ((((id as bigint) & ~(31n << 123n)) | (BigInt(version) << 123n)) as ZetaId);

// ── The registry treaty ───────────────────────────────────────────────────

test("KNOWN_ID_VERSIONS mirrors registry/id-versions.yaml", () => {
  const yaml = readFileSync(join(import.meta.dir, "..", "..", "..", "registry", "id-versions.yaml"), "utf8");
  const registered = new Set(
    [...yaml.matchAll(/^\s*-\s*id:\s*(\d+)\s*$/gm)].map((m) => Number(m[1])),
  );
  expect([...registered].sort((a, b) => a - b)).toEqual([...KNOWN_ID_VERSIONS].sort((a, b) => a - b));
});

// ── Layout classification ─────────────────────────────────────────────────

test("categories 0..8 are the observation layout and carry a time field", () => {
  for (let category = 0; category <= 8; category++) {
    const id = observation(1_755_000_000_000, category);
    expect(layoutClassOf(id)).toBe("observation");
    expect(hasTimeField(id)).toBe(true);
  }
});

test("category 9 (ContentAddress) has no time field", () => {
  const id = packGeneric(1, Category.ContentAddress, (1n << 118n) | 12345n);
  expect(layoutClassOf(id)).toBe("content-address");
  expect(hasTimeField(id)).toBe(false);
});

test("categories >= 10 (Generic) have no time field", () => {
  const id = packGeneric(1, Category.InventoryAsset, (1n << 117n) | 999n);
  expect(layoutClassOf(id)).toBe("generic");
  expect(hasTimeField(id)).toBe(false);
});

test("an unknown version is 'unknown-version' regardless of category", () => {
  for (const version of [0, 2, 3, 15, 31]) {
    const id = withVersion(observation(1_755_000_000_000), version);
    expect(layoutClassOf(id)).toBe("unknown-version");
    expect(hasTimeField(id)).toBe(false);
  }
});

// ── THE GUARD: time order refuses rather than mis-orders ──────────────────

test("timeSortKey REFUSES an unknown version (the v3 case, before v3 exists)", () => {
  const v3 = withVersion(observation(1_755_000_000_000), 3);
  expect(() => timeSortKey(v3)).toThrow(ZetaIdSortError);
  expect(() => timeSortKey(v3)).toThrow(/unknown-version/);
});

test("timeSortKey REFUSES a content-address id", () => {
  const ca = packGeneric(1, Category.ContentAddress, (1n << 118n) | 7n);
  expect(() => timeSortKey(ca)).toThrow(ZetaIdSortError);
});

test("timeSortKey REFUSES a generic/inventory id (the defect that exists TODAY)", () => {
  // The exact shape inventory/new-item.ts mints: ms in the top 41 bits of a
  // 119-bit generic payload. Read as an observation timestamp this is the year 9200.
  const payload = (BigInt(1_755_000_000_000) << 78n) | 0x1234n;
  const item = packGeneric(1, Category.InventoryAsset, payload);
  const naive = extractField(item, BIT_MASKS.timestamp.offset, BIT_MASKS.timestamp.width);
  expect(naive).toBeGreaterThan(200_000_000_000_000n); // far past any real epoch ms
  expect(() => timeSortKey(item)).toThrow(ZetaIdSortError);
});

test("the live inventory ids are exactly this case", () => {
  // Measured 2026-08-14 from inventory/items/. Whole-id order puts these after
  // every observation id ever minted; timeSortKey refuses instead of pretending.
  for (const s of ["0EFJ9RW179ZFT9WBMXZZNYM92A", "0EFJ9RW1DD28A33YN3F9NCAP9E"]) {
    const id = parse(s);
    expect(versionOf(id)).toBe(1);
    expect(categoryOf(id)).toBe(Category.InventoryAsset);
    expect(() => timeSortKey(id)).toThrow(ZetaIdSortError);
  }
});

test("timeSortKey ACCEPTS an observation id and returns its ms", () => {
  expect(timeSortKey(observation(1_755_000_000_000))).toBe(1_755_000_000_000n);
});

// ── Identity order is version-agnostic on purpose ─────────────────────────

test("identity order works on every id including unknown versions", () => {
  const ids = [
    withVersion(observation(3_000), 7),
    observation(1_000),
    packGeneric(1, Category.ContentAddress, 42n),
    observation(2_000),
  ];
  const sorted = [...ids].sort(compareByIdentity);
  for (let i = 1; i < sorted.length; i++) {
    expect(identitySortKey(sorted[i - 1]!) < identitySortKey(sorted[i]!)).toBe(true);
  }
});

test("identity order == canonical base32 string order (the filename claim)", () => {
  const ids = [
    withVersion(observation(9_000), 5),
    observation(1_000),
    packGeneric(1, Category.InventoryAsset, 1n << 118n),
    observation(1_755_000_000_000),
  ];
  const byId = [...ids].sort(compareByIdentity).map(format);
  const byString = ids.map(format).sort();
  expect(byId).toEqual(byString);
});

// ── Masked alternative sorts ──────────────────────────────────────────────

test("compareByField orders by any declared contiguous field", () => {
  const byCategory = compareByField(BIT_MASKS.category.offset, BIT_MASKS.category.width);
  const ids = [observation(5_000, 8), observation(9_000, 1), observation(1_000, 3)];
  expect(ids.slice().sort(byCategory).map(categoryOf)).toEqual([1, 3, 8]);
  // Same ids, a different declared field, a different (also correct) order.
  const byTime = compareByField(BIT_MASKS.timestamp.offset, BIT_MASKS.timestamp.width);
  expect(ids.slice().sort(byTime).map((i) => Number(timeSortKey(i)))).toEqual([1_000, 5_000, 9_000]);
});

test("compareByTime agrees with whole-id order WITHIN the observation layout", () => {
  const ids = [observation(3_000), observation(1_000), observation(2_000)];
  expect(ids.slice().sort(compareByTime).map(format)).toEqual(ids.slice().sort(compareByIdentity).map(format));
});

test("isTimeSortableSet holds for an all-observation set", () => {
  expect(isTimeSortableSet([observation(1_000), observation(2_000), observation(3_000)])).toBe(true);
});

test("isTimeSortableSet refuses a mixed-layout set rather than answering", () => {
  expect(() =>
    isTimeSortableSet([observation(1_000), packGeneric(1, Category.InventoryAsset, 1n << 118n)]),
  ).toThrow(ZetaIdSortError);
});

// ── The live corpus: the documented claim, actually checked ───────────────

test("workitems/ filenames really are chronological under the observation layout", () => {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const dir = join(import.meta.dir, "..", "..", "..", "workitems");
  const ids: ZetaId[] = [];
  for (const name of readdirSync(dir)) {
    const m = /^([0-9A-HJKMNP-TV-Z]{26})-/.exec(name);
    if (m) ids.push(parse(m[1]!));
  }
  expect(ids.length).toBeGreaterThan(100); // guard against a vacuous pass
  expect(ids.every(hasTimeField)).toBe(true);
  expect(isTimeSortableSet(ids)).toBe(true);
});
