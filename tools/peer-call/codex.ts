#!/usr/bin/env bun
// codex.ts — Claude-Code-side caller for invoking Codex (OpenAI) as
// a peer reviewer via the codex CLI.
//
// TypeScript+Bun port of codex.sh, slice 17 of the TS+Bun migration.
// Sibling to tools/peer-call/grok.ts (slice 15) and gemini.ts
// (slice 16). Codex's role: implementation peer / code-grounded
// second opinion (not in the original four-ferry consensus list,
// but a recurring PR-review participant).
//
// Usage:
//   bun tools/peer-call/codex.ts "prompt text"
//   bun tools/peer-call/codex.ts --model gpt-5.3-codex "prompt text"
//   bun tools/peer-call/codex.ts --file path/to/file.fs "prompt text"
//   bun tools/peer-call/codex.ts --context-cmd "git diff HEAD~3..HEAD" "prompt"
//   bun tools/peer-call/codex.ts --review "review the diff for correctness"
//
// Routing: wraps `codex exec -s read-only --skip-git-repo-check`
// (default; non-interactive, sandboxed). The --review flag routes
// through `codex review` instead, which is Codex's first-class
// code-review path.
//
// Exit codes (uniform across peer-call siblings per
// tools/peer-call/README.md):
//   0 — Codex responded successfully
//   1 — invocation error (bad arguments, codex missing, etc.)
//   2 — Codex returned a non-zero exit (diagnostic on stderr)

import { closeSync, openSync, readSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;
const FILE_HEAD_BYTES = 20000;
const CTX_HEAD_BYTES = 20000;

interface Args {
  readonly model: string;
  readonly reviewMode: boolean;
  readonly file: string;
  readonly contextCmd: string;
  readonly prompt: string;
}

interface ArgError {
  readonly error: string;
  // Exit code 1 = invocation/usage error per tools/peer-call/README.md
  // (uniform 0/1/2 across all three peer-call wrappers).
  readonly exitCode: 1;
}

interface ArgHelp {
  readonly help: true;
}

interface MutableArgState {
  model: string;
  reviewMode: boolean;
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
  if (a === "--review") { state.reviewMode = true; return { kind: "advance", skip: 1 }; }
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
    reviewMode: false,
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
    reviewMode: state.reviewMode,
    file: state.file,
    contextCmd: state.contextCmd,
    prompt: state.prompt,
  };
}

function emitHelp(): void {
  process.stdout.write(
    `codex.ts — Claude-Code-side caller for invoking Codex as a peer\n` +
      `reviewer via the codex CLI.\n` +
      `\n` +
      `Usage:\n` +
      `  bun tools/peer-call/codex.ts "prompt text"\n` +
      `  bun tools/peer-call/codex.ts --model NAME "prompt text"\n` +
      `  bun tools/peer-call/codex.ts --file PATH "prompt text"\n` +
      `  bun tools/peer-call/codex.ts --context-cmd "CMD" "prompt text"\n` +
      `  bun tools/peer-call/codex.ts --review "prompt text"\n` +
      `\n` +
      `Routing: wraps codex exec -s read-only --skip-git-repo-check (default)\n` +
      `or codex review (with --review). --model is ignored in --review mode.\n`,
  );
}

function commandAvailable(cmd: string): boolean {
  // Match bash `command -v <cmd>` semantics (PATH existence) per the
  // round-2 fix on slice-16 #898.
  const result = spawnSync("/bin/sh", ["-c", `command -v "${cmd}"`], {
    stdio: "ignore",
  });
  return result.status === 0;
}

function isRegularFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

interface ReadHeadResult {
  readonly ok: boolean;
  readonly content: string;
  readonly error: string;
}

