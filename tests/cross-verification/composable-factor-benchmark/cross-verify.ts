import { resolve } from "node:path";
import { measureGaussianTopology } from "../../../src/Core.TypeScript/research/composable-factor-benchmark/gaussian-topology";

interface FSharpTopologyReport {
  readonly evidenceCount: number;
  readonly densePrecision: number;
  readonly densePrecisionMean: number;
  readonly chainPrecision: number;
  readonly chainPrecisionMean: number;
  readonly dagPrecision: number;
  readonly dagPrecisionMean: number;
  readonly reversedPrecision: number;
  readonly reversedPrecisionMean: number;
  readonly branchDropPrecision: number;
  readonly branchDropPrecisionMean: number;
  readonly productCount: number;
  readonly chainDepth: number;
  readonly dagDepth: number;
}

function close(left: number, right: number, tolerance = 1e-12): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function isReport(value: unknown): value is FSharpTopologyReport[] {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const record = entry as Record<string, unknown>;
    return [
      "evidenceCount", "densePrecision", "densePrecisionMean", "chainPrecision", "chainPrecisionMean",
      "dagPrecision", "dagPrecisionMean", "reversedPrecision", "reversedPrecisionMean",
      "branchDropPrecision", "branchDropPrecisionMean", "productCount", "chainDepth", "dagDepth",
    ].every((key) => typeof record[key] === "number");
  });
}

const root = resolve(import.meta.dir, "../../..");
const script = resolve(import.meta.dir, "gaussian-topology-oracle.fsx");
const dotnet = process.env.DOTNET_HOST_PATH ?? "dotnet";
const buildResult = Bun.spawnSync(
  [dotnet, "build", resolve(root, "src/Bayesian/Bayesian.fsproj"), "--nologo", "-v:quiet"],
  {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
  },
);
if (buildResult.exitCode !== 0) {
  throw new Error(`CFB-A-FSHARP-BUILD-FAILED:${buildResult.stderr.toString().trim() || buildResult.stdout.toString().trim()}`);
}
const processResult = Bun.spawnSync([dotnet, "fsi", script], { cwd: root, stdout: "pipe", stderr: "pipe" });
if (processResult.exitCode !== 0) {
  throw new Error(`CFB-A-FSHARP-FAILED:${processResult.stderr.toString().trim()}`);
}
const parsed: unknown = JSON.parse(processResult.stdout.toString());
if (!isReport(parsed)) throw new Error("CFB-A-FSHARP-SCHEMA");

const failures: string[] = [];
for (const report of parsed) {
  const measured = measureGaussianTopology(report.evidenceCount);
  const comparisons: readonly [string, number, number][] = [
    ["densePrecision", report.densePrecision, measured.dense.natural.precision],
    ["densePrecisionMean", report.densePrecisionMean, measured.dense.natural.precisionMean],
    ["chainPrecision", report.chainPrecision, measured.chain.natural.precision],
    ["chainPrecisionMean", report.chainPrecisionMean, measured.chain.natural.precisionMean],
    ["dagPrecision", report.dagPrecision, measured.balancedDag.natural.precision],
    ["dagPrecisionMean", report.dagPrecisionMean, measured.balancedDag.natural.precisionMean],
    ["reversedPrecision", report.reversedPrecision, measured.reversedChain.natural.precision],
    ["reversedPrecisionMean", report.reversedPrecisionMean, measured.reversedChain.natural.precisionMean],
    ["branchDropPrecision", report.branchDropPrecision, measured.branchDrop.natural.precision],
    ["branchDropPrecisionMean", report.branchDropPrecisionMean, measured.branchDrop.natural.precisionMean],
  ];
  for (const [name, left, right] of comparisons) {
    if (!close(left, right)) failures.push(`${String(report.evidenceCount)}:${name}:${String(left)}:${String(right)}`);
  }
  if (report.productCount !== measured.chain.productCount) failures.push(`${String(report.evidenceCount)}:productCount`);
  if (report.chainDepth !== measured.chain.criticalPathDepth) failures.push(`${String(report.evidenceCount)}:chainDepth`);
  if (report.dagDepth !== measured.balancedDag.criticalPathDepth) failures.push(`${String(report.evidenceCount)}:dagDepth`);
}

console.log(`CFB-A cross-verification: ${String(parsed.length)} cases; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
