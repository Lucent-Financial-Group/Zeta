import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { assertNoSplitLeakage, buildEtth1Examples, parseAndValidateEtth1, type Etth1Manifest } from "./etth1-dataset";
import { runCorrelatedErrorQueryBenchmark } from "./etth1-correlated-error-query";
import { runStaticEnsembleBenchmark } from "./etth1-static-ensemble";
import { measureGaussianTopology } from "./gaussian-topology";

function usage(): never {
  throw new Error("usage: run-composable-factor-benchmark.ts MANIFEST_JSON ETTH1_CSV");
}

const manifestArgument = process.argv[2];
const dataArgument = process.argv[3];
if (manifestArgument === undefined || dataArgument === undefined) usage();
const manifestPath = resolve(manifestArgument);
const dataPath = resolve(dataArgument);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Etth1Manifest;
const bytes = readFileSync(dataPath);
const dataset = parseAndValidateEtth1(bytes, manifest);
const examples = buildEtth1Examples(dataset, manifest);
assertNoSplitLeakage(examples);
const train = examples.filter((example) => example.split === "train");
const validation = examples.filter((example) => example.split === "validation");
const test = examples.filter((example) => example.split === "test");
const started = performance.now();
const topology = [2, 4, 8, 16, 32, 64].map(measureGaussianTopology);
const ensemble = runStaticEnsembleBenchmark(train, validation, test, {
  bootstrapSeed: manifest.benchmark.bootstrap.seed,
  bootstrapReplicates: manifest.benchmark.bootstrap.replicates,
  bootstrapBlockLength: manifest.benchmark.bootstrap.blockLength,
});
const correlatedError = runCorrelatedErrorQueryBenchmark(train, validation, test, {
  bootstrapSeed: manifest.benchmark.bootstrap.seed,
  bootstrapReplicates: manifest.benchmark.bootstrap.replicates,
  bootstrapBlockLength: manifest.benchmark.bootstrap.blockLength,
});
const executionMillis = performance.now() - started;

console.log(JSON.stringify({
  schemaVersion: 1,
  benchmarkId: "CFB-2026-09-02",
  source: {
    manifest: basename(manifestPath),
    dataFile: basename(dataPath),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  },
  validation: {
    sha256: dataset.sha256,
    rowCount: dataset.rows.length,
    exampleCount: examples.length,
    splitCounts: { train: train.length, validation: validation.length, test: test.length },
  },
  topology,
  ensemble,
  correlatedError,
  performance: {
    executionMillis,
    status: "single-run local measurement; not a portable speed claim",
  },
}));
