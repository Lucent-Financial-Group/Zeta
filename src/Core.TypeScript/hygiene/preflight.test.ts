import { describe, expect, test } from "bun:test";

import { preflightArguments, preflightEnvironment } from "./preflight.ts";

describe("preflight Apple Silicon runtime environment", () => {
  test("enforces the established Workstation GC workaround on Apple Silicon", () => {
    const source = { HOME: "/tmp/home", DOTNET_gcServer: "1" };

    const result = preflightEnvironment(source, "darwin", true);

    expect(result).toEqual({ HOME: "/tmp/home", DOTNET_gcServer: "0" });
    expect(result).not.toBe(source);
  });

  test("does not change Intel macOS or non-macOS environments", () => {
    const source = { HOME: "/tmp/home" };

    expect(preflightEnvironment(source, "darwin", false)).toBe(source);
    expect(preflightEnvironment(source, "linux", true)).toBe(source);
  });

  test("serializes direct dotnet solution checks only on Apple Silicon", () => {
    const args = ["test", "Zeta.sln", "-c", "Release"];

    expect(preflightArguments("dotnet", args, true)).toEqual([...args, "-m:1"]);
    expect(preflightArguments("dotnet", [...args, "-m:1"], true)).toEqual([...args, "-m:1"]);
    expect(preflightArguments("dotnet", args, false)).toBe(args);
    expect(preflightArguments("bun", args, true)).toBe(args);
  });
});
