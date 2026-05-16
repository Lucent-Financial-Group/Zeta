// profile.test.ts — smoke test for tools/profile.ts CLI plumbing.
//
// B-0156 acceptance criterion #2: "Each TS sibling has at least one
// `bun test` covering its primary entry path." The 8 peer-call
// wrappers are covered by tools/peer-call/smoke.test.ts; profile.ts
// was the remaining non-install-graph TS port without a test.
//
// Scope: validates CLI plumbing only. Does NOT invoke real dotnet
// diagnostic tools (counters / trace / gcdump / bench / coverage),
// because:
//   - CI runners do not have the dotnet diagnostic globals installed
//   - The script's primary value is dispatching to those tools; the
//     dispatch logic + arg-validation + help text are what regress
//
// Covered branches:
//   1. No args → help text + exit 0
//   2. -h / --help → help text + exit 0
//   3. Unknown command → help text + exit 64 (usage error)
//   4. counters/trace/gcdump without <pid> → stderr usage + exit 64
//
// NOT covered (out of scope for smoke test):
//   - The `install` branch (spawns `dotnet tool update/install`)
//   - The `counters` / `trace` / `gcdump` happy paths (require live
//     dotnet diagnostic tools + a running .NET process)
//   - The `bench` / `coverage` branches (require BenchmarkDotNet
//     project + test infrastructure)

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "profile.ts",
);

function runProfile(args: readonly string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync("bun", [PROFILE_PATH, ...args], {
    encoding: "utf8",
    timeout: 10_000,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("profile.ts smoke tests (B-0156 acceptance #2)", () => {
  test("no args prints help and exits 0", () => {
    const result = runProfile([]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DBSP profiling helper");
    expect(result.stdout).toContain("bun tools/profile.ts install");
  });

  test("--help prints help and exits 0", () => {
    const result = runProfile(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("-h prints help and exits 0", () => {
    const result = runProfile(["-h"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("unknown command prints help and exits 64", () => {
    const result = runProfile(["not-a-real-command"]);
    expect(result.status).toBe(64);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("counters without <pid> exits 64 with usage to stderr", () => {
    const result = runProfile(["counters"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("usage:");
    expect(result.stderr).toContain("counters");
  });

  test("trace without <pid> exits 64 with usage to stderr", () => {
    const result = runProfile(["trace"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("usage:");
    expect(result.stderr).toContain("trace");
  });

  test("gcdump without <pid> exits 64 with usage to stderr", () => {
    const result = runProfile(["gcdump"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("usage:");
    expect(result.stderr).toContain("gcdump");
  });

  test("help text references all 6 commands (no copy-paste regression)", () => {
    const result = runProfile([]);
    expect(result.status).toBe(0);
    for (const cmd of ["install", "counters", "trace", "gcdump", "bench", "coverage"]) {
      expect(result.stdout).toContain(cmd);
    }
  });
});
