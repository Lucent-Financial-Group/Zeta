import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runOneCycle, log } from "./shadow-observer.ts";
import type { ShadowConfig, ShadowEvent } from "./shadow-observer.ts";

const SCRIPT = join(import.meta.dir, "shadow-observer.ts");
let TEST_DIR: string;

function logPath(): string {
  return join(TEST_DIR, "shadow.log");
}

function run(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const r = spawnSync("bun", [SCRIPT, ...args, "--log-file", logPath()], {
    encoding: "utf-8",
  });
  return {
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
    exitCode: r.status ?? 1,
  };
}

function readLog(): ShadowEvent[] {
  const p = logPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ShadowEvent);
}

describe("shadow-observer — CLI argument validation", () => {
  beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-shadow-test-"));
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test("--delay abc exits 1 with error message", () => {
    const r = run("--delay", "abc", "--once");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--delay");
  });

  test("--delay -5 exits 1", () => {
    const r = run("--delay", "-5", "--once");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--delay");
  });

  test("--loop-interval abc exits 1", () => {
    const r = run("--loop-interval", "abc", "--once");
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("--loop-interval");
  });

  test("unknown flag exits 1", () => {
    const r = run("--bogus-flag");
    expect(r.exitCode).toBe(1);
  });
});

describe("shadow-observer — dry-run once mode", () => {
  beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-shadow-test-"));
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test("--dry-run --once exits 0", () => {
    const r = run("--dry-run", "--once");
    expect(r.exitCode).toBe(0);
  });

  test("--dry-run --once writes started + no-suggestion events to log file", () => {
    run("--dry-run", "--once");
    const events = readLog();
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]!.type).toBe("started");
    expect(events[0]!.dryRun).toBe(true);
    const last = events[events.length - 1]!;
    expect(last.type).toBe("no-suggestion");
  });

  test("--dry-run --once --delay 0 completes quickly", () => {
    const start = Date.now();
    const r = run("--dry-run", "--once", "--delay", "0");
    expect(r.exitCode).toBe(0);
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test("started event contains delay and dry-run in content", () => {
    run("--dry-run", "--once", "--delay", "500");
    const events = readLog();
    const started = events.find((e) => e.type === "started");
    expect(started).toBeDefined();
    expect(started!.delayMs).toBe(500);
    expect(started!.dryRun).toBe(true);
  });

  test("stdout emits JSON log lines", () => {
    const r = run("--dry-run", "--once");
    expect(r.exitCode).toBe(0);
    const lines = r.stdout.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});

describe("shadow-observer — runOneCycle unit (injected fns)", () => {
  const baseConfig: ShadowConfig = {
    delayMs: 0,
    dryRun: true,
    logFile: "/dev/null",
    loopIntervalMs: 0,
    once: true,
  };

  test("returns no-suggestion when detectFn returns null", async () => {
    const result = await runOneCycle(baseConfig, async () => null);
    expect(result).toBe("no-suggestion");
  });

  test("returns accepted when detectFn returns text and re-detects same text", async () => {
    const detectFn = async () => "some-suggestion";
    const acceptFn = async (_cfg: ShadowConfig) => true;
    const result = await runOneCycle(baseConfig, detectFn, acceptFn);
    expect(result).toBe("accepted");
  });

  test("returns overridden when re-detection returns null (human keystroke)", async () => {
    let callCount = 0;
    const detectFn = async () => {
      callCount++;
      return callCount === 1 ? "suggestion" : null;
    };
    const result = await runOneCycle(baseConfig, detectFn);
    expect(result).toBe("overridden");
  });

  test("returns error when detectFn throws", async () => {
    const detectFn = async (): Promise<string | null> => {
      throw new Error("accessibility denied");
    };
    const result = await runOneCycle(baseConfig, detectFn);
    expect(result).toBe("error");
  });

  test("returns error when acceptFn returns false", async () => {
    const detectFn = async () => "suggestion";
    const acceptFn = async (_cfg: ShadowConfig) => false;
    const result = await runOneCycle(baseConfig, detectFn, acceptFn);
    expect(result).toBe("error");
  });
});

describe("shadow-observer — log() unit", () => {
  beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-shadow-test-"));
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test("appends JSON events to log file", () => {
    const lf = logPath();
    const event1: ShadowEvent = {
      timestamp: "2026-05-13T00:00:00.000Z",
      type: "started",
      delayMs: 3000,
      dryRun: true,
    };
    const event2: ShadowEvent = {
      timestamp: "2026-05-13T00:00:01.000Z",
      type: "no-suggestion",
      delayMs: 3000,
      dryRun: true,
    };
    log(event1, lf);
    log(event2, lf);

    const lines = readFileSync(lf, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ShadowEvent);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.type).toBe("started");
    expect(lines[1]!.type).toBe("no-suggestion");
  });

  test("log() does not throw when log file directory is /dev/null (non-writable path)", () => {
    const event: ShadowEvent = {
      timestamp: new Date().toISOString(),
      type: "started",
      delayMs: 0,
      dryRun: true,
    };
    expect(() => log(event, "/dev/null/nonexistent/path")).not.toThrow();
  });
});
