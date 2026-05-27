#!/usr/bin/env bun
/**
 * tools/ci/docker-nixos-install-sh-test.ts
 *
 * B-0849 Phase 1 — TS wrapper for the Docker NixOS install.sh test
 * harness. Per .claude/rules/rule-0-no-sh-files.md: TS-over-bash for
 * DST + cross-platform. Wraps `docker build` of
 * tools/ci/dockerfiles/nixos-install-sh-test/Dockerfile with:
 *
 *   - exit-code mapping (build success = 0; build failure = 1)
 *   - log capture (saved to workspace-relative path for CI artifact)
 *   - timeout enforcement (default 600s — install.sh + mise + bun
 *     + claude-code download can take a while on cold cache)
 *   - build-context discipline (uses repo root as context;
 *     dockerfile is at the fixed path; doesn't pollute root with
 *     build artifacts)
 *
 * Composes with B-0831 cascade #6 QEMU full-install test
 * (qemu-full-install-test.ts): Docker = fast iteration (~30-60 sec);
 * QEMU = end-to-end virtualized boot (~15 min). Both run on CI for
 * install-substrate PRs.
 *
 * Operator framing 2026-05-27 (Aaron): "we should add docker based
 * nixos install.sh testing so we can iterate quick that's an easy
 * dockerfile" → B-0849 backlog row → this implementation.
 *
 * Usage:
 *   bun tools/ci/docker-nixos-install-sh-test.ts [--keep-image]
 *
 * Flags:
 *   --keep-image    Don't `docker rmi` after the test (default: cleanup)
 *
 * Env:
 *   DOCKER_BUILD_TIMEOUT_SEC   Override timeout (default 600)
 *   DOCKER_LOG_OUT_PATH        Override log path (default
 *                              workspace-relative .docker-test-log)
 *
 * Exit codes:
 *   0 — Docker build succeeded (install.sh + mise + bun + claude-code
 *       all validated on NixOS userspace)
 *   1 — Docker build failed (one of the validation steps in the
 *       Dockerfile failed; see log)
 *   2 — Usage error / missing prerequisites (docker not installed,
 *       wrong working directory, etc.)
 *   124 — Timeout (build exceeded DOCKER_BUILD_TIMEOUT_SEC)
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DOCKERFILE_PATH = "tools/ci/dockerfiles/nixos-install-sh-test/Dockerfile";
const IMAGE_TAG = "zeta-nixos-install-sh-test:local";
const DEFAULT_TIMEOUT_SEC = 600;
const DEFAULT_LOG_PATH = ".docker-test-log";

interface BuildResult {
  exitCode: 0 | 1 | 2 | 124;
  reason: string;
  logTail?: string;
}

function usage(): never {
  console.error(
    "usage: bun tools/ci/docker-nixos-install-sh-test.ts [--keep-image]"
  );
  console.error("");
  console.error("env:");
  console.error("  DOCKER_BUILD_TIMEOUT_SEC  override timeout (default 600)");
  console.error("  DOCKER_LOG_OUT_PATH       override log path");
  process.exit(2);
}

function checkPrereqs(): void {
  // Verify docker is installed
  const docker = spawnSync("docker", ["--version"], { encoding: "utf8" });
  if (docker.status !== 0) {
    console.error("error: docker not installed or not on PATH");
    console.error("  install via the standard mechanism for your OS");
    process.exit(2);
  }

  // Verify we're at repo root (Dockerfile path is repo-relative)
  if (!existsSync(DOCKERFILE_PATH)) {
    console.error(`error: ${DOCKERFILE_PATH} not found`);
    console.error(
      "  run from repo root: bun tools/ci/docker-nixos-install-sh-test.ts"
    );
    process.exit(2);
  }

  // Verify .mise.toml is at repo root (Dockerfile COPYs it)
  if (!existsSync(".mise.toml")) {
    console.error("error: .mise.toml not found at repo root");
    process.exit(2);
  }
}

function runBuild(timeoutSec: number, logPath: string): BuildResult {
  const startMs = Date.now();
  const buildArgs = [
    "build",
    "--file",
    DOCKERFILE_PATH,
    "--tag",
    IMAGE_TAG,
    // --progress=plain prints full output (vs --progress=auto which
    // collapses for terminals); we want full output captured to log
    "--progress=plain",
    // Build context = current dir (repo root)
    ".",
  ];

  console.log(`[B-0849 Phase 1] docker build ${buildArgs.join(" ")}`);
  console.log(`[B-0849 Phase 1] timeout: ${timeoutSec}s; log: ${logPath}`);

  // spawnSync with timeout converted to milliseconds
  const result = spawnSync("docker", buildArgs, {
    encoding: "utf8",
    timeout: timeoutSec * 1000,
    // Combine stdout + stderr for the log
    stdio: ["ignore", "pipe", "pipe"],
  });

  const elapsedSec = Math.floor((Date.now() - startMs) / 1000);

  // Capture full output to log file
  const fullLog = (result.stdout ?? "") + (result.stderr ?? "");
  writeFileSync(logPath, fullLog, "utf8");

  // Extract tail for the return-value reason
  const logTail = fullLog.split("\n").slice(-20).join("\n");

  if (result.signal === "SIGTERM" || result.error?.code === "ETIMEDOUT") {
    return {
      exitCode: 124,
      reason: `docker build timed out after ${timeoutSec}s (actual: ${elapsedSec}s)`,
      logTail,
    };
  }

  if (result.status === 0) {
    console.log(
      `[B-0849 Phase 1] SUCCESS — docker build completed in ${elapsedSec}s`
    );
    return {
      exitCode: 0,
      reason: `docker build succeeded in ${elapsedSec}s`,
      logTail,
    };
  }

  return {
    exitCode: 1,
    reason: `docker build failed (exit ${result.status}) after ${elapsedSec}s`,
    logTail,
  };
}

function cleanup(keepImage: boolean): void {
  if (keepImage) {
    console.log(
      `[B-0849 Phase 1] --keep-image set; image ${IMAGE_TAG} retained for inspection`
    );
    return;
  }
  const rm = spawnSync("docker", ["rmi", "-f", IMAGE_TAG], {
    encoding: "utf8",
  });
  if (rm.status === 0) {
    console.log(`[B-0849 Phase 1] cleaned up image ${IMAGE_TAG}`);
  } else {
    console.error(
      `[B-0849 Phase 1] warning: docker rmi ${IMAGE_TAG} failed (non-fatal)`
    );
  }
}

function main(): void {
  // Parse args
  const args = process.argv.slice(2);
  let keepImage = false;
  for (const arg of args) {
    if (arg === "--keep-image") {
      keepImage = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
    } else {
      console.error(`error: unknown arg: ${arg}`);
      usage();
    }
  }

  // Resolve env overrides
  const timeoutSec = parseInt(
    process.env.DOCKER_BUILD_TIMEOUT_SEC ?? String(DEFAULT_TIMEOUT_SEC),
    10
  );
  if (!Number.isFinite(timeoutSec) || timeoutSec <= 0) {
    console.error(
      `error: DOCKER_BUILD_TIMEOUT_SEC must be a positive integer (got: ${process.env.DOCKER_BUILD_TIMEOUT_SEC})`
    );
    process.exit(2);
  }
  const logPath = resolve(process.env.DOCKER_LOG_OUT_PATH ?? DEFAULT_LOG_PATH);

  // Ensure log directory exists
  const logDir = logPath.substring(0, logPath.lastIndexOf("/"));
  if (logDir && !existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  checkPrereqs();

  const result = runBuild(timeoutSec, logPath);

  console.log("");
  console.log(`[B-0849 Phase 1] result: ${result.reason}`);
  console.log(`[B-0849 Phase 1] log: ${logPath}`);

  if (result.exitCode !== 0) {
    console.log("[B-0849 Phase 1] tail of build log:");
    console.log("--- BEGIN TAIL ---");
    console.log(result.logTail);
    console.log("--- END TAIL ---");
  }

  cleanup(keepImage);

  process.exit(result.exitCode);
}

main();
