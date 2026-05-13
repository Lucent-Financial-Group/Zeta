import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runOneCycle, log, detectViaCommand, detectGreyTextMacOS } from "./shadow-observer.ts";
import type { ShadowConfig, ShadowEvent, OsascriptRunner } from "./shadow-observer.ts";

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

describe("shadow-observer — detectViaCommand unit (slice 2)", () => {
  test("returns trimmed stdout when command exits 0 with text", async () => {
    const result = await detectViaCommand("echo suggestion");
    expect(result).toBe("suggestion");
  });

  test("returns null when command exits non-0 (false)", async () => {
    const result = await detectViaCommand("false");
    expect(result).toBeNull();
  });

  test("returns '(detected)' sentinel when command exits 0 with empty stdout", async () => {
    const result = await detectViaCommand("true");
    expect(result).toBe("(detected)");
  });

  test("returns null when command exits 1 with output (exit code wins)", async () => {
    const result = await detectViaCommand("sh -c 'echo text; exit 1'");
    expect(result).toBeNull();
  });

  test("returns multi-word trimmed stdout for compound echo", async () => {
    const result = await detectViaCommand("echo hello world");
    expect(result).toBe("hello world");
  });

  test("returns null when shell exits 127 (command not found inside sh)", async () => {
    // sh -c wraps the cmd; unknown command → sh exits 127 (≠ 0) → null
    const result = await detectViaCommand("this-command-absolutely-does-not-exist-zeta-test");
    expect(result).toBeNull();
  });
});

describe("shadow-observer — --detect-cmd CLI integration (slice 2)", () => {
  let TEST_DIR: string;
  beforeEach(() => {
    TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-shadow-detect-cmd-test-"));
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  const SCRIPT = join(import.meta.dir, "shadow-observer.ts");

  function run2(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
    const r = spawnSync("bun", [SCRIPT, ...args, "--log-file", join(TEST_DIR, "shadow.log")], {
      encoding: "utf-8",
    });
    return {
      stdout: (r.stdout ?? "").trim(),
      stderr: (r.stderr ?? "").trim(),
      exitCode: r.status ?? 1,
    };
  }

  function readLog2(): ShadowEvent[] {
    const p = join(TEST_DIR, "shadow.log");
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ShadowEvent);
  }

  test("--detect-cmd 'echo suggestion' --dry-run --once logs detected + accepted", () => {
    const r = run2("--detect-cmd", "echo suggestion", "--dry-run", "--once", "--delay", "0");
    expect(r.exitCode).toBe(0);
    const events = readLog2();
    const types = events.map((e) => e.type);
    expect(types).toContain("detected");
    expect(types).toContain("accepted");
  });

  test("--detect-cmd 'echo suggestion' detected event has suggestion as content", () => {
    run2("--detect-cmd", "echo suggestion", "--dry-run", "--once", "--delay", "0");
    const events = readLog2();
    const detected = events.find((e) => e.type === "detected");
    expect(detected?.content).toBe("suggestion");
  });

  test("--detect-cmd 'false' --dry-run --once logs no-suggestion", () => {
    run2("--detect-cmd", "false", "--dry-run", "--once");
    const events = readLog2();
    const types = events.map((e) => e.type);
    expect(types).toContain("no-suggestion");
    expect(types).not.toContain("accepted");
  });

  test("--detect-cmd 'true' --dry-run --once detects sentinel string", () => {
    run2("--detect-cmd", "true", "--dry-run", "--once", "--delay", "0");
    const events = readLog2();
    const detected = events.find((e) => e.type === "detected");
    expect(detected?.content).toBe("(detected)");
  });

  test("--detect-cmd does not override explicit detectFn in unit tests", async () => {
    // When detectFn is passed explicitly to runOneCycle, it wins over detectCmd.
    const baseConfig: ShadowConfig = {
      delayMs: 0,
      detectCmd: "echo should-not-appear",
      dryRun: true,
      logFile: "/dev/null",
      loopIntervalMs: 0,
      once: true,
    };
    const result = await runOneCycle(baseConfig, async () => null);
    expect(result).toBe("no-suggestion");
  });
});

describe("shadow-observer — detectGreyTextMacOS unit (slice 3)", () => {
  test("returns null + logs warning on non-darwin platform", async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(String(args[0]));
    };
    try {
      const result = await detectGreyTextMacOS(undefined, undefined, "linux");
      expect(result).toBeNull();
      expect(warnings.some((m) => m.includes("non-macOS"))).toBe(true);
    } finally {
      console.warn = origWarn;
    }
  });

  test("returns trimmed text when osascript exits 0 with stdout", async () => {
    const mockRunner: OsascriptRunner = async () => ({
      exitCode: 0,
      stdout: "  some suggestion  \n",
      stderr: "",
    });
    const result = await detectGreyTextMacOS(undefined, mockRunner);
    expect(result).toBe("some suggestion");
  });

  test("returns null when osascript exits 0 with empty stdout", async () => {
    const mockRunner: OsascriptRunner = async () => ({
      exitCode: 0,
      stdout: "   \n",
      stderr: "",
    });
    const result = await detectGreyTextMacOS(undefined, mockRunner);
    expect(result).toBeNull();
  });

  test("returns null + logs warning when osascript exits non-zero", async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(String(args[0]));
    };
    try {
      const mockRunner: OsascriptRunner = async () => ({
        exitCode: 1,
        stdout: "",
        stderr: "error: osascript failure",
      });
      const result = await detectGreyTextMacOS(undefined, mockRunner);
      expect(result).toBeNull();
      expect(
        warnings.some((m) => m.includes("osascript exited") || m.includes("permission")),
      ).toBe(true);
    } finally {
      console.warn = origWarn;
    }
  });
});

