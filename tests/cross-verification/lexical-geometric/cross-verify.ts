import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const runner = resolve(import.meta.dir, "lexical_geometric_runner.fsx");
const oracle = resolve(import.meta.dir, "lexical_geometric_oracle.py");
const decoder = new TextDecoder();
const dotnet = process.env.DOTNET_HOST_PATH ?? "dotnet";

function execute(command: string[], label: string): string {
  const result = Bun.spawnSync(command, { cwd: root, stdout: "pipe", stderr: "pipe" });
  const diagnostics = `${decoder.decode(result.stdout)}${decoder.decode(result.stderr)}`.trim();
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed with exit ${result.exitCode}: ${diagnostics}`);
  }
  return decoder.decode(result.stdout).trim();
}

function fsharp(args: string[]): string {
  return execute([dotnet, "fsi", runner, ...args], "F# lexical-geometric receipt runner");
}

function python(args: string[]): string {
  return execute(["python3", oracle, ...args], "Python lexical-geometric receipt oracle");
}

const baseFsharp = fsharp([]);
const basePython = python([]);
if (baseFsharp !== basePython) {
  throw new Error(`independent base receipts differ\nF#:\n${baseFsharp}\nPython:\n${basePython}`);
}

const reverseFsharp = fsharp(["--reverse-calibration"]);
const reversePython = python(["--reverse-calibration"]);
if (reverseFsharp !== baseFsharp || reversePython !== basePython) {
  throw new Error("calibration order mutation changed a declared canonical receipt");
}

const conflictFsharp = fsharp(["--correction-conflict"]);
const conflictPython = python(["--correction-conflict"]);
if (conflictFsharp !== conflictPython || !conflictFsharp.includes("conflict|now|now|lexical-correction-conflict|correction-a|correction-b")) {
  throw new Error("correction-conflict receipt was not independently reproduced and retained");
}

const coordinateMutationFsharp = fsharp(["--mutate-coordinate"]);
const coordinateMutationPython = python(["--mutate-coordinate"]);
if (coordinateMutationFsharp !== coordinateMutationPython || coordinateMutationFsharp === baseFsharp) {
  throw new Error("coordinate mutation was not independently reproduced and detected");
}

console.log("Lexical-geometric receipt cross-verification: independent F#/Python base, canonical-order, correction-conflict, and coordinate-mutation controls passed; failures 0");
