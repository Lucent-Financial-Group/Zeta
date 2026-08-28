#!/usr/bin/env bun
/**
 * B-0402 Slice 1: Shadow observer — polling loop + Glass Halo attribution.
 *
 * Watches the Claude Code CLI for grey text (autocomplete suggestions)
 * and auto-accepts after a configurable delay if no human keystroke
 * interrupts.
 *
 * Slice 1 (PR #2973): polling loop infrastructure + testable dry-run mode.
 * Slice 2 (this PR): --detect-cmd flag wires any shell command as the detector.
 * Slice 3 (deferred): `zeta shadow` top-level CLI entry point + installation.
 *
 * The Lost analogy: Desmond pushed the button every 108 minutes.
 * This script pushes the button so Desmond can leave the hatch.
 *
 * Safety:
 * - Human keystroke at any time = immediate override (slice 2)
 * - All shadow submissions logged to shadow-observer.log (Glass Halo)
 * - Kill the script = shadow goes silent (circuit breaker)
 * - --dry-run: logs intended actions without sending keystrokes
 *
 * Usage:
 *   bun tools/shadow/shadow-observer.ts [--delay <ms>] [--detect-cmd <cmd>]
 *     [--dry-run] [--once] [--loop <ms>] [--loop-interval <ms>] [--log-file <path>]
 *
 * Flags:
 *   --delay <ms>          Delay before auto-accepting (default: 3000)
 *   --detect-cmd <cmd>    Shell command run each cycle to detect grey text.
 *                         Exit 0 = suggestion present (stdout is content).
 *                         Exit non-0 = no suggestion. Default: built-in stub.
 *   --dry-run             Log intended actions without sending keystrokes
 *   --loop <ms>           After natural exit, wait <ms> then restart. SIGINT/SIGTERM
 *                         terminate immediately and are never restarted.
 *   --once                Run exactly one detection cycle then exit
 *   --loop-interval <ms>  Continuous mode: sleep between cycles (default: 1000)
 *   --log-file <path>     Log file path (default: tools/shadow/shadow-observer.log)
 */

import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "util";

export interface ShadowConfig {
  delayMs: number;
  detectCmd?: string;
  dryRun: boolean;
  logFile: string;
  loopIntervalMs: number;
  loopMs?: number;
  once: boolean;
}

export interface ShadowEvent {
  timestamp: string;
  type: "started" | "detected" | "accepted" | "overridden" | "no-suggestion" | "error";
  content?: string;
  delayMs: number;
  dryRun: boolean;
}

export type DetectFn = () => Promise<string | null>;
export type AcceptFn = (config: ShadowConfig) => Promise<boolean>;

export function log(event: ShadowEvent, logFile: string): void {
  const line = JSON.stringify(event);
  console.log(line);
  try {
    appendFileSync(logFile, line + "\n");
  } catch {
    // log write failure is non-fatal — shadow continues
  }
}

/**
 * Injectable osascript runner — for testing without real osascript.
 * Production code uses the default `runOsascript` implementation.
 */
export type OsascriptRunner = (
  scriptPath: string,
  terminalApp?: string,
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

// osascript can hang waiting for an accessibility-permission dialog; 3 s cap.
const OSASCRIPT_TIMEOUT_MS = 3000;

async function runOsascript(
  scriptPath: string,
  terminalApp?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const args = terminalApp
    ? ["osascript", scriptPath, terminalApp]
    : ["osascript", scriptPath];
  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });

  const runResult = async () => {
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    return { exitCode, stdout, stderr };
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`osascript timed out after ${OSASCRIPT_TIMEOUT_MS}ms`)),
      OSASCRIPT_TIMEOUT_MS,
    ),
  );

  try {
    return await Promise.race([runResult(), timeout]);
  } catch (err) {
    try { proc.kill(); } catch { /* ignore kill errors */ }
    throw err;
  }
}

/**
 * Detect grey text (autocomplete suggestion) in the frontmost terminal
 * emulator on macOS via the accessibility tree (osascript).
 *
 * @param terminalApp  Optional: target a specific terminal app by name.
 * @param _runner      For testing: injectable osascript executor.
 * @param _platform    For testing: override process.platform.
 */
