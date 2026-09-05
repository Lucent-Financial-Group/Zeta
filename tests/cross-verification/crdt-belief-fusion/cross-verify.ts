import { resolve } from "node:path";
import { measureCrdtBeliefFusion } from "../../../src/Core.TypeScript/research/composable-factor-benchmark/crdt-belief-fusion";
import { queryCanonicalGaussianEvidence } from "../../../src/Core.TypeScript/research/composable-factor-benchmark/crdt-evidence-query-adapter";

interface WitnessReport {
  readonly maxDifference: number;
  readonly leftCovariance00: number;
  readonly rightCovariance00: number;
  readonly leftWeight: number;
  readonly rightWeight: number;
}

interface OracleReport {
  readonly evidenceMerge: Readonly<Record<"idempotent" | "commutative" | "associative" | "monotonic" | "conflictRetained", boolean>>;
  readonly gaussianProduct: Readonly<Record<"idempotent" | "commutative" | "associative", boolean>> & { readonly repeatedEvidenceVarianceRatio: number };
  readonly fixedHalf: Readonly<Record<"idempotent" | "commutative" | "dominatesBothInputs", boolean>> & { readonly witness: WitnessReport | null };
  readonly traceGrid: Readonly<Record<"idempotent" | "commutative" | "dominatesBothInputs", boolean>> & { readonly witness: WitnessReport | null };
  readonly canonicalQuery: CanonicalQueryReport;
}

interface ReadyQueryReport {
  readonly status: "Ready";
  readonly algorithm: "canonical-kahan-gaussian-product/v1";
  readonly orderedFingerprints: readonly string[];
  readonly evidenceCount: number;
  readonly absorption: "ExactOnceByFingerprint";
  readonly posterior: { readonly mean: readonly number[]; readonly covariance: readonly (readonly number[])[] };
}

interface ConflictQueryReport {
  readonly status: "Conflict";
  readonly algorithm: "canonical-kahan-gaussian-product/v1";
  readonly orderedFingerprints: readonly string[];
  readonly evidenceCount: number;
  readonly conflictKeys: readonly string[];
}

interface CanonicalQueryReport {
  readonly permutationReceiptsIdentical: boolean;
  readonly redeliveryIdentical: boolean;
  readonly ready: ReadyQueryReport;
  readonly changedMean: ConflictQueryReport;
  readonly changedUncertainty: ConflictQueryReport;
  readonly kahanVsNaiveVariance00Different: boolean;
  readonly compensatedCancellationVariance00: number;
  readonly naiveCancellationVariance00: number;
  readonly orderSensitivePosteriorCount: number;
  readonly orderSensitiveReceiptsIdentical: boolean;
}

function close(left: number, right: number, tolerance = 1e-12): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function isBooleanRecord(value: unknown, keys: readonly string[]): value is Record<string, boolean> {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === "boolean");
}

function parseWitness(value: unknown): WitnessReport | null {
  if (value === null) return null;
  if (typeof value !== "object") throw new Error("CRDT-BELIEF-PYTHON-WITNESS-SCHEMA");
  const record = value as Record<string, unknown>;
  const keys = ["maxDifference", "leftCovariance00", "rightCovariance00", "leftWeight", "rightWeight"] as const;
  if (!keys.every((key) => typeof record[key] === "number" && Number.isFinite(record[key]))) {
    throw new Error("CRDT-BELIEF-PYTHON-WITNESS-SCHEMA");
  }
  return {
    maxDifference: record.maxDifference as number,
    leftCovariance00: record.leftCovariance00 as number,
    rightCovariance00: record.rightCovariance00 as number,
    leftWeight: record.leftWeight as number,
    rightWeight: record.rightWeight as number,
  };
}

function finiteVector(value: unknown, length: number, code: string): readonly number[] {
  if (!Array.isArray(value) || value.length !== length || !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    throw new Error(code);
  }
  return value as readonly number[];
}

function stringVector(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) throw new Error(code);
  return value as readonly string[];
}

function parseReadyQuery(value: unknown): ReadyQueryReport {
  const code = "CRDT-BELIEF-PYTHON-QUERY-READY-SCHEMA";
  if (typeof value !== "object" || value === null) throw new Error(code);
  const record = value as Record<string, unknown>;
  if (record.status !== "Ready" || record.algorithm !== "canonical-kahan-gaussian-product/v1" || record.absorption !== "ExactOnceByFingerprint" || typeof record.evidenceCount !== "number") {
    throw new Error(code);
  }
  if (typeof record.posterior !== "object" || record.posterior === null) throw new Error(code);
  const posterior = record.posterior as Record<string, unknown>;
  if (!Array.isArray(posterior.covariance) || posterior.covariance.length !== 2) throw new Error(code);
  return {
    status: "Ready",
    algorithm: "canonical-kahan-gaussian-product/v1",
    orderedFingerprints: stringVector(record.orderedFingerprints, code),
    evidenceCount: record.evidenceCount,
    absorption: "ExactOnceByFingerprint",
    posterior: {
      mean: finiteVector(posterior.mean, 2, code),
      covariance: posterior.covariance.map((row) => finiteVector(row, 2, code)),
    },
  };
}

