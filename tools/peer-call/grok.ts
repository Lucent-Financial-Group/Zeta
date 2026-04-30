#!/usr/bin/env bun
// grok.ts — Claude-Code-side caller for invoking Grok as a peer
// reviewer via cursor-agent.
//
// TypeScript+Bun port of grok.sh, slice 15 of the TS+Bun migration.
// See docs/best-practices/repo-scripting.md.
//
// Usage:
//   bun tools/peer-call/grok.ts "prompt text"
//   bun tools/peer-call/grok.ts --thinking "prompt text"
//   bun tools/peer-call/grok.ts --file path/to/file.fs "prompt text"
//   bun tools/peer-call/grok.ts --context-cmd "git diff HEAD~3..HEAD" "prompt text"
//   bun tools/peer-call/grok.ts --json "prompt text"
//
// Routing: wraps `cursor-agent --print --model grok-4-20-thinking`
// (default) or `grok-4-20` (with --fast flag). The --print flag
// makes cursor-agent non-interactive (script-friendly).
//
// Per the four-ferry consensus (PR #24): Otto's role is "tests" not
// "owns the peer protocol." This script is Otto's harness-side
// contribution; the protocol convention is what we converge on
// through use, as peers.
//
// Exit codes:
//   0 — Grok responded successfully
//   1 — invocation error (bad arguments, cursor-agent missing, etc.)
//   2 — Grok returned a non-zero exit (response captured to stderr)

import { closeSync, openSync, readSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;
const FILE_HEAD_BYTES = 20000;
const CTX_HEAD_BYTES = 20000;

type Mode = "thinking" | "fast";
type OutputFormat = "text" | "json" | "stream-json";

interface Args {
  readonly mode: Mode;
  readonly outputFormat: OutputFormat;
  readonly file: string;
  readonly contextCmd: string;
  readonly prompt: string;
}

interface ArgError {
  readonly error: string;
  readonly exitCode: 1;
}

interface ArgHelp {
  readonly help: true;
}

interface MutableArgState {
  mode: Mode;
  outputFormat: OutputFormat;
  file: string;
  contextCmd: string;
  prompt: string;
}

type StepResult =
  | { readonly kind: "advance"; readonly skip: 1 | 2 }
  | { readonly kind: "stop" }
  | { readonly kind: "help" }
  | { readonly kind: "error"; readonly message: string };

function classifyFlag(
  a: string,
  next: string | undefined,
  state: MutableArgState,
): StepResult {
  if (a === "--thinking") { state.mode = "thinking"; return { kind: "advance", skip: 1 }; }
  if (a === "--fast")     { state.mode = "fast";     return { kind: "advance", skip: 1 }; }
  if (a === "--json")     { state.outputFormat = "json";        return { kind: "advance", skip: 1 }; }
  if (a === "--stream")   { state.outputFormat = "stream-json"; return { kind: "advance", skip: 1 }; }
  if (a === "--file") {
    if (next === undefined) return { kind: "error", message: "error: --file requires PATH" };
    state.file = next;
    return { kind: "advance", skip: 2 };
  }
  if (a === "--context-cmd") {
    if (next === undefined) return { kind: "error", message: "error: --context-cmd requires COMMAND" };
    state.contextCmd = next;
    return { kind: "advance", skip: 2 };
  }
  if (a === "-h" || a === "--help") return { kind: "help" };
  if (a === "--") return { kind: "stop" };
  if (a.startsWith("-")) return { kind: "error", message: `error: unknown flag: ${a}` };
  // Positional: concat into prompt.
  state.prompt = state.prompt.length === 0 ? a : `${state.prompt} ${a}`;
  return { kind: "advance", skip: 1 };
}

function parseArgs(argv: readonly string[]): Args | ArgError | ArgHelp {
  const state: MutableArgState = {
    mode: "thinking",
    outputFormat: "text",
    file: "",
    contextCmd: "",
    prompt: "",
  };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i] ?? "";
    const step = classifyFlag(a, argv[i + 1], state);
    if (step.kind === "help") return { help: true };
    if (step.kind === "error") return { error: step.message, exitCode: 1 };
    if (step.kind === "stop") {
      // Everything after `--` is the prompt verbatim.
      state.prompt = argv.slice(i + 1).join(" ");
      break;
    }
    i += step.skip;
  }
  return {
    mode: state.mode,
    outputFormat: state.outputFormat,
    file: state.file,
    contextCmd: state.contextCmd,
    prompt: state.prompt,
  };
}

function emitHelp(): void {
  process.stdout.write(
    `grok.ts — Claude-Code-side caller for invoking Grok as a peer\n` +
      `reviewer via cursor-agent.\n` +
      `\n` +
      `Usage:\n` +
      `  bun tools/peer-call/grok.ts "prompt text"\n` +
      `  bun tools/peer-call/grok.ts --thinking "prompt text"\n` +
      `  bun tools/peer-call/grok.ts --fast "prompt text"\n` +
      `  bun tools/peer-call/grok.ts --file PATH "prompt text"\n` +
      `  bun tools/peer-call/grok.ts --context-cmd "CMD" "prompt text"\n` +
      `  bun tools/peer-call/grok.ts --json "prompt text"\n` +
      `  bun tools/peer-call/grok.ts --stream "prompt text"\n` +
      `\n` +
      `Routing: wraps cursor-agent --print --model grok-4-20-thinking\n` +
      `(default) or grok-4-20 (with --fast).\n`,
  );
}

