import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { parseArgs } from "./check-github-settings-drift";

// Argument parsing is the smallest pure-ish entry path for unit coverage.
// All cases pass --repo explicitly so the gh-CLI fall-through (lines 88-92
// of the source) is not exercised — keeps tests hermetic.

let priorGhRepo: string | undefined;

beforeEach(() => {
  priorGhRepo = process.env["GH_REPO"];
  // Force the "no GH_REPO" branch deterministically for tests that omit --repo.
  delete process.env["GH_REPO"];
});

afterEach(() => {
  if (priorGhRepo === undefined) delete process.env["GH_REPO"];
  else process.env["GH_REPO"] = priorGhRepo;
});

describe("parseArgs", () => {
  test("accepts --repo OWNER/NAME and returns args", async () => {
    const result = await parseArgs(["--repo", "owner/name"]);

    expect(result.kind).toBe("args");
    if (result.kind === "args") {
      expect(result.args.repo).toBe("owner/name");
      // Default expected path is resolved relative to script dir.
      expect(result.args.expected).toContain("github-settings.expected.json");
    }
  });

  test("accepts --repo and --expected together", async () => {
    const result = await parseArgs(["--repo", "owner/name", "--expected", "/tmp/x.json"]);

    expect(result.kind).toBe("args");
    if (result.kind === "args") {
      expect(result.args.repo).toBe("owner/name");
      expect(result.args.expected).toBe("/tmp/x.json");
    }
  });

  test("errors when --repo has no value", async () => {
    const result = await parseArgs(["--repo"]);

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("--repo requires OWNER/NAME");
    }
  });

  test("errors when --expected has no value", async () => {
    const result = await parseArgs(["--repo", "owner/name", "--expected"]);

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("--expected requires PATH");
    }
  });

  test("errors on unknown arg", async () => {
    const result = await parseArgs(["--bogus"]);

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("unknown arg");
      expect(result.message).toContain("--bogus");
    }
  });

  test("reads GH_REPO from env when --repo omitted", async () => {
    process.env["GH_REPO"] = "env-owner/env-name";

    const result = await parseArgs(["--expected", "/tmp/x.json"]);

    expect(result.kind).toBe("args");
    if (result.kind === "args") {
      expect(result.args.repo).toBe("env-owner/env-name");
      expect(result.args.expected).toBe("/tmp/x.json");
    }
  });
});
