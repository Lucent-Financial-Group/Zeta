/**
 * Composable Factor Benchmark: content-addressed ETTh1 acquisition and deterministic examples.
 * Public data is not tracked here; callers supply bytes and a checked manifest.
 */

import { createHash } from "node:crypto";

export interface Etth1Manifest {
  readonly dataset: {
    readonly sha256: string;
    readonly byteLength: number;
    readonly dataRowCount: number;
    readonly columns: readonly string[];
    readonly firstTimestamp: string;
    readonly lastTimestamp: string;
    readonly cadenceSeconds: number;
  };
  readonly benchmark: {
    readonly targetColumn: string;
    readonly inputLength: number;
    readonly forecastHorizon: number;
    readonly exampleCount: number;
    readonly splitExampleCounts: {
      readonly train: number;
      readonly validation: number;
      readonly test: number;
    };
    readonly bootstrap: {
      readonly algorithm: "xorshift32-moving-block";
      readonly seed: number;
      readonly replicates: number;
      readonly blockLength: number;
    };
  };
}

export interface Etth1Row {
  readonly timestamp: string;
  readonly timestampMs: number;
  readonly values: readonly number[];
}

export interface Etth1Dataset {
  readonly sha256: string;
  readonly columns: readonly string[];
  readonly rows: readonly Etth1Row[];
  readonly targetColumnIndex: number;
}

export type Etth1Split = "train" | "validation" | "test";

export interface Etth1Example {
  readonly exampleIndex: number;
  readonly split: Etth1Split;
  readonly inputStartRow: number;
  readonly inputEndRow: number;
  readonly targetRow: number;
  readonly inputTargetValues: readonly number[];
  readonly target: number;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseUtcTimestamp(text: string): number {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    throw new Error(`ETTH1-TIMESTAMP-FORMAT:${text}`);
  }
  const parsed = Date.parse(`${text.replace(" ", "T")}Z`);
  if (!Number.isFinite(parsed)) {
    throw new Error(`ETTH1-TIMESTAMP-INVALID:${text}`);
  }
  return parsed;
}

function parseFinite(text: string, rowIndex: number, column: string): number {
  const value = Number(text);
  if (!Number.isFinite(value)) {
    throw new Error(`ETTH1-NON-FINITE:row=${String(rowIndex)}:column=${column}`);
  }
  return value;
}

export function parseAndValidateEtth1(bytes: Uint8Array, manifest: Etth1Manifest): Etth1Dataset {
  if (bytes.byteLength !== manifest.dataset.byteLength) {
    throw new Error(`ETTH1-BYTE-LENGTH:${String(bytes.byteLength)}`);
  }
  const digest = sha256Hex(bytes);
  if (digest !== manifest.dataset.sha256) {
    throw new Error(`ETTH1-DIGEST:${digest}`);
  }

  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const lines = text.trimEnd().split(/\r?\n/);
  const headerLine = lines[0];
  if (headerLine === undefined) throw new Error("ETTH1-EMPTY");
  const columns = headerLine.split(",");
  if (columns.length !== manifest.dataset.columns.length || columns.some((column, index) => column !== manifest.dataset.columns[index])) {
    throw new Error(`ETTH1-SCHEMA:${columns.join(",")}`);
  }
  const dataLines = lines.slice(1);
  if (dataLines.length !== manifest.dataset.dataRowCount) {
    throw new Error(`ETTH1-ROW-COUNT:${String(dataLines.length)}`);
  }

  const numericColumns = columns.slice(1);
  const rows = dataLines.map((line, rowIndex): Etth1Row => {
    const fields = line.split(",");
    if (fields.length !== columns.length) {
      throw new Error(`ETTH1-FIELD-COUNT:row=${String(rowIndex)}:fields=${String(fields.length)}`);
    }
    const timestamp = fields[0];
    if (timestamp === undefined) throw new Error(`ETTH1-MISSING-TIMESTAMP:row=${String(rowIndex)}`);
    const values = numericColumns.map((column, numericIndex) => {
      const field = fields[numericIndex + 1];
      if (field === undefined) throw new Error(`ETTH1-MISSING:row=${String(rowIndex)}:column=${column}`);
      return parseFinite(field, rowIndex, column);
    });
    return { timestamp, timestampMs: parseUtcTimestamp(timestamp), values };
  });

  const first = rows[0];
  const last = rows[rows.length - 1];
  if (first?.timestamp !== manifest.dataset.firstTimestamp) {
    throw new Error(`ETTH1-FIRST-TIMESTAMP:${first?.timestamp ?? "missing"}`);
  }
  if (last?.timestamp !== manifest.dataset.lastTimestamp) {
    throw new Error(`ETTH1-LAST-TIMESTAMP:${last?.timestamp ?? "missing"}`);
  }
  const expectedStepMs = manifest.dataset.cadenceSeconds * 1_000;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (previous === undefined || current === undefined || current.timestampMs - previous.timestampMs !== expectedStepMs) {
      throw new Error(`ETTH1-CADENCE:row=${String(index)}`);
    }
  }
  const targetColumnIndex = columns.indexOf(manifest.benchmark.targetColumn) - 1;
  if (targetColumnIndex < 0) throw new Error(`ETTH1-TARGET:${manifest.benchmark.targetColumn}`);
  return { sha256: digest, columns, rows, targetColumnIndex };
}

