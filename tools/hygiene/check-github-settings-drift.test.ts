// check-github-settings-drift.test.ts — unit tests for the exported main(argv).
// Covers parse-error and missing-snapshot branches that do NOT touch `gh` or
// the network, per B-0156 acceptance #2 (each TS sibling has at least one
// `bun test` covering its primary entry path).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { main } from "./check-github-settings-drift";

let TMPDIR: string;
let stderrBuf: string;
let stdoutBuf: string;
let origStderrWrite: typeof process.stderr.write;
let origStdoutWrite: typeof process.stdout.write;
let priorGhRepo: string | undefined;

beforeEach(() => {
  TMPDIR = mkdtempSync(join(tmpdir(), "drift-test-"));
  stderrBuf = "";
  stdoutBuf = "";
  origStderrWrite = process.stderr.write.bind(process.stderr);
  origStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stderr.write = ((chunk: unknown) => {
    stderrBuf += typeof chunk === "string" ? chunk : String(chunk);
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = ((chunk: unknown) => {
    stdoutBuf += typeof chunk === "string" ? chunk : String(chunk);
    return true;
  }) as typeof process.stdout.write;
  // Set GH_REPO so parseArgs never falls through to `gh repo view` when --repo
  // is omitted in the unknown-arg test; the unknown-arg branch fires first
  // anyway, but this keeps the test deterministic if argv parsing order changes.
  priorGhRepo = process.env["GH_REPO"];
  process.env["GH_REPO"] = "test-owner/test-repo";
});

afterEach(() => {
  process.stderr.write = origStderrWrite;
  process.stdout.write = origStdoutWrite;
  if (priorGhRepo === undefined) delete process.env["GH_REPO"];
  else process.env["GH_REPO"] = priorGhRepo;
  if (TMPDIR) rmSync(TMPDIR, { recursive: true, force: true });
});

describe("main(argv) — parse-error and early-exit branches", () => {
  test("rejects unknown flag with exit code 2 and stderr message", async () => {
    const code = await main(["--bogus"]);

    expect(code).toBe(2);
    expect(stderrBuf).toContain("unknown arg");
    expect(stdoutBuf).toBe("");
  });

  test("flags --repo without value (exit 2)", async () => {
    const code = await main(["--repo"]);

    expect(code).toBe(2);
    expect(stderrBuf).toContain("--repo requires");
  });

  test("flags --expected without value (exit 2)", async () => {
    const code = await main(["--expected"]);

    expect(code).toBe(2);
    expect(stderrBuf).toContain("--expected requires");
  });

  test("flags missing expected snapshot file (exit 2)", async () => {
    const missing = join(TMPDIR, "definitely-does-not-exist.json");
    const code = await main(["--repo", "owner/repo", "--expected", missing]);

    expect(code).toBe(2);
    expect(stderrBuf).toContain("expected snapshot not found");
    expect(stderrBuf).toContain(missing);
  });

  test("resolves repo from GH_REPO env when --repo omitted then short-circuits on missing snapshot", async () => {
    // With GH_REPO set + --expected pointing at a missing path, parseArgs must
    // pick up the env-var repo and short-circuit at readFileSync. If parseArgs
    // ignored GH_REPO, we'd reach the `gh repo view` fallback or exit at
    // "cannot determine repo" — both distinguishable from this stderr message.
    const missing = join(TMPDIR, "also-missing.json");
    const code = await main(["--expected", missing]);

    expect(code).toBe(2);
    expect(stderrBuf).toContain("expected snapshot not found");
    expect(stderrBuf).not.toContain("cannot determine repo");
  });
});
