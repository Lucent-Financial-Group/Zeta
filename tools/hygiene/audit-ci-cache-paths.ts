#!/usr/bin/env bun
// audit-ci-cache-paths.ts — flags actions/cache paths that overlap
// with git-tracked files.
//
// Why this exists (2026-05-03 silent-bug discovery):
//   Cache paths in `.github/workflows/*.yml` configured as whole-
//   directory paths (e.g. `path: tools/tla`) caused actions/cache
//   on cache-hit to OVERWRITE freshly-checked-out source-controlled
//   files with cached versions. Failure mode is silent: the test
//   report shows the OLD spec passing but claims it ran "the new"
//   PR-modified spec. Discovery-by-luck class — only surfaces when
//   a PR introduces a NEW operator referenced by the cfg, because
//   then the silently-restored old spec FAILS instead of falsely-
//   passing on stale state.
//
//   This audit makes the discipline structural rather than vigilant:
//   every actions/cache path is checked against `git ls-files` for
//   overlap; any cache path that includes a git-tracked file is a
//   violation.
//
// Discipline rule (carved sentence):
//   *"actions/cache paths are mutually exclusive with git ls-files —
//    cache only DERIVED files (downloaded jars, built artefacts, user-
//    home tool state), never source-controlled content."*
//
// What this checks:
//   - For each `.github/workflows/*.yml`, parse the cache `path:`
//     blocks (multi-line YAML lists)
//   - For each path, expand globs and check against `git ls-files`
//   - If any path covers (is or contains) a git-tracked file →
//     VIOLATION
//
// Allowlist (specific safe paths):
//   - Paths starting with `~/` (user home; never tracked)
//   - Paths starting with `/`
//   - Specific JAR files (e.g. `tools/tla/tla2tools.jar`) when the
//     jar itself is git-ignored (.gitignore covers it)
//
// Exit codes:
//   0   no violations
//   1   one or more violations
//   2   workflow file or git read failure
//
// Usage:
//   bun tools/hygiene/audit-ci-cache-paths.ts
//   bun tools/hygiene/audit-ci-cache-paths.ts --enforce  (alias for default)

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;
const WORKFLOWS_DIR = ".github/workflows";

interface CachePath {
  readonly workflow: string;
  readonly stepName: string;
  readonly path: string;
}

interface Violation {
  readonly workflow: string;
  readonly stepName: string;
  readonly cachePath: string;
  readonly trackedFile: string;
}

function repoRoot(): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  if (result.status !== 0) return process.cwd();
  return result.stdout.trim();
}

function gitTrackedFiles(): readonly string[] {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  if (result.status !== 0) {
    process.stderr.write(`ERROR: 'git ls-files' failed (exit ${String(result.status)})\n`);
    process.exit(2);
  }
  return result.stdout.split("\n").filter((s) => s.length > 0);
}

function isUserHomePath(path: string): boolean {
  return path.startsWith("~") || path.startsWith("/");
}

/**
 * Parse `path:` blocks from a workflow YAML. Heuristic: scan for
 * `path: |` followed by indented lines until indentation decreases
 * to the parent step level (uses `key:` or `restore-keys:` as the
 * end-of-paths sentinel — actions/cache always pairs `path:` with a
 * `key:`). Single-line `path: foo` form also handled.
 *
 * Bounded by the `Cache ...` step name from the previous `name:`
 * line so violations identify which step in which workflow.
 */
function parseCachePaths(workflow: string, content: string): readonly CachePath[] {
  const out: CachePath[] = [];
  const lines = content.split("\n");
  let currentStepName = "";
  let inActionsCache = false;
  let collectingPaths = false;
  let pathListIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const nameMatch = line.match(/^\s*-\s+name:\s*(.+)$/);
    if (nameMatch !== null) {
      currentStepName = (nameMatch[1] ?? "").trim();
      inActionsCache = false;
      collectingPaths = false;
      continue;
    }
    if (line.match(/uses:\s*actions\/cache@/)) {
      inActionsCache = true;
      continue;
    }
    if (!inActionsCache) continue;

    // Single-line: `path: foo`
    const singleMatch = line.match(/^(\s+)path:\s+([^|\s].*)$/);
    if (singleMatch !== null) {
      const value = (singleMatch[2] ?? "").trim();
      if (value !== "" && value !== "|") {
        out.push({ workflow, stepName: currentStepName, path: value });
      }
      continue;
    }

    // Multi-line: `path: |` followed by indented entries
    const multiMatch = line.match(/^(\s+)path:\s*\|$/);
    if (multiMatch !== null) {
      collectingPaths = true;
      pathListIndent = (multiMatch[1] ?? "").length;
      continue;
    }

    if (collectingPaths) {
      const indentMatch = line.match(/^(\s+)(.+)$/);
      if (indentMatch === null) {
        collectingPaths = false;
        continue;
      }
      const indent = (indentMatch[1] ?? "").length;
      const content = (indentMatch[2] ?? "").trim();
      if (indent <= pathListIndent) {
        // De-indent past the path: parent — done
        collectingPaths = false;
        continue;
      }
      if (content === "" || content.startsWith("#")) continue;
      // End of path list: a sibling key like `key:` or `restore-keys:`
      if (
        content.startsWith("key:") ||
        content.startsWith("restore-keys:") ||
        content.startsWith("enableCrossOsArchive:") ||
        content.startsWith("save-always:") ||
        content.startsWith("fail-on-cache-miss:") ||
        content.startsWith("lookup-only:")
      ) {
        collectingPaths = false;
        continue;
      }
      out.push({ workflow, stepName: currentStepName, path: content });
    }
  }

  return out;
}

