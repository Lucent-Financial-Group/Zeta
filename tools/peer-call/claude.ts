#!/usr/bin/env bun
// claude.ts — self-call wrapper for spawning fresh Claude Code CLI instance
// in subprocess mode for cold-boot self-testing and cross-verification.
//
// Part of the tools/peer-call/ suite (implements smallest slice of B-0327).
// Cold-boot fidelity: child process loads CLAUDE.md / harness surface
// independently; parent context does not leak.
//
// Usage (smallest slice supports):
//   bun tools/peer-call/claude.ts --help
//   bun tools/peer-call/claude.ts "prompt text"
//   bun tools/peer-call/claude.ts --allow-empty "prompt"
//
// Routes to `claude --print` (non-interactive headless per CLI help).
// Exit codes per convention: 0 success, 1 error, 2 peer error, 3 firewall reject.

import { spawnSync } from "node:child_process";
import {
  formatBypassMessage,
  formatRejectionMessage,
  DEFAULT_SUBSTANTIVE_TRIGGERS,
  peerFirewallCheck,
} from "./_firewall";

const CLAUDE_CLI = "claude";
const SPAWN_MAX_BUFFER = 16 * 1024 * 1024;

interface Args {
  readonly prompt: string;
  readonly allowEmpty: boolean;
}

interface ArgHelp {
  readonly help: true;
}

interface ArgError {
  readonly error: string;
  readonly exitCode: 1;
}

function parseArgs(argv: string[]): Args | ArgHelp | ArgError {
  const state = { prompt: "", allowEmpty: false };
  let i = 2; // skip bun + script
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      return { help: true };
    }
    if (a === "--allow-empty") {
      state.allowEmpty = true;
      i++;
      continue;
    }
    if (!a.startsWith("-")) {
      state.prompt = argv.slice(i).join(" ");
      break;
    }
    return { error: `error: unknown flag ${a}`, exitCode: 1 };
  }
  if (!state.prompt && !state.allowEmpty) {
    return { error: "error: prompt required (use --allow-empty to bypass)", exitCode: 1 };
  }
  return { prompt: state.prompt, allowEmpty: state.allowEmpty };
}

function printHelp(): void {
  console.log(`claude.ts — self-call wrapper (B-0327 smallest slice)
Usage: bun tools/peer-call/claude.ts [flags] <prompt>
  --help              Show this help
  --allow-empty       Bypass firewall for empty/test prompts
Exit codes: 0 success | 1 usage error | 2 claude error | 3 firewall reject`);
}

function main(): number {
  const parsed = parseArgs(process.argv);
  if ("help" in parsed) {
    printHelp();
    return 0;
  }
  if ("error" in parsed) {
    console.error(parsed.error);
    return parsed.exitCode;
  }
  const { prompt, allowEmpty } = parsed;
  const check = peerFirewallCheck(prompt, allowEmpty ? [] : DEFAULT_SUBSTANTIVE_TRIGGERS);
  if (!check.ok) {
    console.error(formatRejectionMessage(check.reason));
    return 3;
  }
  if (allowEmpty) {
    console.error(formatBypassMessage());
  }
  // Spawn fresh claude --print for cold-boot (no inherited session context)
  const result = spawnSync(CLAUDE_CLI, ["--print", prompt], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    console.error(`error: failed to spawn ${CLAUDE_CLI}: ${result.error.message}`);
    return 1;
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

process.exitCode = main();