describe("shadow-observer — runOneCycle full cycle paths (slice 3)", () => {
  let CYCLE_TEST_DIR: string;

  beforeEach(() => {
    CYCLE_TEST_DIR = mkdtempSync(join(tmpdir(), "zeta-shadow-cycle-test-"));
  });
  afterEach(() => {
    if (existsSync(CYCLE_TEST_DIR)) rmSync(CYCLE_TEST_DIR, { recursive: true, force: true });
  });

  function cycleConfig(): ShadowConfig {
    return {
      delayMs: 0,
      dryRun: true,
      logFile: join(CYCLE_TEST_DIR, "shadow.log"),
      loopIntervalMs: 0,
      once: true,
    };
  }

  function readCycleLog(): ShadowEvent[] {
    const p = join(CYCLE_TEST_DIR, "shadow.log");
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ShadowEvent);
  }

  // --- Overridden path ---

  test("overridden path: detectFn called exactly twice", async () => {
    let callCount = 0;
    const detectFn = async () => {
      callCount++;
      return callCount === 1 ? "suggestion" : null;
    };
    await runOneCycle(cycleConfig(), detectFn);
    expect(callCount).toBe(2);
  });

  test("overridden path: writes detected then overridden events to log", async () => {
    let callCount = 0;
    const detectFn = async () => {
      callCount++;
      return callCount === 1 ? "my-suggestion" : null;
    };
    await runOneCycle(cycleConfig(), detectFn);
    const types = readCycleLog().map((e) => e.type);
    expect(types).toContain("detected");
    expect(types).toContain("overridden");
  });

  test("overridden path: detected event carries first-call suggestion content", async () => {
    let callCount = 0;
    const detectFn = async () => {
      callCount++;
      return callCount === 1 ? "hello-world" : null;
    };
    await runOneCycle(cycleConfig(), detectFn);
    const detected = readCycleLog().find((e) => e.type === "detected");
    expect(detected?.content).toBe("hello-world");
  });

  test("overridden path: re-detect throw is treated as override (returns overridden)", async () => {
    let callCount = 0;
    const detectFn = async () => {
      callCount++;
      if (callCount === 2) throw new Error("re-detect failure");
      return "suggestion";
    };
    // runOneCycle catches re-detect throw → stillPresent = null → "overridden"
    const result = await runOneCycle(cycleConfig(), detectFn);
    expect(result).toBe("overridden");
  });

  // --- Accepted path ---

  test("accepted path: detectFn called exactly twice", async () => {
    let callCount = 0;
    const detectFn = async () => {
      callCount++;
      return "suggestion";
    };
    await runOneCycle(cycleConfig(), detectFn, async () => true);
    expect(callCount).toBe(2);
  });

  test("accepted path: writes detected then accepted events to log", async () => {
    const detectFn = async () => "suggestion";
    await runOneCycle(cycleConfig(), detectFn, async () => true);
    const types = readCycleLog().map((e) => e.type);
    expect(types).toContain("detected");
    expect(types).toContain("accepted");
  });

  test("accepted path: dry-run accepted event content includes 'dry-run'", async () => {
    const detectFn = async () => "suggestion";
    await runOneCycle(cycleConfig(), detectFn, async () => true);
    const accepted = readCycleLog().find((e) => e.type === "accepted");
    expect(accepted?.content).toContain("dry-run");
  });

  test("accepted path: acceptFn called exactly once", async () => {
    let acceptCallCount = 0;
    const detectFn = async () => "suggestion";
    const acceptFn = async (_cfg: ShadowConfig) => {
      acceptCallCount++;
      return true;
    };
    await runOneCycle(cycleConfig(), detectFn, acceptFn);
    expect(acceptCallCount).toBe(1);
  });
});
