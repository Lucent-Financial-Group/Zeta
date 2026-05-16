// profile.test.ts — smoke tests for the DBSP profiling helper CLI.
//
// Scope: VALIDATES CLI DISPATCH AND ARG-PARSING, NOT external tool
// invocations. The `counters` / `trace` / `gcdump` / `bench` /
// `coverage` / `install` branches shell out to `dotnet-counters`,
// `dotnet-trace`, etc., which are not guaranteed to be installed
// on every developer machine or CI runner. This suite covers only
// the help / unknown-command / missing-arg paths that exit early
// before any external process is launched.
//
// Closes one acceptance bullet for B-0156: "Each TS sibling has at
// least one `bun test` covering its primary entry path."

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE_TS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "profile.ts",
);

function runProfile(args: readonly string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync("bun", [PROFILE_TS, ...args], {
    encoding: "utf8",
    timeout: 10_000,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("tools/profile.ts CLI dispatch", () => {
  test("no args prints help and exits 0", () => {
    const result = runProfile([]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("--help exits 0 and prints help text", () => {
    const result = runProfile(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("-h exits 0 and prints help text", () => {
    const result = runProfile(["-h"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("help lists all canonical subcommands", () => {
    const result = runProfile(["--help"]);
    expect(result.status).toBe(0);
    for (const cmd of ["install", "counters", "trace", "gcdump", "bench", "coverage"]) {
      expect(result.stdout).toContain(cmd);
    }
  });

  test("unknown command exits 64 (EX_USAGE) and prints help", () => {
    const result = runProfile(["not-a-real-command"]);
    expect(result.status).toBe(64);
    expect(result.stdout).toContain("DBSP profiling helper");
  });

  test("counters without pid exits 64 with usage on stderr", () => {
    const result = runProfile(["counters"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("usage:");
    expect(result.stderr).toContain("counters");
  });

  test("trace without pid exits 64 with usage on stderr", () => {
    const result = runProfile(["trace"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("usage:");
    expect(result.stderr).toContain("trace");
  });

  test("gcdump without pid exits 64 with usage on stderr", () => {
    const result = runProfile(["gcdump"]);
    expect(result.status).toBe(64);
    expect(result.stderr).toContain("usage:");
    expect(result.stderr).toContain("gcdump");
  });
});