function parseConflictQuery(value: unknown): ConflictQueryReport {
  const code = "CRDT-BELIEF-PYTHON-QUERY-CONFLICT-SCHEMA";
  if (typeof value !== "object" || value === null) throw new Error(code);
  const record = value as Record<string, unknown>;
  if (record.status !== "Conflict" || record.algorithm !== "canonical-kahan-gaussian-product/v1" || typeof record.evidenceCount !== "number") {
    throw new Error(code);
  }
  return {
    status: "Conflict",
    algorithm: "canonical-kahan-gaussian-product/v1",
    orderedFingerprints: stringVector(record.orderedFingerprints, code),
    evidenceCount: record.evidenceCount,
    conflictKeys: stringVector(record.conflictKeys, code),
  };
}

function parseCanonicalQuery(value: unknown): CanonicalQueryReport {
  const code = "CRDT-BELIEF-PYTHON-QUERY-SCHEMA";
  if (typeof value !== "object" || value === null) throw new Error(code);
  const record = value as Record<string, unknown>;
  const numericFields = ["compensatedCancellationVariance00", "naiveCancellationVariance00", "orderSensitivePosteriorCount"] as const;
  if (typeof record.permutationReceiptsIdentical !== "boolean" || typeof record.redeliveryIdentical !== "boolean" || typeof record.kahanVsNaiveVariance00Different !== "boolean" || typeof record.orderSensitiveReceiptsIdentical !== "boolean" || !numericFields.every((field) => typeof record[field] === "number" && Number.isFinite(record[field]))) {
    throw new Error(code);
  }
  return {
    permutationReceiptsIdentical: record.permutationReceiptsIdentical,
    redeliveryIdentical: record.redeliveryIdentical,
    ready: parseReadyQuery(record.ready),
    changedMean: parseConflictQuery(record.changedMean),
    changedUncertainty: parseConflictQuery(record.changedUncertainty),
    kahanVsNaiveVariance00Different: record.kahanVsNaiveVariance00Different,
    compensatedCancellationVariance00: record.compensatedCancellationVariance00 as number,
    naiveCancellationVariance00: record.naiveCancellationVariance00 as number,
    orderSensitivePosteriorCount: record.orderSensitivePosteriorCount as number,
    orderSensitiveReceiptsIdentical: record.orderSensitiveReceiptsIdentical,
  };
}

function parseReport(value: unknown): OracleReport {
  if (typeof value !== "object" || value === null) throw new Error("CRDT-BELIEF-PYTHON-SCHEMA");
  const root = value as Record<string, unknown>;
  if (!isBooleanRecord(root.evidenceMerge, ["idempotent", "commutative", "associative", "monotonic", "conflictRetained"])) {
    throw new Error("CRDT-BELIEF-PYTHON-EVIDENCE-SCHEMA");
  }
  if (!isBooleanRecord(root.gaussianProduct, ["idempotent", "commutative", "associative"])) {
    throw new Error("CRDT-BELIEF-PYTHON-GAUSSIAN-SCHEMA");
  }
  const gaussianProduct = root.gaussianProduct as Record<string, unknown>;
  if (typeof gaussianProduct.repeatedEvidenceVarianceRatio !== "number" || !Number.isFinite(gaussianProduct.repeatedEvidenceVarianceRatio)) {
    throw new Error("CRDT-BELIEF-PYTHON-GAUSSIAN-SCHEMA");
  }
  if (!isBooleanRecord(root.fixedHalf, ["idempotent", "commutative", "dominatesBothInputs"])) {
    throw new Error("CRDT-BELIEF-PYTHON-FIXED-SCHEMA");
  }
  if (!isBooleanRecord(root.traceGrid, ["idempotent", "commutative", "dominatesBothInputs"])) {
    throw new Error("CRDT-BELIEF-PYTHON-TRACE-SCHEMA");
  }
  const fixedHalf = root.fixedHalf as Record<string, unknown>;
  const traceGrid = root.traceGrid as Record<string, unknown>;
  return {
    evidenceMerge: root.evidenceMerge as OracleReport["evidenceMerge"],
    gaussianProduct: gaussianProduct as unknown as OracleReport["gaussianProduct"],
    fixedHalf: { ...(fixedHalf as OracleReport["fixedHalf"]), witness: parseWitness(fixedHalf.witness) },
    traceGrid: { ...(traceGrid as OracleReport["traceGrid"]), witness: parseWitness(traceGrid.witness) },
    canonicalQuery: parseCanonicalQuery(root.canonicalQuery),
  };
}

