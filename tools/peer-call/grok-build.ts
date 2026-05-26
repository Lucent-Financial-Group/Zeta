#!/usr/bin/env bun
// grok-build.ts — Claude-Code-side caller for invoking Grok as a peer
// reviewer via the native Grok-Build CLI (xAI's Claude-Code-compatible
// agent harness, installed as `grok`).
//
// Supersedes `tools/peer-call/grok.ts` (which wraps cursor-agent and
// has been broken since 2026-05-11 per B-0421 — cursor-agent exit 1 /
// empty output). The old `grok.ts` is retained for back-compat reference
// but new peer-calls should target this wrapper.
//
// The native Grok-Build CLI is explicitly Claude-Code-compatible:
//   - `--allow` / `--deny` rules (Claude Code: --allowedTools)
//   - `--permission-mode default|acceptEdits|auto|dontAsk|bypassPermissions|plan`
//   - `--system-prompt-override` (Claude Code: --system-prompt)
//   - `-p, --single <PROMPT>` for headless single-turn (analog of `claude -p`)
//   - `--output-format plain|json|streaming-json` for structured output
//   - `--reasoning-effort <EFFORT>` for reasoning-model effort
//   - `--best-of-n <N>` for parallel best-of execution
//   - `-r, --resume [<SESSION_ID>]` for session continuity
//   - `agent` subcommand for headless mode
//   - MCP server configs, plugin/marketplace, cross-session memory
//
// Empirical anchor 2026-05-26: Aaron installed `grok` CLI during the
// iter-5 substrate session; the `--help` output confirmed full
// Claude-Code parity. This wrapper closes B-0421 by replacing the
// cursor-agent dependency with the native `grok -p` flow.
//
// Usage:
//   bun tools/peer-call/grok-build.ts "prompt text"
//   bun tools/peer-call/grok-build.ts --thinking "prompt text"
//   bun tools/peer-call/grok-build.ts --file path/to/file.md "prompt text"
//   bun tools/peer-call/grok-build.ts --context-cmd "git diff HEAD~3..HEAD" "prompt"
//   bun tools/peer-call/grok-build.ts --output-file PATH "prompt text"
//   bun tools/peer-call/grok-build.ts --json "prompt text"
//   bun tools/peer-call/grok-build.ts --allow-empty "prompt"  # bypass firewall
//
// Routing: wraps `grok -p "PROMPT" --allow Read,Glob,Grep
// --permission-mode auto --output-format plain` (read-only blast radius
// matching claude.ts; auto-permission-mode for autonomous-loop friendly
// invocation; --reasoning-effort high added with --thinking).
//
// Output capture (Class B fix for vera-output-capture-pagination):
// stdout is teed to a file under /tmp/peer-call-output/<ts>-grok-build.md
// (auto-generated path) or to --output-file PATH if specified, with a
// final "OUTPUT-FILE: <path>" marker on stdout so shell callers using
// `tail -1` can recover the path and read the FULL reply without
// truncation. Mirrors codex.ts / riven.ts / grok.ts shape.
//
// Exit codes:
//   0 — Grok-Build responded successfully
//   1 — invocation error (bad arguments, grok CLI missing, etc.)
//   2 — Grok-Build returned a non-zero exit (response captured to stderr)
//   3 — input-firewall rejected the prompt as not work-extractable

import { closeSync, mkdirSync, openSync, readSync, statSync, writeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  formatBypassMessage,
  formatRejectionMessage,
  GROK_SUBSTANTIVE_TRIGGERS,
  peerFirewallCheck,
} from "./_firewall";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;
const FILE_HEAD_BYTES = 20000;
const CTX_HEAD_BYTES = 20000;
const GROK_CLI = "grok";

// Read-only tools: enables cold-boot verification + substrate review
// while limiting blast radius (no writes, no bash execution). Matches
// claude.ts CLAUDE_TOOLS pattern.
const GROK_ALLOW_RULES = "Read,Glob,Grep";