export function buildEtth1Examples(dataset: Etth1Dataset, manifest: Etth1Manifest): readonly Etth1Example[] {
  const { inputLength, forecastHorizon, exampleCount, splitExampleCounts } = manifest.benchmark;
  const expectedCount = dataset.rows.length - inputLength - forecastHorizon + 1;
  if (expectedCount !== exampleCount) {
    throw new Error(`ETTH1-EXAMPLE-COUNT:${String(expectedCount)}`);
  }
  const splitTotal = splitExampleCounts.train + splitExampleCounts.validation + splitExampleCounts.test;
  if (splitTotal !== exampleCount) {
    throw new Error(`ETTH1-SPLIT-TOTAL:${String(splitTotal)}`);
  }
  const validationStart = splitExampleCounts.train;
  const testStart = validationStart + splitExampleCounts.validation;

  return Array.from({ length: exampleCount }, (_, exampleIndex): Etth1Example => {
    const inputStartRow = exampleIndex;
    const inputEndRow = inputStartRow + inputLength - 1;
    const targetRow = inputEndRow + forecastHorizon;
    const split: Etth1Split = exampleIndex < validationStart ? "train" : exampleIndex < testStart ? "validation" : "test";
    const inputRows = dataset.rows.slice(inputStartRow, inputEndRow + 1);
    const inputTargetValues = inputRows.map((row) => {
      const value = row.values[dataset.targetColumnIndex];
      if (value === undefined) throw new Error(`ETTH1-TARGET-MISSING:row=${String(inputStartRow)}`);
      return value;
    });
    const target = dataset.rows[targetRow]?.values[dataset.targetColumnIndex];
    if (target === undefined) throw new Error(`ETTH1-TARGET-ROW:${String(targetRow)}`);
    return { exampleIndex, split, inputStartRow, inputEndRow, targetRow, inputTargetValues, target };
  });
}

export function assertNoSplitLeakage(examples: readonly Etth1Example[]): void {
  const firstBySplit = new Map<Etth1Split, Etth1Example>();
  const lastBySplit = new Map<Etth1Split, Etth1Example>();
  for (const example of examples) {
    if (!firstBySplit.has(example.split)) firstBySplit.set(example.split, example);
    lastBySplit.set(example.split, example);
  }
  for (const split of ["train", "validation", "test"] as const) {
    const first = firstBySplit.get(split);
    const last = lastBySplit.get(split);
    if (first === undefined || last === undefined) throw new Error(`ETTH1-SPLIT-EMPTY:${split}`);
    if (first.exampleIndex > last.exampleIndex) throw new Error(`ETTH1-SPLIT-ORDER:${split}`);
  }
  const trainLast = lastBySplit.get("train");
  const validationFirst = firstBySplit.get("validation");
  const validationLast = lastBySplit.get("validation");
  const testFirst = firstBySplit.get("test");
  if (trainLast === undefined || validationFirst === undefined || validationLast === undefined || testFirst === undefined) {
    throw new Error("ETTH1-SPLIT-BOUNDARY-MISSING");
  }
  if (trainLast.exampleIndex + 1 !== validationFirst.exampleIndex || validationLast.exampleIndex + 1 !== testFirst.exampleIndex) {
    throw new Error("ETTH1-SPLIT-GAP");
  }
}