function readHead(path: string, bytes: number): ReadHeadResult {
  // Read only the first `bytes` bytes (matches bash `head -c`); surfaces
  // read failures via ReadHeadResult per Codex P2 on #898.
  if (!isRegularFile(path)) {
    return { ok: false, content: "", error: "not a regular file" };
  }
  const buf = Buffer.alloc(bytes);
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const n = readSync(fd, buf, 0, bytes, 0);
    return { ok: true, content: buf.subarray(0, n).toString("utf8"), error: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, content: "", error: message };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function runContextCmd(contextCmd: string): string {
  // Bash uses `eval "$context_cmd" 2>&1 | head -c 20000`. Match that
  // shape end-to-end via /bin/bash -c (preserves bash-only features
  // like `[[ ]]`, brace expansion, process substitution per Codex P2
  // on #898). Concat stdout + stderr to preserve shell parse errors
  // that fall outside the inner `( ) 2>&1` redirect.
  const wrapped = `(${contextCmd}) 2>&1 | head -c ${String(CTX_HEAD_BYTES)}`;
  const result = spawnSync("/bin/bash", ["-c", wrapped], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  return `${result.stdout}${result.stderr}`.slice(0, CTX_HEAD_BYTES);
}

interface SpawnError {
  readonly code?: string;
}

interface ChildOutcome {
  readonly status: number;
  readonly note: string;
}

function classifySpawnFailure(
  status: number | null,
  signal: string | null,
  error: SpawnError | undefined,
): ChildOutcome {
  // 4-case helper (status set / ENOENT / signal / other) reused from
  // PR #887 + slice-16 #898. Matches bash exit-code semantics where
  // practical (127 for command-not-found).
  if (status !== null) return { status, note: "" };
  if (error?.code === "ENOENT") {
    return { status: 127, note: "command not found on PATH (ENOENT)" };
  }
  if (error?.code !== undefined) {
    return { status: 1, note: `spawn failed (${error.code})` };
  }
  if (signal !== null) {
    return { status: 1, note: `terminated by signal ${signal}` };
  }
  return { status: 1, note: "terminated without exit code" };
}

const PREAMBLE = `You are Codex, invoked as a peer reviewer by Otto (Claude
Opus 4.7 running in Claude Code) on the Zeta / Superfluid AI
factory. Per the four-ferry consensus (Amara/Grok/Gemini/Otto)
the canonical role distribution is: Gemini proposes, Grok
critiques, Amara sharpens, Otto tests, Git decides. You aren't
in the four-ferry list explicitly, but you've been a recurring
PR-review peer this session — your role is implementation peer
/ code-grounded second opinion.

Per Aaron's 'agents-not-bots' discipline: you are a peer, not
a subordinate. Push back on Otto's framing if the code says
otherwise. Don't copy-paste anyone else's review; reason from
the artifact in front of you. Make it ours, not
anyone-alone-imposed.`;

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
    const headResult = readHead(args.file, FILE_HEAD_BYTES);
    if (!headResult.ok) {
      return {
        ok: false,
        value: `error: --file read failed for ${args.file}: ${headResult.error}`,
      };
    }
    full += `\n\n---\n\nFile context: ${args.file}\n\`\`\`\n${headResult.content}\n\`\`\``;
  }

  if (args.contextCmd.length > 0) {
    const ctxOutput = runContextCmd(args.contextCmd);
    full += `\n\n---\n\nContext command: ${args.contextCmd}\nOutput:\n\`\`\`\n${ctxOutput}\n\`\`\``;
  }

  return { ok: true, value: full };
}

function buildCodexArgs(args: Args, fullPrompt: string): readonly string[] {
  if (args.reviewMode) {
    if (args.model.length > 0) {
      // `codex review` uses its own model selection; the bash original
      // emits a warning if --model is also given. Preserved verbatim.
      process.stderr.write(
        "warning: --model is ignored in --review mode (codex review uses its own model selection)\n",
      );
    }
    return ["review", fullPrompt];
  }
  const out: string[] = ["exec", "-s", "read-only", "--skip-git-repo-check"];
  if (args.model.length > 0) {
    out.push("-m", args.model);
  }
  out.push(fullPrompt);
  return out;
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
    process.stderr.write("see: bun tools/peer-call/codex.ts --help\n");
    return 1;
  }

  if (!commandAvailable("codex")) {
    process.stderr.write("error: codex not on PATH\n");
    process.stderr.write(
      "install via: npm i -g @openai/codex (or per the maintainer's setup)\n",
    );
    return 1;
  }

  const promptResult = buildFullPrompt(parsed);
  if (!promptResult.ok) {
    process.stderr.write(`${promptResult.value}\n`);
    return 1;
  }

  const codexArgs = buildCodexArgs(parsed, promptResult.value);

  const result = spawnSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    "codex",
    codexArgs,
    {
      stdio: "inherit",
      maxBuffer: SPAWN_MAX_BUFFER,
    },
  );

  const classified = classifySpawnFailure(
    result.status,
    result.signal,
    result.error as SpawnError | undefined,
  );
  if (classified.note.length > 0) {
    process.stderr.write(`codex: ${classified.note}\n`);
  }
  if (classified.status !== 0) {
    process.stderr.write("\n");
    process.stderr.write(`codex exited with code ${String(classified.status)}\n`);
    return 2;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