type OutputFormat = "plain" | "json" | "streaming-json";

interface Args {
  readonly thinking: boolean;
  readonly outputFormat: OutputFormat;
  readonly file: string;
  readonly contextCmd: string;
  readonly prompt: string;
  readonly allowEmpty: boolean;
  readonly outputFile: string;
}

interface ArgError {
  readonly error: string;
}

function parseArgs(argv: readonly string[]): Args | ArgError {
  let thinking = false;
  let outputFormat: OutputFormat = "plain";
  let file = "";
  let contextCmd = "";
  let allowEmpty = false;
  let outputFile = "";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--thinking") {
      thinking = true;
      continue;
    }
    if (a === "--json") {
      outputFormat = "json";
      continue;
    }
    if (a === "--file") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        return { error: "--file requires a path argument" };
      }
      file = next;
      i++;
      continue;
    }
    if (a === "--context-cmd") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        return { error: "--context-cmd requires a command string argument" };
      }
      contextCmd = next;
      i++;
      continue;
    }
    if (a === "--output-file") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        return { error: "--output-file requires a path argument" };
      }
      outputFile = next;
      i++;
      continue;
    }
    if (a === "--allow-empty") {
      allowEmpty = true;
      continue;
    }
    if (a === "-h" || a === "--help") {
      return {
        error:
          "Usage: bun tools/peer-call/grok-build.ts [flags] <prompt>\n" +
          "  --thinking            use high reasoning effort\n" +
          "  --json                output format json (default: plain)\n" +
          "  --file <path>         include file content as context\n" +
          "  --context-cmd <cmd>   include allow-listed git/gh/rg cmd output as context\n" +
          "  --output-file <path>  write full response to path (default: /tmp/peer-call-output/<ts>-grok-build.md)\n" +
          "  --allow-empty         bypass input-firewall substantive-trigger check\n",
      };
    }
    if (a.startsWith("-")) {
      return { error: `unknown flag: ${a}` };
    }
    positional.push(a);
  }

  if (positional.length === 0) {
    return { error: "no prompt provided (pass as positional argument or via --file)" };
  }
  if (positional.length > 1) {
    return {
      error: `expected exactly 1 positional prompt argument; got ${positional.length}: ${positional.join(" | ")}`,
    };
  }
  return {
    thinking,
    outputFormat,
    file,
    contextCmd,
    prompt: positional[0]!,
    allowEmpty,
    outputFile,
  };
}

function isRegularFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function readFileHead(path: string, maxBytes: number): string {
  // Mitigates TOCTOU between stat + open (CodeQL on #5110): no longer
  // uses statSync.size to size the buffer; allocates a fixed
  // maxBytes-sized buffer + reads what fits. Mirrors claude.ts
  // readHead pattern. The isRegularFile pre-check is best-effort
  // (still racy with the open) but the alloc-size no longer depends
  // on the stat result, so a swap-to-symlink between stat + open
  // cannot cause an oversized buffer allocation.
  if (!isRegularFile(path)) {
    return `[file-read-error: ${path}: not a regular file]`;
  }
  const buf = Buffer.alloc(maxBytes);
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const n = readSync(fd, buf, 0, maxBytes, 0);
    return buf.subarray(0, n).toString("utf8");
  } catch (e) {
    return `[file-read-error: ${path}: ${e instanceof Error ? e.message : String(e)}]`;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

type AllowedContextExecutable = "git" | "gh" | "rg";

function parseContextCmd(cmd: string): { executable: AllowedContextExecutable; args: string[] } | { error: string } {
  const trimmed = cmd.trim();
  if (trimmed === "") return { error: "context-cmd is empty" };
  const parts = trimmed.split(/\s+/);
  const head = parts[0];
  if (head !== "git" && head !== "gh" && head !== "rg") {
    return { error: `context-cmd executable must be one of git, gh, rg; got: ${head}` };
  }
  return { executable: head, args: parts.slice(1) };
}

function runContextCmd(cmd: string, maxBytes: number): string {
  const parsed = parseContextCmd(cmd);
  if ("error" in parsed) {
    return `[context-cmd-parse-error: ${parsed.error}]`;
  }
  try {
    const r = spawnSync(parsed.executable, parsed.args, {
      encoding: "utf8",
      maxBuffer: SPAWN_MAX_BUFFER,
    });
    if (r.error) {
      return `[context-cmd-error: ${parsed.executable}: ${r.error.message}]`;
    }
    let text = r.stdout || "";
    if (text.length > maxBytes) {
      text = text.slice(0, maxBytes) + `\n\n[... context-cmd output truncated; ${text.length - maxBytes} bytes elided ...]`;
    }
    return text;
  } catch (e) {
    return `[context-cmd-exception: ${e instanceof Error ? e.message : String(e)}]`;
  }
}

function buildFullPrompt(args: Args): string {
  const blocks: string[] = [];
  if (args.file) {
    blocks.push(`# File context: ${args.file}\n\n${readFileHead(args.file, FILE_HEAD_BYTES)}`);
  }
  if (args.contextCmd) {
    blocks.push(`# Context-cmd: \`${args.contextCmd}\`\n\n\`\`\`\n${runContextCmd(args.contextCmd, CTX_HEAD_BYTES)}\n\`\`\``);
  }
  blocks.push(`# Prompt\n\n${args.prompt}`);
  return blocks.join("\n\n---\n\n");
}

function defaultOutputPath(): string {
  // Mitigates CodeQL "insecure temporary file" (predictable name) on
  // #5110: add a random 6-char base36 suffix so two parallel
  // invocations within the same millisecond don't collide AND the
  // filename isn't predictable to an attacker watching the temp dir.
  // Mirrors claude.ts makeAutoPath pattern.
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  const rand = Math.random().toString(36).slice(2, 8);
  const baseTmp = process.env["PEER_CALL_OUTPUT_DIR"] ?? "/tmp/peer-call-output";
  // Best-effort prefer baseTmp; fall back to os.tmpdir-based path if
  // the requested dir can't be made (e.g., /tmp is read-only).
  try {
    mkdirSync(baseTmp, { recursive: true });
    return join(baseTmp, `${ts}-grok-build-${rand}.md`);
  } catch {
    const fallback = join(tmpdir(), "peer-call-output");
    mkdirSync(fallback, { recursive: true });
    return join(fallback, `${ts}-grok-build-${rand}.md`);
  }
}

function writeOutputExclusive(path: string, data: string): void {
  // Mitigates symlink-overwrite attack (CodeQL "insecure temporary
  // file"): open with `wx` (exclusive create — fails if path exists,
  // preventing follow-symlink overwrites) + mode 0o600 (only owner
  // can read). Mirrors claude.ts writeOutput pattern.
  let fd: number | undefined;
  try {
    fd = openSync(path, "wx", 0o600);
    const buf = Buffer.from(data, "utf8");
    writeSync(fd, buf, 0, buf.length, 0);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function main(): number {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    process.stderr.write(`grok-build.ts: ${parsed.error}\n`);
    return 1;
  }

  // Input firewall: gate on substantive triggers unless --allow-empty.
  // peerFirewallCheck returns `string | null` — string is the rejection
  // reason; null means the prompt passed the substantive-trigger gate.
  if (!parsed.allowEmpty) {
    const rejectionReason = peerFirewallCheck(parsed.prompt, GROK_SUBSTANTIVE_TRIGGERS);
    if (rejectionReason !== null) {
      process.stderr.write(formatRejectionMessage("grok-build", rejectionReason) + "\n");
      return 3;
    }
  } else {
    process.stderr.write(formatBypassMessage("grok-build") + "\n");
  }

  const fullPrompt = buildFullPrompt(parsed);

  // Build grok CLI args. The native grok CLI is Claude-Code-compatible:
  //   -p / --single <prompt>     : headless single-turn (analog of `claude -p`)
  //   --allow <rules>            : permission allow rule(s) (Claude Code: --allowedTools)
  //   --permission-mode auto     : auto-approve safe ops; matches autonomous-loop intent
  //   --output-format plain|json : structured output
  //   --reasoning-effort high    : for reasoning models (gated by --thinking flag)
  const grokArgs: string[] = [
    "-p",
    fullPrompt,
    "--allow",
    GROK_ALLOW_RULES,
    "--permission-mode",
    "auto",
    "--output-format",
    parsed.outputFormat,
  ];
  if (parsed.thinking) {
    grokArgs.push("--reasoning-effort", "high");
  }

  // Determine output file path. For operator-explicit paths,
  // mkdir the parent dir; for auto-generated paths, defaultOutputPath
  // already did so. Operator-explicit paths use non-exclusive write
  // (operator chose the path; may want to overwrite); auto-generated
  // paths use exclusive `wx` write per claude.ts pattern.
  const useExplicitPath = parsed.outputFile !== "";
  const outPath = useExplicitPath ? parsed.outputFile : defaultOutputPath();
  if (useExplicitPath) {
    try {
      mkdirSync(dirname(outPath), { recursive: true });
    } catch (e) {
      process.stderr.write(
        `grok-build.ts: failed to create output dir ${dirname(outPath)}: ${e instanceof Error ? e.message : String(e)}\n`,
      );
      return 1;
    }
  }

  // Spawn grok CLI
  const r = spawnSync(GROK_CLI, grokArgs, {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  if (r.error) {
    process.stderr.write(
      `grok-build.ts: failed to spawn ${GROK_CLI}: ${r.error.message}\n` +
        `(is the grok CLI installed + on PATH? install via 'curl ... | sh' from xAI per their docs)\n`,
    );
    return 1;
  }
  if (r.status !== 0) {
    process.stderr.write(`grok-build.ts: grok exited ${r.status}\n`);
    if (r.stderr) process.stderr.write(r.stderr);
    return 2;
  }

  const response = r.stdout || "";

  // Write full response to output file. Auto-generated paths use
  // exclusive `wx` create (mitigates symlink-overwrite); explicit
  // operator paths use plain write (operator's intent is respected).
  try {
    if (useExplicitPath) {
      // Plain write for explicit operator path — operator can choose
      // to overwrite. Use exclusive=false signal by calling
      // writeOutputExclusive with a fallback isn't right; instead
      // open with `w` + mode 0o600 directly here.
      let fd: number | undefined;
      try {
        fd = openSync(outPath, "w", 0o600);
        const buf = Buffer.from(response, "utf8");
        writeSync(fd, buf, 0, buf.length, 0);
      } finally {
        if (fd !== undefined) closeSync(fd);
      }
    } else {
      writeOutputExclusive(outPath, response);
    }
  } catch (e) {
    process.stderr.write(
      `grok-build.ts: failed to write output file ${outPath}: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    return 1;
  }

  // Tee response to stdout (capped to first ~20k chars for inline display;
  // full response always available at outPath via the OUTPUT-FILE marker)
  const INLINE_CAP = 20000;
  if (response.length > INLINE_CAP) {
    process.stdout.write(response.slice(0, INLINE_CAP));
    process.stdout.write(
      `\n\n[... response truncated inline; ${response.length - INLINE_CAP} bytes elided ...]\n`,
    );
  } else {
    process.stdout.write(response);
  }

  // Always emit the OUTPUT-FILE marker last so `tail -1` recovers the path
  process.stdout.write(`\nOUTPUT-FILE: ${outPath}\n`);

  return 0;
}

process.exit(main());
