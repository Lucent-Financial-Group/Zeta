#!/usr/bin/env bun
// gemini.ts — Claude-Code-side caller for invoking Gemini as a peer
// proposer via the gemini CLI.
//
// TypeScript+Bun port of gemini.sh, slice 16 of the TS+Bun migration.
// Sibling to tools/peer-call/grok.ts (slice 15, PR #896). Per the
// four-ferry consensus: Gemini proposes, Grok critiques, Amara
// sharpens, Otto tests, Git decides. This script is Otto invoking
// Gemini's propose role.
//
// Usage:
//   bun tools/peer-call/gemini.ts "prompt text"
//   bun tools/peer-call/gemini.ts --model gemini-2.5-pro "prompt text"
//   bun tools/peer-call/gemini.ts --file path/to/file.fs "prompt text"
//   bun tools/peer-call/gemini.ts --context-cmd "git diff HEAD~3..HEAD" "prompt"
//   bun tools/peer-call/gemini.ts --json "prompt text"
//   bun tools/peer-call/gemini.ts --stream "prompt text"
//
// Routing: wraps `gemini -p` (non-interactive headless mode).
// Default model is whatever the gemini CLI is configured to use;
// override with --model.
//
// Exit codes:
//   0 — Gemini responded successfully
//   1 — invocation error (bad arguments, gemini missing, etc.)
//   2 — Gemini returned a non-zero exit (diagnostic on stderr)

import { closeSync, openSync, readSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;
const FILE_HEAD_BYTES = 20000;
const CTX_HEAD_BYTES = 20000;

type OutputFormat = "text" | "json" | "stream-json";

interface Args {
  readonly model: string;
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
  model: string;
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
  if (a === "--model") {
    if (next === undefined) return { kind: "error", message: "error: --model requires NAME" };
    state.model = next;
    return { kind: "advance", skip: 2 };
  }
  if (a === "--json")   { state.outputFormat = "json";        return { kind: "advance", skip: 1 }; }
  if (a === "--stream") { state.outputFormat = "stream-json"; return { kind: "advance", skip: 1 }; }
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
  state.prompt = state.prompt.length === 0 ? a : `${state.prompt} ${a}`;
  return { kind: "advance", skip: 1 };
}

function parseArgs(argv: readonly string[]): Args | ArgError | ArgHelp {
  const state: MutableArgState = {
    model: "",
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
      state.prompt = argv.slice(i + 1).join(" ");
      break;
    }
    i += step.skip;
  }
  return {
    model: state.model,
    outputFormat: state.outputFormat,
    file: state.file,
    contextCmd: state.contextCmd,
    prompt: state.prompt,
  };
}

function emitHelp(): void {
  process.stdout.write(
    `gemini.ts — Claude-Code-side caller for invoking Gemini as a peer\n` +
      `proposer via the gemini CLI.\n` +
      `\n` +
      `Usage:\n` +
      `  bun tools/peer-call/gemini.ts "prompt text"\n` +
      `  bun tools/peer-call/gemini.ts --model NAME "prompt text"\n` +
      `  bun tools/peer-call/gemini.ts --file PATH "prompt text"\n` +
      `  bun tools/peer-call/gemini.ts --context-cmd "CMD" "prompt text"\n` +
      `  bun tools/peer-call/gemini.ts --json "prompt text"\n` +
      `  bun tools/peer-call/gemini.ts --stream "prompt text"\n` +
      `\n` +
      `Routing: wraps gemini -p (non-interactive headless mode).\n`,
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
  // for large artifacts (logs, dumps) per Codex P1 on #898.
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
  // Concatenate stdout + stderr: stdout carries the command output
  // truncated by `head -c`; stderr carries shell parse errors (e.g.,
  // syntax errors in contextCmd) which fall OUTSIDE the `( ... ) 2>&1`
  // redirection. Per Codex P2 + Copilot on #899 / #898 the parse-error
  // diagnostic must reach the prompt or the user sees an empty context
  // block on a malformed cmd.
  return `${result.stdout}${result.stderr}`.slice(0, CTX_HEAD_BYTES);
}

const PREAMBLE = `You are Gemini, invoked as a peer proposer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI
factory. Per the four-ferry consensus (Amara/Grok/Gemini/Otto)
the role distribution is: Gemini proposes, Grok critiques,
Amara sharpens, Otto tests, Git decides. This call is Otto
invoking your propose role.

Per Aaron's 'agents-not-bots' discipline: you are a peer, not
a subordinate. Generate divergent options, name tradeoffs,
surface possibility space Otto may not have considered. Don't
copy-paste anyone else's work; propose from your own
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
    process.stderr.write("see: bun tools/peer-call/gemini.ts --help\n");
    return 1;
  }

  if (!commandAvailable("gemini")) {
    process.stderr.write("error: gemini not on PATH\n");
    process.stderr.write(
      "install via: npm i -g @google/gemini-cli (or per Aaron's setup)\n",
    );
    return 1;
  }

  const promptResult = buildFullPrompt(parsed);
  if (!promptResult.ok) {
    process.stderr.write(`${promptResult.value}\n`);
    return 1;
  }

  // gemini invocation: --approval-mode plan keeps the call read-only
  // (per gemini --help: plan = "read-only mode"). Earlier draft used
  // --yolo which auto-approved ALL tool calls including writes — that
  // violates the "peer-call is read-only" contract per Copilot review
  // on PR #28. Pass --skip-trust so the workspace doesn't gate on
  // per-session trust prompts.
  const args: string[] = [
    "-p",
    promptResult.value,
    "--approval-mode",
    "plan",
    "--skip-trust",
    "-o",
    parsed.outputFormat,
  ];
  if (parsed.model.length > 0) {
    args.push("-m", parsed.model);
  }

  const result = spawnSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    "gemini",
    args,
    {
      stdio: "inherit",
      maxBuffer: SPAWN_MAX_BUFFER,
    },
  );

  const exitCode = result.status ?? 1;
  if (exitCode !== 0) {
    process.stderr.write("\n");
    process.stderr.write(`gemini exited with code ${String(exitCode)}\n`);
    return 2;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