export async function detectGreyTextMacOS(
  terminalApp?: string,
  _runner?: OsascriptRunner,
  _platform?: string,
): Promise<string | null> {
  const platform = _platform ?? process.platform;
  if (platform !== "darwin") {
    console.warn("[shadow] detectGreyTextMacOS: skipping on non-macOS platform");
    return null;
  }

  const runner = _runner ?? runOsascript;
  const scriptPath = join(import.meta.dir, "detect-grey-text.applescript");

  let result: { exitCode: number; stdout: string; stderr: string };
  try {
    result = await runner(scriptPath, terminalApp);
  } catch (err) {
    console.warn(`[shadow] detectGreyTextMacOS: spawn error: ${String(err)}`);
    return null;
  }

  if (result.exitCode !== 0) {
    const isPermDenied =
      result.stderr.includes("-1002") ||
      result.stderr.includes("-1743") ||
      result.stderr.toLowerCase().includes("not permitted") ||
      result.stderr.toLowerCase().includes("permission denied");
    if (isPermDenied) {
      console.warn("[shadow] detectGreyTextMacOS: accessibility permission denied");
    } else {
      console.warn(
        `[shadow] detectGreyTextMacOS: osascript exited ${result.exitCode}, returning null`,
      );
    }
    return null;
  }

  const trimmed = result.stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function detectGreyText(): Promise<string | null> {
  return detectGreyTextMacOS();
}

/**
 * Detect grey text via an external shell command (slice 2).
 *
 * The command is run as a subprocess. Contract:
 *   - Exit 0: suggestion present. Stdout (trimmed) is the content.
 *     Empty stdout → returns the sentinel "(detected)" so callers
 *     see a non-null truthy string (e.g. `true` or a no-output AppleScript).
 *   - Exit non-0: no suggestion → returns null.
 *
 * On spawn error (e.g. command not found) the promise rejects; the
 * caller's try/catch (runOneCycle) handles it as "error".
 */
export async function detectViaCommand(cmd: string): Promise<string | null> {
  const proc = Bun.spawn(["sh", "-c", cmd], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) return null;
  const raw = await new Response(proc.stdout).text();
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : "(detected)";
}

export async function acceptGreyText(config: ShadowConfig): Promise<boolean> {
  if (config.dryRun) {
    return true;
  }
  // Phase 1: AppleScript — Right Arrow (accept autocomplete) + Enter (submit)
  const script = `
    tell application "System Events"
      key code 124
      delay 0.1
      key code 36
    end tell
  `;
  const proc = Bun.spawn(["osascript", "-e", script], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return (await proc.exited) === 0;
}

export async function runOneCycle(
  config: ShadowConfig,
  detectFn: DetectFn = detectGreyText,
  acceptFn: AcceptFn = acceptGreyText,
): Promise<"accepted" | "no-suggestion" | "overridden" | "error"> {
  let greyText: string | null;
  try {
    greyText = await detectFn();
  } catch (err) {
    log(
      {
        timestamp: new Date().toISOString(),
        type: "error",
        content: `detectGreyText threw: ${String(err)}`,
        delayMs: config.delayMs,
        dryRun: config.dryRun,
      },
      config.logFile,
    );
    return "error";
  }

  if (!greyText) {
    log(
      {
        timestamp: new Date().toISOString(),
        type: "no-suggestion",
        delayMs: config.delayMs,
        dryRun: config.dryRun,
      },
      config.logFile,
    );
    return "no-suggestion";
  }

  log(
    {
      timestamp: new Date().toISOString(),
      type: "detected",
      content: greyText,
      delayMs: config.delayMs,
      dryRun: config.dryRun,
    },
    config.logFile,
  );

  await Bun.sleep(config.delayMs);

  // Re-check: if grey text is gone, a human keystroke overrode it.
  let stillPresent: string | null;
  try {
    stillPresent = await detectFn();
  } catch {
    stillPresent = null;
  }

  if (!stillPresent) {
    log(
      {
        timestamp: new Date().toISOString(),
        type: "overridden",
        content: "(shadow cancelled — suggestion cleared during delay)",
        delayMs: config.delayMs,
        dryRun: config.dryRun,
      },
      config.logFile,
    );
    return "overridden";
  }

  let ok: boolean;
  try {
    ok = await acceptFn(config);
  } catch (err) {
    log(
      {
        timestamp: new Date().toISOString(),
        type: "error",
        content: `acceptGreyText threw: ${String(err)}`,
        delayMs: config.delayMs,
        dryRun: config.dryRun,
      },
      config.logFile,
    );
    return "error";
  }

  if (ok) {
    log(
      {
        timestamp: new Date().toISOString(),
        type: "accepted",
        content: config.dryRun ? "(shadow dry-run accept)" : "(shadow auto-accept)",
        delayMs: config.delayMs,
        dryRun: config.dryRun,
      },
      config.logFile,
    );
    return "accepted";
  }

  log(
    {
      timestamp: new Date().toISOString(),
      type: "error",
      content: "acceptGreyText returned false",
      delayMs: config.delayMs,
      dryRun: config.dryRun,
    },
    config.logFile,
  );
  return "error";
}

async function runInner(
  config: ShadowConfig,
  detectFn: DetectFn,
  acceptFn: AcceptFn,
): Promise<void> {
  log(
    {
      timestamp: new Date().toISOString(),
      type: "started",
      content: `Shadow observer started (delay=${config.delayMs}ms, dry-run=${config.dryRun}, once=${config.once})`,
      delayMs: config.delayMs,
      dryRun: config.dryRun,
    },
    config.logFile,
  );

  if (config.once) {
    await runOneCycle(config, detectFn, acceptFn);
    return;
  }

  // Continuous loop — exits only on SIGINT/SIGTERM or process kill.
  while (true) {
    await runOneCycle(config, detectFn, acceptFn);
    await Bun.sleep(config.loopIntervalMs);
  }
}

export async function run(
  config: ShadowConfig,
  detectFn: DetectFn = config.detectCmd
    ? () => detectViaCommand(config.detectCmd!)
    : detectGreyText,
  acceptFn: AcceptFn = acceptGreyText,
): Promise<void> {
  if (config.loopMs === undefined) {
    await runInner(config, detectFn, acceptFn);
    return;
  }

  // Outer restart loop: after natural exit, wait loopMs then restart.
  // SIGINT/SIGTERM use 128+signal exit codes (130/143) so shell automation and
  // supervisors can distinguish interruption from clean completion.  Registering
  // direct-exit listeners is required because Node/Bun removes its default
  // exit behaviour once any listener is attached.
  process.on("SIGINT",  () => { process.exit(130); });
  process.on("SIGTERM", () => { process.exit(143); });
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runInner(config, detectFn, acceptFn);
    await Bun.sleep(config.loopMs);
  }
}

export function parseConfig(argv: string[]): ShadowConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      delay: { type: "string", default: "3000" },
      "detect-cmd": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      loop: { type: "string" },
      once: { type: "boolean", default: false },
      "loop-interval": { type: "string", default: "1000" },
      "log-file": { type: "string", default: "tools/shadow/shadow-observer.log" },
    },
    strict: true,
  });

  const delayMs = parseInt(values.delay ?? "3000", 10);
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    console.error("Error: --delay must be a non-negative integer (milliseconds)");
    process.exit(1);
  }

  const loopIntervalMs = parseInt(values["loop-interval"] ?? "1000", 10);
  if (!Number.isFinite(loopIntervalMs) || loopIntervalMs < 0) {
    console.error("Error: --loop-interval must be a non-negative integer (milliseconds)");
    process.exit(1);
  }

  let loopMs: number | undefined;
  if (values.loop !== undefined) {
    if (!/^\d+$/.test(values.loop)) {
      console.error("Error: --loop must be a positive integer (milliseconds)");
      process.exit(1);
    }
    const parsed = parseInt(values.loop, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      console.error("Error: --loop must be a positive integer (milliseconds)");
      process.exit(1);
    }
    loopMs = parsed;
  }

  const base = {
    delayMs,
    dryRun: values["dry-run"] ?? false,
    once: values.once ?? false,
    loopIntervalMs,
    logFile: values["log-file"] ?? "tools/shadow/shadow-observer.log",
  };
  const detectCmd = values["detect-cmd"];
  const withDetect = detectCmd !== undefined ? { ...base, detectCmd } : base;
  return loopMs !== undefined ? { ...withDetect, loopMs } : withDetect;
}

if (import.meta.main) {
  const config = parseConfig(Bun.argv.slice(2));
  run(config).catch((err: unknown) => {
    console.error("Shadow observer fatal error:", err);
    process.exit(1);
  });
}
