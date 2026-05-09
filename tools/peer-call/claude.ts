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
const PEER_NAME = "Claude";
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

function parseArgs(argv: readonly string[]): Args | ArgHelp | ArgError {
  const state = { prompt: "", allowEmpty: false };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i] ?? "";
    if (a === "--help" || a === "-h") {
      return { help: true };
    }
    if (a === "--allow-empty") {
      state.allowEmpty = true;
      i++;
      continue;
    }
    if (a === "--") {
      state.prompt = argv.slice(i + 1).join(" ");
      break;
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
  process.stdout.write(
    `claude.ts — self-call wrapper (B-0327 smallest slice)\n` +
      `Usage: bun tools/peer-call/claude.ts [flags] <prompt>\n` +
      `  --help              Show this help\n` +
      `  --allow-empty       Bypass firewall for empty/test prompts\n` +
      `Exit codes: 0 success | 1 usage error | 2 claude error | 3 firewall reject\n`,
  );
}

export function main(argv: readonly string[]): number {
  const parsed = parseArgs(argv);
  if ("help" in parsed) {
    printHelp();
    return 0;
  }
  if ("error" in parsed) {
    process.stderr.write(`${parsed.error}\n`);
    return parsed.exitCode;
  }
  const { prompt, allowEmpty } = parsed;

  if (allowEmpty) {
    process.stderr.write(formatBypassMessage(PEER_NAME));
  } else {
    const fwReason = peerFirewallCheck(prompt, DEFAULT_SUBSTANTIVE_TRIGGERS);
    if (fwReason !== null) {
      process.stderr.write(formatRejectionMessage(PEER_NAME, fwReason));
      return 3;
    }
  }

  // Spawn fresh claude --print for cold-boot (no inherited session context)
  const result = spawnSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    CLAUDE_CLI,
    ["--print", prompt],
    {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.error) {
    process.stderr.write(`error: failed to spawn ${CLAUDE_CLI}: ${result.error.message}\n`);
    return 1;
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const exitCode = result.status ?? 1;
  if (exitCode !== 0) {
    process.stderr.write(`\nclaude exited with code ${String(exitCode)}\n`);
    return 2;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
