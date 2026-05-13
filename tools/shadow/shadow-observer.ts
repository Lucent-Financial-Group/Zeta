#!/usr/bin/env bun
/**
 * B-0402 Slice 1: Shadow observer — polling loop + Glass Halo attribution.
 *
 * Watches the Claude Code CLI for grey text (autocomplete suggestions)
 * and auto-accepts after a configurable delay if no human keystroke
 * interrupts.
 *
 * Slice 1 (this file): polling loop infrastructure + testable dry-run mode.
 * Slice 2 (deferred): empirical grey text detection via AppleScript/accessibility.
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
 *   bun tools/shadow/shadow-observer.ts [--delay <ms>] [--dry-run] [--once]
 *     [--loop-interval <ms>] [--log-file <path>]
 *
 * Flags:
 *   --delay <ms>          Delay before auto-accepting (default: 3000)
 *   --dry-run             Log intended actions without sending keystrokes
 *   --once                Run exactly one detection cycle then exit
 *   --loop-interval <ms>  Continuous mode: sleep between cycles (default: 1000)
 *   --log-file <path>     Log file path (default: tools/shadow/shadow-observer.log)
 */

import { appendFileSync } from "node:fs";
import { parseArgs } from "util";

export interface ShadowConfig {
  delayMs: number;
  dryRun: boolean;
  logFile: string;
  loopIntervalMs: number;
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

export async function detectGreyText(): Promise<string | null> {
  // Phase 1 stub: grey text detection requires empirical testing.
  //
  // Candidate approaches for slice 2:
  //   a) AppleScript AXRole/AXValue on terminal accessibility tree
  //   b) Screen capture + OCR with color filtering
  //   c) Claude Code internal API (if exposed via IPC/socket)
  //   d) Terminal emulator accessibility attributes
  //
  // Until empirically validated, returns null (no detection).
  return null;
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

export async function run(
  config: ShadowConfig,
  detectFn: DetectFn = detectGreyText,
  acceptFn: AcceptFn = acceptGreyText,
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

function parseConfig(argv: string[]): ShadowConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      delay: { type: "string", default: "3000" },
      "dry-run": { type: "boolean", default: false },
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

  return {
    delayMs,
    dryRun: values["dry-run"] ?? false,
    once: values.once ?? false,
    loopIntervalMs,
    logFile: values["log-file"] ?? "tools/shadow/shadow-observer.log",
  };
}

if (import.meta.main) {
  const config = parseConfig(Bun.argv.slice(2));
  run(config).catch((err: unknown) => {
    console.error("Shadow observer fatal error:", err);
    process.exit(1);
  });
}