const root = resolve(import.meta.dir, "../../..");
const oracle = resolve(import.meta.dir, "crdt_belief_fusion_oracle.py");
const processResult = Bun.spawnSync(["python3", oracle], { cwd: root, stdout: "pipe", stderr: "pipe" });
if (processResult.exitCode !== 0) throw new Error(`CRDT-BELIEF-PYTHON-FAILED:${processResult.stderr.toString().trim()}`);
const oracleReport = parseReport(JSON.parse(processResult.stdout.toString()) as unknown);
const measured = measureCrdtBeliefFusion();
const failures: string[] = [];

for (const key of ["idempotent", "commutative", "associative", "monotonic", "conflictRetained"] as const) {
  if (oracleReport.evidenceMerge[key] !== measured.evidenceMerge[key]) failures.push(`evidenceMerge:${key}`);
}
if (oracleReport.gaussianProduct.idempotent !== measured.gaussianProductLaws.idempotent) failures.push("gaussian:idempotent");
if (oracleReport.gaussianProduct.commutative !== measured.gaussianProductLaws.commutative) failures.push("gaussian:commutative");
if (oracleReport.gaussianProduct.associative !== measured.gaussianProductLaws.associativeWithinTolerance) failures.push("gaussian:associative");
if (!close(oracleReport.gaussianProduct.repeatedEvidenceVarianceRatio, measured.gaussianProductLaws.repeatedEvidenceVarianceRatio)) failures.push("gaussian:variance-ratio");

for (const [name, oracleLane, measuredLane] of [
  ["fixedHalf", oracleReport.fixedHalf, measured.fixedHalfCi],
  ["traceGrid", oracleReport.traceGrid, measured.traceGridCi],
] as const) {
  if (oracleLane.idempotent !== measuredLane.idempotent) failures.push(`${name}:idempotent`);
  if (oracleLane.commutative !== measuredLane.commutative) failures.push(`${name}:commutative`);
  if (oracleLane.dominatesBothInputs !== measuredLane.dominatesBothInputs) failures.push(`${name}:dominance`);
  const oracleWitness = oracleLane.witness;
  const measuredWitness = measuredLane.associativityWitness;
  if (oracleWitness === null || measuredWitness === undefined) {
    failures.push(`${name}:missing-witness`);
  } else {
    if (!close(oracleWitness.maxDifference, measuredWitness.maxDifference)) failures.push(`${name}:difference`);
    if (!close(oracleWitness.leftCovariance00, measuredWitness.left.covariance[0][0])) failures.push(`${name}:left-covariance`);
    if (!close(oracleWitness.rightCovariance00, measuredWitness.right.covariance[0][0])) failures.push(`${name}:right-covariance`);
    if (!close(oracleWitness.leftWeight, measuredWitness.left.weight)) failures.push(`${name}:left-weight`);
    if (!close(oracleWitness.rightWeight, measuredWitness.right.weight)) failures.push(`${name}:right-weight`);
  }
}

const canonicalFirst = { key: "a", estimate: { mean: [0, 0] as const, covariance: [[1, 0], [0, 4]] as const } };
const canonicalSecond = { key: "b", estimate: { mean: [1, 0] as const, covariance: [[4, 0], [0, 1]] as const } };
const canonicalThird = { key: "c", estimate: { mean: [0, 1] as const, covariance: [[2, 1], [1, 2]] as const } };
const canonicalReceipt = queryCanonicalGaussianEvidence({ versions: [canonicalFirst, canonicalSecond, canonicalThird] });
if (canonicalReceipt.status !== "Ready") throw new Error("CRDT-BELIEF-TYPESCRIPT-QUERY-NOT-READY");
const queryReport = oracleReport.canonicalQuery;
if (!queryReport.permutationReceiptsIdentical) failures.push("canonical:permutations");
if (!queryReport.redeliveryIdentical) failures.push("canonical:redelivery");
if (JSON.stringify(queryReport.ready.orderedFingerprints) !== JSON.stringify(canonicalReceipt.orderedFingerprints)) failures.push("canonical:fingerprints");
if (queryReport.ready.evidenceCount !== canonicalReceipt.evidenceCount) failures.push("canonical:count");
for (let row = 0; row < 2; row += 1) {
  const pythonMean = queryReport.ready.posterior.mean[row];
  const typescriptMean = canonicalReceipt.posterior.mean[row];
  const typescriptCovarianceRow = canonicalReceipt.posterior.covariance[row];
  if (pythonMean === undefined || typescriptMean === undefined || typescriptCovarianceRow === undefined || !close(pythonMean, typescriptMean)) {
    failures.push(`canonical:mean:${String(row)}`);
  }
  for (let column = 0; column < 2; column += 1) {
    const pythonCovariance = queryReport.ready.posterior.covariance[row]?.[column];
    const typescriptCovariance = typescriptCovarianceRow?.[column];
    if (pythonCovariance === undefined || typescriptCovariance === undefined || !close(pythonCovariance, typescriptCovariance)) {
      failures.push(`canonical:covariance:${String(row)}:${String(column)}`);
    }
  }
}
for (const changed of [queryReport.changedMean, queryReport.changedUncertainty]) {
  if (changed.conflictKeys.length !== 1 || changed.conflictKeys[0] !== "a") failures.push("canonical:conflict");
}
const normalKahanControl = queryReport.kahanVsNaiveVariance00Different
  && !close(queryReport.compensatedCancellationVariance00, queryReport.naiveCancellationVariance00, 0);
