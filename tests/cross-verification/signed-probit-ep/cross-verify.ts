import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type GroupReceipt = {
  readonly group: "housing-no" | "housing-yes" | "housing-unknown";
  readonly count: number;
  readonly mean: number;
  readonly variance: number;
  readonly predictive: number;
};

type ExactReceipt = { readonly groups: readonly GroupReceipt[] };
type EpReceipt = { readonly fingerprint: string; readonly groups: readonly GroupReceipt[] };
type Golden = { readonly exact: ExactReceipt; readonly ep: EpReceipt };

const HERE = import.meta.dir;
const ROOT = resolve(HERE, "../../..");
const ORACLE = resolve(HERE, "signed_probit_ep_oracle.py");
const RUNNER = resolve(HERE, "signed_probit_ep_runner.fsx");
const GOLDEN = resolve(HERE, "golden.json");
const DOTNET = process.env.DOTNET_HOST_PATH ?? "dotnet";
const GROUPS = ["housing-no", "housing-yes", "housing-unknown"] as const;
// Measured on the committed seven-observation control catalogue. This detects
// a large projection regression; it is not a general EP error guarantee.
const MAX_CONTROL_CATALOGUE_EP_ABSOLUTE_DISCREPANCY = 2e-3;

function fail(message: string): never {
  throw new Error(`signed-probit EP cross-verification: ${message}`);
}

function parseJson(label: string, value: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(value));
  } catch (error: unknown) {
    fail(`${label} emitted invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asGroupReceipt(value: unknown, label: string): GroupReceipt {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const { group, count, mean, variance, predictive } = value;
  if ((GROUPS as readonly string[]).includes(group as string) === false) fail(`${label}.group is invalid`);
  if (!Number.isInteger(count) || (count as number) < 0) fail(`${label}.count is invalid`);
  for (const [field, numeric] of Object.entries({ mean, variance, predictive })) {
    if (typeof numeric !== "number" || !Number.isFinite(numeric)) fail(`${label}.${field} must be finite`);
  }
  return { group: group as GroupReceipt["group"], count: count as number, mean: mean as number, variance: variance as number, predictive: predictive as number };
}

function asExactReceipt(value: unknown, label: string): ExactReceipt {
  if (!isRecord(value) || !Array.isArray(value.groups)) fail(`${label}.groups is missing`);
  return { groups: value.groups.map((group, index) => asGroupReceipt(group, `${label}.groups[${index}]`)) };
}

function asEpReceipt(value: unknown, label: string): EpReceipt {
  if (!isRecord(value) || typeof value.fingerprint !== "string") fail(`${label}.fingerprint is missing`);
  const base = asExactReceipt(value, label);
  return { fingerprint: value.fingerprint, groups: base.groups };
}

function asGolden(value: unknown): Golden {
  if (!isRecord(value)) fail("golden vector must be an object");
  return { exact: asExactReceipt(value.exact, "golden.exact"), ep: asEpReceipt(value.ep, "golden.ep") };
}

function run(label: string, command: string[], extraArguments: readonly string[] = []): unknown {
  const outcome = Bun.spawnSync([...command, ...extraArguments], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  if (outcome.exitCode !== 0) {
    fail(`${label} exited ${outcome.exitCode}: ${new TextDecoder().decode(outcome.stderr).trim()}`);
  }
  if (outcome.stderr.byteLength !== 0) fail(`${label} wrote stderr: ${new TextDecoder().decode(outcome.stderr).trim()}`);
  return parseJson(label, outcome.stdout);
}

function requireClose(label: string, actual: number, expected: number, tolerance: number): void {
  if (Math.abs(actual - expected) > tolerance) {
    fail(`${label} expected ${expected}, received ${actual}, tolerance ${tolerance}`);
  }
}

function requireSameGroups(label: string, actual: readonly GroupReceipt[], expected: readonly GroupReceipt[], tolerance: number): void {
  if (actual.length !== expected.length) fail(`${label} group length differs`);
  for (const [index, group] of actual.entries()) {
    const expectedGroup = expected[index];
    if (expectedGroup === undefined || group.group !== expectedGroup.group || group.count !== expectedGroup.count) {
      fail(`${label}.groups[${index}] identity differs`);
    }
    requireClose(`${label}.groups[${index}].mean`, group.mean, expectedGroup.mean, tolerance);
    requireClose(`${label}.groups[${index}].variance`, group.variance, expectedGroup.variance, tolerance);
    requireClose(`${label}.groups[${index}].predictive`, group.predictive, expectedGroup.predictive, tolerance);
  }
}

const golden = asGolden(JSON.parse(readFileSync(GOLDEN, "utf8")));
const exact = asExactReceipt(run("python exact oracle", ["python3", ORACLE]), "exact");
const ep = asEpReceipt(run("F# EP runner", [DOTNET, "fsi", RUNNER]), "ep");
requireSameGroups("exact golden", exact.groups, golden.exact.groups, 1e-12);
requireSameGroups("EP golden", ep.groups, golden.ep.groups, 1e-12);
if (ep.fingerprint !== golden.ep.fingerprint) fail("EP canonical input fingerprint differs from golden vector");
requireSameGroups("EP-to-exact", ep.groups, exact.groups, MAX_CONTROL_CATALOGUE_EP_ABSOLUTE_DISCREPANCY);

const mutatedExact = asExactReceipt(run("mutated python exact oracle", ["python3", ORACLE], ["--flip-source-row", "1"]), "mutated exact");
const mutatedEp = asEpReceipt(run("mutated F# EP runner", [DOTNET, "fsi", RUNNER, "--", "--flip-source-row", "1"]), "mutated EP");
if (JSON.stringify(mutatedExact) === JSON.stringify(exact)) fail("exact oracle label mutation was not detected");
if (JSON.stringify(mutatedEp) === JSON.stringify(ep)) fail("EP label mutation was not detected");
requireSameGroups("mutated EP-to-exact", mutatedEp.groups, mutatedExact.groups, MAX_CONTROL_CATALOGUE_EP_ABSOLUTE_DISCREPANCY);

console.log("Signed-probit EP cross-verification: 3 groups; maximum fixed-catalogue exact-integral discrepancy below 2e-3; label mutation detected; failures 0");
