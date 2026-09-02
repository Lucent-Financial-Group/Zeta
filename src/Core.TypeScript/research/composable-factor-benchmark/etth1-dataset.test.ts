import { createHash } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
  assertNoSplitLeakage,
  buildEtth1Examples,
  parseAndValidateEtth1,
  type Etth1Manifest,
} from "./etth1-dataset";

const csv = [
  "date,HUFL,OT",
  "2026-01-01 00:00:00,1,10",
  "2026-01-01 01:00:00,2,11",
  "2026-01-01 02:00:00,3,12",
  "2026-01-01 03:00:00,4,13",
  "2026-01-01 04:00:00,5,14",
  "2026-01-01 05:00:00,6,15",
  "2026-01-01 06:00:00,7,16",
  "2026-01-01 07:00:00,8,17",
  "",
].join("\n");
const bytes = new TextEncoder().encode(csv);

function manifest(overrides: Partial<Etth1Manifest["dataset"]> = {}): Etth1Manifest {
  return {
    dataset: {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.byteLength,
      dataRowCount: 8,
      columns: ["date", "HUFL", "OT"],
      firstTimestamp: "2026-01-01 00:00:00",
      lastTimestamp: "2026-01-01 07:00:00",
      cadenceSeconds: 3_600,
      ...overrides,
    },
    benchmark: {
      targetColumn: "OT",
      inputLength: 2,
      forecastHorizon: 2,
      exampleCount: 5,
      splitExampleCounts: { train: 3, validation: 1, test: 1 },
      bootstrap: {
        algorithm: "xorshift32-moving-block",
        seed: 1,
        replicates: 10,
        blockLength: 2,
      },
    },
  };
}

describe("ETTh1 content-addressed acquisition", () => {
  test("parses a valid hourly dataset and constructs chronological windows", () => {
    const declared = manifest();
    const dataset = parseAndValidateEtth1(bytes, declared);
    const examples = buildEtth1Examples(dataset, declared);
    assertNoSplitLeakage(examples);

    expect(examples).toHaveLength(5);
    expect(examples[0]).toMatchObject({ split: "train", inputStartRow: 0, inputEndRow: 1, targetRow: 3, target: 13 });
    expect(examples[3]).toMatchObject({ split: "validation", inputStartRow: 3, targetRow: 6, target: 16 });
    expect(examples[4]).toMatchObject({ split: "test", inputStartRow: 4, targetRow: 7, target: 17 });
  });

  test("rejects digest, schema, cadence, and non-finite mutations", () => {
    expect(() => parseAndValidateEtth1(bytes, manifest({ sha256: "0".repeat(64) }))).toThrow("ETTH1-DIGEST");
    expect(() => parseAndValidateEtth1(bytes, manifest({ columns: ["date", "OT", "HUFL"] }))).toThrow("ETTH1-SCHEMA");
    expect(() => parseAndValidateEtth1(bytes, manifest({ cadenceSeconds: 7_200 }))).toThrow("ETTH1-CADENCE");

    const mutated = new TextEncoder().encode(csv.replace("4,13", "4,NaN"));
    const mutatedManifest = manifest({
      sha256: createHash("sha256").update(mutated).digest("hex"),
      byteLength: mutated.byteLength,
    });
    expect(() => parseAndValidateEtth1(mutated, mutatedManifest)).toThrow("ETTH1-NON-FINITE");
  });

  test("rejects an example or split count that does not match the declared window rule", () => {
    const declared = manifest();
    const dataset = parseAndValidateEtth1(bytes, declared);
    const wrongExampleCount: Etth1Manifest = {
      ...declared,
      benchmark: { ...declared.benchmark, exampleCount: 4 },
    };
    expect(() => buildEtth1Examples(dataset, wrongExampleCount)).toThrow("ETTH1-EXAMPLE-COUNT");

    const wrongSplit: Etth1Manifest = {
      ...declared,
      benchmark: { ...declared.benchmark, splitExampleCounts: { train: 2, validation: 1, test: 1 } },
    };
    expect(() => buildEtth1Examples(dataset, wrongSplit)).toThrow("ETTH1-SPLIT-TOTAL");
  });
});
