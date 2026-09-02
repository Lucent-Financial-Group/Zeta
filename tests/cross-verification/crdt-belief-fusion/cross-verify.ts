import { resolve } from "node:path";
import { measureCrdtBeliefFusion } from "../../../src/Core.TypeScript/research/composable-factor-benchmark/crdt-belief-fusion";

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

console.log(`CRDT belief-fusion cross-verification: 4 law groups; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