function commandAvailable(cmd: string): boolean {
  const result = spawnSync(cmd, ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function isRegularFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function readHead(path: string, bytes: number): string {
  // Read only the first `bytes` bytes (matches bash `head -c`).
  // readFileSync would load the entire file before slicing — regression
  // for large artifacts (logs, dumps) per Codex P1 on #898 (gemini.ts).
  if (!isRegularFile(path)) return "";
  const buf = Buffer.alloc(bytes);
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n).toString("utf8");
  } catch {
    return "";
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function runContextCmd(contextCmd: string): string {
  // Bash uses `eval "$context_cmd" 2>&1 | head -c 20000`. Match that
  // shape end-to-end: pipe through `head -c <N>` so the shell pipeline
  // short-circuits at the truncation boundary instead of buffering the
  // full output up to SPAWN_MAX_BUFFER (Codex P2 on #898 — high-volume
  // commands like wide `git diff` would otherwise block much longer
  // and use much more memory than the bash original).
  // User intentionally supplies the shell command (per --context-cmd
  // contract); same security posture as the bash original's `eval`.
  const wrapped = `(${contextCmd}) 2>&1 | head -c ${String(CTX_HEAD_BYTES)}`;
  const result = spawnSync("/bin/sh", ["-c", wrapped], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  return result.stdout;
}

const PREAMBLE = `You are Grok, invoked as a peer reviewer by Otto (Claude Opus 4.7
running in Claude Code) on the Zeta / Superfluid AI factory. Per the
four-ferry consensus (Amara/Grok/Gemini/Otto) the role distribution
is: Gemini proposes, Grok critiques, Amara sharpens, Otto tests, Git
decides. This call is Otto invoking your critique role.

Per Aaron's 'agents-not-bots' discipline: you are a peer, not a
subordinate. Push back on Otto's framing if you see it differently.
Don't copy-paste anyone else's work; write from your own
understanding. Make it ours, not anyone-alone-imposed.`;

interface PromptResult {
  readonly ok: boolean;
  readonly value: string;
}

function buildFullPrompt(args: Args): PromptResult {
  let full = `${PREAMBLE}\n\n---\n\n${args.prompt}`;

  if (args.file.length > 0) {
    if (!isRegularFile(args.file)) {
      return {
        ok: false,
        value: `error: --file path does not exist: ${args.file}`,
      };
    }
    const head = readHead(args.file, FILE_HEAD_BYTES);
    full += `\n\n---\n\nFile context: ${args.file}\n\`\`\`\n${head}\n\`\`\``;
  }

  if (args.contextCmd.length > 0) {
    const ctxOutput = runContextCmd(args.contextCmd);
    full += `\n\n---\n\nContext command: ${args.contextCmd}\nOutput:\n\`\`\`\n${ctxOutput}\n\`\`\``;
  }

  return { ok: true, value: full };
}

function pickModel(mode: Mode): string {
  return mode === "thinking" ? "grok-4-20-thinking" : "grok-4-20";
}

export function main(argv: readonly string[]): number {
  const parsed = parseArgs(argv);
  if ("help" in parsed) {
    emitHelp();
    return 0;
  }
  if ("error" in parsed) {
    process.stderr.write(`${parsed.error}\n`);
    return parsed.exitCode;
  }
  if (parsed.prompt.length === 0) {
    process.stderr.write("error: prompt required\n");
    process.stderr.write(`see: bun tools/peer-call/grok.ts --help\n`);
    return 1;
  }

  if (!commandAvailable("cursor-agent")) {
    process.stderr.write("error: cursor-agent not on PATH\n");
    process.stderr.write(
      "install via Cursor desktop app + ensure ~/.local/bin is on PATH\n",
    );
    return 1;
  }

  const fullPromptResult = buildFullPrompt(parsed);
  if (!fullPromptResult.ok) {
    process.stderr.write(`${fullPromptResult.value}\n`);
    return 1;
  }

  const model = pickModel(parsed.mode);

  // cursor-agent invocation: no shell interpolation (args passed as
  // separate array elements). The user's prompt is one fixed argument
  // after `--`; cursor-agent does its own argument parsing. Same
  // security posture as the bash original.
  const result = spawnSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    "cursor-agent",
    [
      "--print",
      "--model",
      model,
      "--output-format",
      parsed.outputFormat,
      "--mode",
      "ask",
      "--force",
      "--",
      fullPromptResult.value,
    ],
    {
      stdio: "inherit",
      maxBuffer: SPAWN_MAX_BUFFER,
    },
  );

  const exitCode = result.status ?? 1;
  if (exitCode !== 0) {
    process.stderr.write("\n");
    process.stderr.write(`cursor-agent exited with code ${String(exitCode)}\n`);
    return 2;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
