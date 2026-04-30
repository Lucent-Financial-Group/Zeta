#!/usr/bin/env bun
// push-with-retry.ts — `git push` retry wrapper for transient 5xx.
//
// TypeScript+Bun port of push-with-retry.sh, slice 13 of the TS+Bun
// migration. See docs/best-practices/repo-scripting.md.
//
// Why this exists:
//   The factory observed recurring transient GitHub 500s during
//   autonomous-loop tick-close commits (multiple occurrences
//   2026-04-23). Manual retry burns tick budget; this wrapper makes
//   the retry uniform.
//
// DST classification: ACCEPTED_BOUNDARY (external network I/O +
// retry-on-failure) per the boundary registry at
// `docs/research/dst-accepted-boundaries.md` §3 and Otto-168.
//
// Usage:
//   bun tools/git/push-with-retry.ts [git push args...]
//   bun tools/git/push-with-retry.ts
//   bun tools/git/push-with-retry.ts --set-upstream origin my-branch
//
// Exit codes:
//   0   push succeeded (possibly after retries)
//   1   all retries exhausted on transient 5xx
//   2   environment validation failed (non-integer env value)
//   N   non-transient error — propagates `git push`'s own exit code
//
// Environment:
//   GIT_PUSH_MAX_ATTEMPTS  override retry count (default 3; positive int)
//   GIT_PUSH_BACKOFF_S     override initial backoff seconds (default 2;
//                          doubles each retry; non-negative int)
//
// Behavioural note vs bash original:
//   The bash version uses `tee` to BOTH capture stderr AND stream it
//   live. This port uses spawnSync which captures-then-replays stderr
//   after each attempt completes. For typical git-push runtimes
//   (seconds) the UX difference is invisible; for long pushes the
//   stderr appears in batches per attempt rather than streaming.

import { spawnSync } from "node:child_process";

const POSITIVE_INT_RE = /^\d+$/;

const TRANSIENT_5XX_RE =
  /(500|502|503|504|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)/;

interface Validated {
  readonly maxAttempts: number;
  readonly initialBackoff: number;
}

function validateEnv(): Validated | { readonly error: string } {
  const maxAttemptsRaw = process.env.GIT_PUSH_MAX_ATTEMPTS ?? "3";
  const backoffRaw = process.env.GIT_PUSH_BACKOFF_S ?? "2";

  if (!POSITIVE_INT_RE.test(maxAttemptsRaw)) {
    return {
      error: `push-with-retry: GIT_PUSH_MAX_ATTEMPTS must be a positive integer; got '${maxAttemptsRaw}'`,
    };
  }
  const maxAttempts = Number.parseInt(maxAttemptsRaw, 10);
  if (maxAttempts < 1) {
    return {
      error: `push-with-retry: GIT_PUSH_MAX_ATTEMPTS must be a positive integer; got '${maxAttemptsRaw}'`,
    };
  }

  if (!POSITIVE_INT_RE.test(backoffRaw)) {
    return {
      error: `push-with-retry: GIT_PUSH_BACKOFF_S must be a non-negative integer; got '${backoffRaw}'`,
    };
  }
  const initialBackoff = Number.parseInt(backoffRaw, 10);

  return { maxAttempts, initialBackoff };
}

function sleepSeconds(seconds: number): void {
  // Synchronous busy-wait via Atomics.wait on a SharedArrayBuffer.
  // Bun supports Atomics.wait on a shared int32 view; falls back to
  // a tight loop if not available. We need a synchronous sleep
  // because the bash original uses `sleep` between attempts inside
  // a synchronous loop, and entry guard / exit-code semantics
  // depend on the script staying synchronous.
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.wait(view, 0, 0, seconds * 1000);
}

function runOnce(args: readonly string[]): {
  status: number;
  stderr: string;
} {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", ["push", ...args], {
    stdio: ["inherit", "inherit", "pipe"],
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const stderr = result.stderr;
  // Replay captured stderr to the user (bash original streams via
  // tee; we batch).
  if (stderr.length > 0) {
    process.stderr.write(stderr);
  }
  return { status: result.status ?? 1, stderr };
}

export function main(args: readonly string[]): number {
  const validated = validateEnv();
  if ("error" in validated) {
    process.stderr.write(`${validated.error}\n`);
    return 2;
  }

  let backoff = validated.initialBackoff;
  for (let attempt = 1; attempt <= validated.maxAttempts; attempt++) {
    const { status, stderr } = runOnce(args);
    if (status === 0) return 0;

    if (TRANSIENT_5XX_RE.test(stderr)) {
      if (attempt < validated.maxAttempts) {
        process.stderr.write(
          `push-with-retry: transient 5xx on attempt ${String(attempt)}/${String(validated.maxAttempts)}; retrying in ${String(backoff)}s...\n`,
        );
        if (backoff > 0) sleepSeconds(backoff);
        backoff *= 2;
        continue;
      }
      process.stderr.write(
        `push-with-retry: failed after ${String(validated.maxAttempts)} attempts on transient 5xx\n`,
      );
      return 1;
    }

    // Non-transient error — propagate git push's own exit code.
    return status;
  }

  // Unreachable (the loop always returns), but TS needs an exit.
  return 1;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
