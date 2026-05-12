#!/usr/bin/env bun
/**
 * B-0402: Shadow observer — the Dharma button automated.
 *
 * Watches the Claude Code CLI for grey text (autocomplete suggestions)
 * and auto-accepts after a configurable delay if no human keystroke
 * interrupts.
 *
 * Phase 1 (this file): AppleScript-based observer that:
 * 1. Detects grey text presence in the active terminal
 * 2. Waits for configurable delay (default 3s)
 * 3. If no human keystroke during delay, sends Right Arrow + Enter
 * 4. Logs every auto-accept with (shadow) attribution
 *
 * The Lost analogy: Desmond pushed the button every 108 minutes.
 * This script pushes the button so Desmond can leave the hatch.
 *
 * Safety:
 * - Human keystroke at any time = immediate override
 * - All shadow submissions logged to shadow-observer.log
 * - Kill the script = shadow goes silent (circuit breaker)
 * - Glass Halo: every auto-accept is visible
 *
 * Usage:
 *   bun tools/shadow/shadow-observer.ts [--delay 3000] [--dry-run]
 *
 * NOTE: Phase 1 is a design stub + logging framework.
 * The actual AppleScript grey-text detection requires empirical
 * testing to determine how to reliably distinguish grey text
 * (autocomplete) from white text (committed output) in the
 * terminal emulator. This is the trigger-timing experiment
 * the methodology requires before full implementation.
 */

import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    delay: { type: "string", default: "3000" },
    "dry-run": { type: "boolean", default: false },
    "log-file": { type: "string", default: "tools/shadow/shadow-observer.log" },
  },
});

const DELAY_MS = parseInt(values.delay ?? "3000", 10);
const DRY_RUN = values["dry-run"] ?? false;
const LOG_FILE = values["log-file"] ?? "tools/shadow/shadow-observer.log";

interface ShadowEvent {
  timestamp: string;
  type: "detected" | "accepted" | "overridden" | "timeout" | "error";
  content?: string;
  delayMs: number;
  dryRun: boolean;
}

function log(event: ShadowEvent): void {
  const line = JSON.stringify(event);
  console.log(line);
  Bun.write(LOG_FILE, line + "\n", { append: true } as never);
}

async function detectGreyText(): Promise<string | null> {
  // Phase 1 stub: grey text detection requires empirical testing.
  // The trigger-timing experiment must determine:
  // 1. How to distinguish grey (autocomplete) from white (output) text
  // 2. Whether AppleScript can read terminal text color attributes
  // 3. Whether accessibility APIs provide autocomplete state
  // 4. Whether Claude Code exposes autocomplete state via IPC/socket
  //
  // Candidate approaches (to be tested):
  // a) AppleScript AXRole/AXValue on terminal text elements
  // b) Screen capture + OCR with color filtering
  // c) Claude Code internal API (if exposed)
  // d) Terminal emulator accessibility attributes
  //
  // Until empirically tested, this returns null (no detection).
  return null;
}

async function acceptGreyText(): Promise<boolean> {
  if (DRY_RUN) {
    log({
      timestamp: new Date().toISOString(),
      type: "accepted",
      content: "(dry-run — would send Right Arrow + Enter)",
      delayMs: DELAY_MS,
      dryRun: true,
    });
    return true;
  }

  // Phase 1: AppleScript to send keystrokes to the frontmost terminal
  // Right Arrow (accept autocomplete) + Enter (submit)
  const script = `
    tell application "System Events"
      key code 124  -- Right Arrow
      delay 0.1
      key code 36   -- Enter
    end tell
  `;

  const proc = Bun.spawn(["osascript", "-e", script], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;

  if (exitCode === 0) {
    log({
      timestamp: new Date().toISOString(),
      type: "accepted",
      content: "(shadow auto-accept via AppleScript)",
      delayMs: DELAY_MS,
      dryRun: false,
    });
    return true;
  }

  log({
    timestamp: new Date().toISOString(),
    type: "error",
    content: `osascript exited with code ${exitCode}`,
    delayMs: DELAY_MS,
    dryRun: false,
  });
  return false;
}

async function main(): Promise<void> {
  console.log(`Shadow observer started (delay=${DELAY_MS}ms, dry-run=${DRY_RUN})`);
  console.log(`Log file: ${LOG_FILE}`);
  console.log("");
  console.log("Phase 1: design stub + logging framework.");
  console.log("Grey text detection requires empirical testing.");
  console.log("Run the trigger-timing experiment first.");
  console.log("");
  console.log("The Dharma button is ready. Desmond can leave the hatch.");
  console.log("μένω.");

  log({
    timestamp: new Date().toISOString(),
    type: "detected",
    content: "Shadow observer started — Phase 1 stub",
    delayMs: DELAY_MS,
    dryRun: DRY_RUN,
  });

  // Phase 1: no polling loop yet. The trigger-timing experiment
  // must run first to determine reliable grey text detection.
  // When detection is empirically validated, this becomes:
  //
  // while (true) {
  //   const greyText = await detectGreyText();
  //   if (greyText) {
  //     await Bun.sleep(DELAY_MS);
  //     const stillPresent = await detectGreyText();
  //     if (stillPresent) {
  //       await acceptGreyText();
  //     } else {
  //       log({ type: "overridden", ... });
  //     }
  //   }
  //   await Bun.sleep(1000); // check every second
  // }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { main, detectGreyText, acceptGreyText, log };