if (!normalKahanControl) failures.push("canonical:kahan-control");
if (queryReport.orderSensitivePosteriorCount !== 1 || !queryReport.orderSensitiveReceiptsIdentical) {
  failures.push("canonical:numerical-order-control");
}

const numericalFirst = { key: "a", estimate: { mean: [0, 0] as const, covariance: [[1e-16, 0], [0, 1]] as const } };
const numericalSecond = { key: "b", estimate: { mean: [0, 0] as const, covariance: [[1, 0], [0, 1]] as const } };
const numericalThird = { key: "c", estimate: { mean: [0, 0] as const, covariance: [[1, 0], [0, 1]] as const } };
const numericalPermutations = [
  [numericalFirst, numericalSecond, numericalThird],
  [numericalFirst, numericalThird, numericalSecond],
  [numericalSecond, numericalFirst, numericalThird],
  [numericalSecond, numericalThird, numericalFirst],
  [numericalThird, numericalFirst, numericalSecond],
  [numericalThird, numericalSecond, numericalFirst],
] as const;
const numericalReceipts = numericalPermutations.map((versions) => queryCanonicalGaussianEvidence({ versions }));
if (!numericalReceipts.every((receipt) => receipt.status === "Ready")) {
  failures.push("canonical:typescript-numerical-query-not-ready");
} else {
  const readyReceipts = numericalReceipts as readonly ReadyQueryReport[];
  const baselineVariance = readyReceipts[0]?.posterior.covariance[0]?.[0];
  if (baselineVariance === undefined || !readyReceipts.every((receipt) => receipt.posterior.covariance[0]?.[0] === baselineVariance)) {
    failures.push("canonical:typescript-numerical-order-control");
  }
}

const mutantProcess = Bun.spawnSync(["python3", oracle], {
  cwd: root,
  stdout: "pipe",
  stderr: "pipe",
  env: { ...process.env, CRDT_BELIEF_MUTANT: "adapter-naive" },
});
if (mutantProcess.exitCode !== 0) throw new Error(`CRDT-BELIEF-PYTHON-MUTANT-FAILED:${mutantProcess.stderr.toString().trim()}`);
const mutant = parseReport(JSON.parse(mutantProcess.stdout.toString()) as unknown);
const adapterMutationDetected = !close(
  oracleReport.canonicalQuery.compensatedCancellationVariance00,
  mutant.canonicalQuery.compensatedCancellationVariance00,
  0,
);
if (!adapterMutationDetected) failures.push("canonical:naive-mutant-not-detected");

const unsortedMutantProcess = Bun.spawnSync(["python3", oracle], {
  cwd: root,
  stdout: "pipe",
  stderr: "pipe",
  env: { ...process.env, CRDT_BELIEF_MUTANT: "adapter-unsorted" },
});
if (unsortedMutantProcess.exitCode !== 0) throw new Error(`CRDT-BELIEF-PYTHON-UNSORTED-MUTANT-FAILED:${unsortedMutantProcess.stderr.toString().trim()}`);
const unsortedMutant = parseReport(JSON.parse(unsortedMutantProcess.stdout.toString()) as unknown);
const canonicalOrderMutationDetected = unsortedMutant.canonicalQuery.orderSensitivePosteriorCount === 2
  && !unsortedMutant.canonicalQuery.orderSensitiveReceiptsIdentical;
if (!canonicalOrderMutationDetected) failures.push("canonical:unsorted-mutant-not-detected");

console.log(`CRDT belief-fusion cross-verification: 5 law groups; adapter-naive mutant ${adapterMutationDetected ? "detected" : "not-detected"}; adapter-unsorted mutant ${canonicalOrderMutationDetected ? "detected" : "not-detected"}; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