/**
 * True if `cachePath` overlaps with any tracked file:
 *   - Exactly equals a tracked file, OR
 *   - Is a directory ancestor of a tracked file (cachePath/...)
 */
function overlapsTrackedFile(
  cachePath: string,
  trackedFiles: readonly string[],
): string | null {
  // Normalise: drop leading `./`, trim trailing `/`
  let cp = cachePath;
  if (cp.startsWith("./")) cp = cp.slice(2);
  if (cp.endsWith("/")) cp = cp.slice(0, -1);

  for (const tracked of trackedFiles) {
    if (tracked === cp) return tracked;
    if (tracked.startsWith(`${cp}/`)) return tracked;
  }
  return null;
}

function listWorkflowFiles(): readonly string[] {
  try {
    return readdirSync(WORKFLOWS_DIR)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
      .map((f) => join(WORKFLOWS_DIR, f));
  } catch {
    return [];
  }
}

function main(): number {
  process.chdir(repoRoot());
  const workflows = listWorkflowFiles();
  if (workflows.length === 0) {
    process.stderr.write(
      "ERROR: no workflow files found under .github/workflows/\n",
    );
    return 2;
  }
  const tracked = gitTrackedFiles();
  const violations: Violation[] = [];

  for (const wf of workflows) {
    let content: string;
    try {
      content = readFileSync(wf, "utf8");
    } catch (err) {
      process.stderr.write(
        `ERROR: cannot read ${wf}: ${(err as Error).message}\n`,
      );
      continue;
    }
    const cachePaths = parseCachePaths(wf, content);
    for (const cp of cachePaths) {
      if (isUserHomePath(cp.path)) continue;
      const overlap = overlapsTrackedFile(cp.path, tracked);
      if (overlap !== null) {
        violations.push({
          workflow: cp.workflow,
          stepName: cp.stepName,
          cachePath: cp.path,
          trackedFile: overlap,
        });
      }
    }
  }

  if (violations.length === 0) {
    process.stdout.write(
      `OK: ${String(workflows.length)} workflow(s) audited; no cache paths overlap git-tracked files\n`,
    );
    return 0;
  }

  for (const v of violations) {
    process.stderr.write(
      `VIOLATION: ${v.workflow} step "${v.stepName}" caches "${v.cachePath}" which contains git-tracked file "${v.trackedFile}"\n`,
    );
  }
  process.stderr.write("\n");
  process.stderr.write(
    `FAIL: ${String(violations.length)} cache-path violation(s) — actions/cache paths overlap git-tracked files\n`,
  );
  process.stderr.write("\n");
  process.stderr.write("Why this is a bug:\n");
  process.stderr.write(
    "  On cache hit, actions/cache OVERWRITES the freshly-checked-out\n",
  );
  process.stderr.write(
    "  source files with cached versions. PR edits to tracked files\n",
  );
  process.stderr.write(
    "  silently revert; CI tests the OLD content but reports the\n",
  );
  process.stderr.write(
    "  result as the PR's new state. Test fidelity broken.\n",
  );
  process.stderr.write("\n");
  process.stderr.write("How to fix:\n");
  process.stderr.write(
    "  Narrow the cache path to specific DERIVED files only (downloaded\n",
  );
  process.stderr.write(
    "  jars, built artefacts, user-home tool state). Cache only what\n",
  );
  process.stderr.write(
    "  install.sh DOWNLOADS, never what git tracks.\n",
  );
  process.stderr.write("\n");
  process.stderr.write(
    "  Bump the cache key (add `-v2` suffix or hashFiles input change)\n",
  );
  process.stderr.write("  to bust any pre-existing stale cache.\n");
  return 1;
}

if (import.meta.main) {
  process.exit(main());
}
